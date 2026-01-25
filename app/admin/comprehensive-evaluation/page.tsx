"use client"

import React, { useState } from 'react'
import { Search, FileText, Award, Edit, Save, X, Check, Trophy, BookOpen, CheckCircle, XCircle, Clock, RotateCcw, Trash2, Upload, Download, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import * as XLSX from 'xlsx'
import AdminLayout from '@/components/admin/AdminLayout'
import CompetitionForm from '@/components/competitions/CompetitionForm'

interface Paper {
  id: string
  paper_title: string
  journal_name: string
  journal_category: string
  bupt_student_id: string
  full_name: string
  phone_number: string | null
  author_type: string
  publish_date: string | null
  note?: string
  score: string | number
  approval_status: 'pending' | 'approved' | 'rejected'
  defense_status?: 'pending' | 'passed' | 'failed'
  created_at: string
  updated_at: string
}

interface Patent {
  id: string
  patent_name: string
  patent_number?: string
  patent_date: string | null
  bupt_student_id: string
  phone_number: string | null
  full_name: string
  category_of_patent_owner: string
  note?: string
  score: string | number
  approval_status: 'pending' | 'approved' | 'rejected'
  defense_status?: 'pending' | 'passed' | 'failed'
  created_at: string
  updated_at: string
}

interface Competition {
  id: string
  competition_region: string
  competition_level: string
  competition_name: string
  competition_type: string
  award_type?: 'prize' | 'ranking'
  award_value?: string
  bupt_student_id: string
  full_name: string
  phone_number: string | null
  note: string
  score: number
  approval_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

interface StudentData {
  studentId: string
  phoneNumber?: string | null
  papers: Paper[]
  patents: Patent[]
  competitions: Competition[]
  extraBonus?: {
    id: string
    bupt_student_id: string
    bonus_score: number
    note?: string
    created_at: string
    updated_at: string
  } | null
  total: {
    papers: number
    patents: number
    competitions: number
  }
  overall_approval_status: 'pending' | 'approved' | 'rejected'
}

interface ComprehensiveScore {
  id: string
  bupt_student_id: string
  class: string
  full_name: string
  paper_score: number
  patent_score: number
  competition_score: number
  paper_patent_total: number
  total_score: number
  created_at: string
  updated_at: string
}

// 解析额外加分文件
const parseExtraBonusFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) { reject(new Error('文件读取结果为空')); return }
        
        let workbook: XLSX.WorkBook
        if (file.name.endsWith('.csv')) {
          workbook = XLSX.read(data, { type: 'binary' })
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          workbook = XLSX.read(data, { type: 'array' })
        } else {
          reject(new Error('不支持的文件格式')); return
        }
        
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!worksheet) { reject(new Error('工作表为空')); return }
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        if (jsonData.length < 2) { reject(new Error('文件内容为空')); return }
        
        const headers = (jsonData[0] as any[]).map(h => h ? h.toString().trim() : '')
        const rows = jsonData.slice(1)
        
        let studentIdIndex = -1, scoreIndex = -1
        headers.forEach((header, index) => {
          if (header === '学号' || header === 'bupt_student_id') studentIdIndex = index
          if (header === '分数' || header === '额外加分' || header === 'bonus_score') scoreIndex = index
        })
        
        if (studentIdIndex === -1) { reject(new Error('未找到"学号"列')); return }
        if (scoreIndex === -1) { reject(new Error('未找到"分数"列')); return }
        
        const parsedData = rows.map((row: unknown) => {
          const rowArray = row as any[]
          return {
            bupt_student_id: rowArray[studentIdIndex]?.toString().trim() || '',
            bonus_score: parseFloat(rowArray[scoreIndex]?.toString() || '0') || 0
          }
        }).filter(item => item.bupt_student_id)
        
        if (parsedData.length === 0) { reject(new Error('没有有效数据')); return }
        resolve(parsedData)
      } catch (error) {
        reject(new Error('文件解析失败: ' + (error instanceof Error ? error.message : '未知错误')))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    if (file.name.endsWith('.csv')) reader.readAsBinaryString(file)
    else reader.readAsArrayBuffer(file)
  })
}

// 解析智育成绩文件
const parseAcademicFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) { reject(new Error('文件读取结果为空')); return }
        
        let workbook: XLSX.WorkBook
        if (file.name.endsWith('.csv')) {
          workbook = XLSX.read(data, { type: 'binary' })
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          workbook = XLSX.read(data, { type: 'array' })
        } else {
          reject(new Error('不支持的文件格式')); return
        }
        
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!worksheet) { reject(new Error('工作表为空')); return }
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        if (jsonData.length < 2) { reject(new Error('文件内容为空')); return }
        
        const firstRow = jsonData[0] as any[]
        const secondRow = jsonData[1] as any[]
        
        const processMergedHeaders = (row1: any[], row2: any[]): string[] => {
          const result: string[] = []
          for (let i = 0; i < Math.max(row1.length, row2?.length || 0); i++) {
            const cell1 = row1[i] ? row1[i].toString().trim() : ''
            const cell2 = row2 && row2[i] ? row2[i].toString().trim() : ''
            if (cell1 && cell2 && cell1 !== cell2) result.push(cell2)
            else if (cell1 && !cell2) result.push(cell1)
            else if (!cell1 && cell2) result.push(cell2)
            else if (cell1 && cell2 && cell1 === cell2) result.push(cell1)
            else if (!cell1 && !cell2) continue
            else result.push(cell1 || cell2 || `列${i}`)
          }
          return result
        }
        
        const headers = processMergedHeaders(firstRow, secondRow)
        const rows = jsonData.slice(2)
        
        const fieldMapping: { [key: string]: string } = {
          '学号': 'bupt_student_id', '姓名': 'full_name', '上课院系': 'school',
          '学生校区': 'campus', '专业名称': 'programme', '班级名称': 'class',
          '培养层次': 'degree_category', '所修总门数': 'total_diet',
          '所修总学分': 'total_credits', '所得学分': 'taken_credits',
          '未得学分': 'untaken_credits', '加权均分': 'weighted_average',
          '平均学分绩点': 'gpa', '专业排名': 'programme_rank',
          '专业排名总人数': 'programme_total'
        }
        
        const parsedData = rows.map((row: unknown) => {
          const rowArray = row as any[]
          const obj: any = {}
          headers.forEach((header, index) => {
            if (header && header.trim()) {
              const dbFieldName = fieldMapping[header.trim()] || header.trim()
              obj[dbFieldName] = rowArray[index]
            }
          })
          return obj
        }).filter(row => (row.bupt_student_id || row.学号)?.toString().trim())
        
        if (parsedData.length === 0) { reject(new Error('没有有效数据')); return }
        resolve(parsedData)
      } catch (error) {
        reject(new Error('文件解析失败: ' + (error instanceof Error ? error.message : '未知错误')))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    if (file.name.endsWith('.csv')) reader.readAsBinaryString(file)
    else reader.readAsArrayBuffer(file)
  })
}

// 解析推免加分总表文件
const parseMoralEducationFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) { reject(new Error('文件读取结果为空')); return }
        
        let workbook: XLSX.WorkBook
        if (file.name.endsWith('.csv')) {
          workbook = XLSX.read(data, { type: 'binary' })
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          workbook = XLSX.read(data, { type: 'array' })
        } else {
          reject(new Error('不支持的文件格式')); return
        }
        
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!worksheet) { reject(new Error('工作表为空')); return }
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        if (jsonData.length < 2) { reject(new Error('文件内容为空')); return }
        
        const firstRow = jsonData[0] as any[]
        const secondRow = jsonData[1] as any[]
        const firstRowEmptyCount = firstRow.filter(cell => !cell || cell.toString().trim() === '').length
        
        let headers: string[], dataStartRow: number
        if (firstRowEmptyCount > firstRow.length * 0.5 && secondRow?.length > 0) {
          headers = secondRow.map(cell => cell ? cell.toString() : '')
          dataStartRow = 2
        } else {
          headers = firstRow.map(cell => cell ? cell.toString() : '')
          dataStartRow = 1
        }
        
        const rows = jsonData.slice(dataStartRow)
        const moralFieldMapping: { [key: string]: string } = {
          '学号': 'bupt_student_id', '姓名': 'full_name', '班级': 'class',
          '手机号': 'phone_number', '论文分数': 'paper_score', '专利分数': 'patent_score',
          '竞赛分数': 'competition_score', '论文+专利小计': 'paper_patent_total', '总加分': 'total_score'
        }
        
        const parsedData = rows.map((row: unknown) => {
          const rowArray = row as any[]
          const obj: any = {}
          headers.forEach((header, index) => {
            if (header?.trim()) {
              const dbFieldName = moralFieldMapping[header.trim()] || header.trim()
              obj[dbFieldName] = rowArray[index]
            }
          })
          return obj
        }).filter(row => row.bupt_student_id?.toString().trim())
        
        if (parsedData.length === 0) { reject(new Error('没有有效数据')); return }
        resolve(parsedData)
      } catch (error) {
        reject(new Error('文件解析失败: ' + (error instanceof Error ? error.message : '未知错误')))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    if (file.name.endsWith('.csv')) reader.readAsBinaryString(file)
    else reader.readAsArrayBuffer(file)
  })
}

export default function GradeRecommendationPage() {
  // 当前激活的Tab
  const [activeTab, setActiveTab] = useState('review')
  
  // 基础状态
  const [studentId, setStudentId] = useState('')
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingScores, setEditingScores] = useState<{ [key: string]: string }>({})
  const [approvalLoading, setApprovalLoading] = useState<{ [key: string]: boolean }>({})
  const [defenseLoading, setDefenseLoading] = useState<{ [key: string]: boolean }>({})

  // 审核统计状态
  const [approvalStats, setApprovalStats] = useState({
    approved: 0,
    pending: 0,
    rejected: 0,
    total: 0
  })
  const [statsLoading, setStatsLoading] = useState(false)

  // 编辑相关状态
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null)
  const [editingPatent, setEditingPatent] = useState<Patent | null>(null)
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null)
  const [showPaperEditForm, setShowPaperEditForm] = useState(false)
  const [showPatentEditForm, setShowPatentEditForm] = useState(false)
  const [showCompetitionEditForm, setShowCompetitionEditForm] = useState(false)
  const [editingExtraBonus, setEditingExtraBonus] = useState(false)
  const [extraBonusScore, setExtraBonusScore] = useState<string>('')

  // 数据表相关状态
  const [showScoreTable, setShowScoreTable] = useState(false)
  const [comprehensiveScores, setComprehensiveScores] = useState<ComprehensiveScore[]>([])
  const [academicScores, setAcademicScores] = useState<any[]>([])
  const [showAcademicTable, setShowAcademicTable] = useState(false)
  const [comprehensiveRankings, setComprehensiveRankings] = useState<any[]>([])
  const [showRankingTable, setShowRankingTable] = useState(false)
  const [extraBonusData, setExtraBonusData] = useState<any[]>([])

  // 翻译奖项值的辅助函数
  const translateAwardValue = (awardType: string, awardValue: string): string => {
    if (awardType === 'prize') {
      const prizeMap: { [key: string]: string } = {
        'premier_prize': '特等奖',
        'first_prize': '一等奖',
        'second_prize': '二等奖',
        'third_prize': '三等奖'
      }
      return prizeMap[awardValue] || awardValue
    } else if (awardType === 'ranking') {
      const rankingMap: { [key: string]: string } = {
        'ranked_first': '第一名',
        'ranked_second': '第二名',
        'ranked_third': '第三名',
        'ranked_fourth': '第四名',
        'ranked_fifth': '第五名',
        'ranked_sixth': '第六名'
      }
      return rankingMap[awardValue] || awardValue
    }
    return awardValue
  }

  const [showExtraBonusTable, setShowExtraBonusTable] = useState(false)

  // 导入相关状态
  const [academicImportLoading, setAcademicImportLoading] = useState(false)
  const [importMode, setImportMode] = useState<'append' | 'replace'>('replace')
  const [moralImportLoading, setMoralImportLoading] = useState(false)
  const [moralImportMode, setMoralImportMode] = useState<'append' | 'replace'>('replace')
  const [extraBonusImportLoading, setExtraBonusImportLoading] = useState(false)
  const [extraBonusImportMode, setExtraBonusImportMode] = useState<'append' | 'replace'>('replace')
  const [rankingGenerateLoading, setRankingGenerateLoading] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [showValidationResult, setShowValidationResult] = useState(false)
  const [clearMoralTableLoading, setClearMoralTableLoading] = useState(false)

  // 备份相关状态
  const [backupStatus, setBackupStatus] = useState<any>(null)
  const [backupLoading, setBackupLoading] = useState(false)

  // 过滤器状态
  const [academicProgrammeFilter, setAcademicProgrammeFilter] = useState<string>('all')
  const [rankingProgrammeFilter, setRankingProgrammeFilter] = useState<string>('all')
  const [availableProgrammes, setAvailableProgrammes] = useState<string[]>([])
  const [exportProgramme, setExportProgramme] = useState<string>('all')

  // 截止时间状态
  const [deadline, setDeadline] = useState<string>('')
  const [isDeadlineEnabled, setIsDeadlineEnabled] = useState(false)
  const [deadlineLoading, setDeadlineLoading] = useState(false)


  // ==================== 处理函数 ====================
  
  const handleEditPaper = (paper: Paper) => {
    setEditingPaper(paper)
    setShowPaperEditForm(true)
  }

  const handleEditPatent = (patent: Patent) => {
    setEditingPatent(patent)
    setShowPatentEditForm(true)
  }

  const handleEditCompetition = (competition: Competition) => {
    setEditingCompetition(competition)
    setShowCompetitionEditForm(true)
  }

  const handleCancelEdit = () => {
    setEditingPaper(null)
    setEditingPatent(null)
    setEditingCompetition(null)
    setShowPaperEditForm(false)
    setShowPatentEditForm(false)
    setShowCompetitionEditForm(false)
  }

  const handleSavePaper = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingPaper) return
    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      const updatedPaper = {
        ...editingPaper,
        paper_title: formData.get('paper_title') as string,
        journal_name: formData.get('journal_name') as string,
        journal_category: formData.get('journal_category') as string,
        author_type: formData.get('author_type') as string,
        publish_date: (formData.get('publish_date') as string) || null,
        note: formData.get('note') as string,
        score: parseFloat(formData.get('score') as string) || 0,
      }
      const response = await fetch('/api/admin/update-paper', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPaper)
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '保存失败')
      setStudentData(prev => prev ? { ...prev, papers: prev.papers.map(p => p.id === editingPaper.id ? updatedPaper : p) } : prev)
      setSuccess('论文信息保存成功')
      setTimeout(() => setSuccess(''), 3000)
      handleCancelEdit()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存论文失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePatent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingPatent) return
    setLoading(true)
    try {
      const formData = new FormData(e.currentTarget)
      const updatedPatent = {
        ...editingPatent,
        patent_name: formData.get('patent_name') as string,
        patent_number: formData.get('patent_number') as string,
        patent_date: (formData.get('patent_date') as string) || null,
        category_of_patent_owner: formData.get('category_of_patent_owner') as string,
        defense_status: formData.get('defense_status') as 'pending' | 'passed' | 'failed',
        note: formData.get('note') as string,
        score: parseFloat(formData.get('score') as string) || 0,
      }
      const response = await fetch('/api/admin/update-patent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatent)
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '保存失败')
      setStudentData(prev => prev ? { ...prev, patents: prev.patents.map(p => p.id === editingPatent.id ? updatedPatent : p) } : prev)
      setSuccess('专利信息保存成功')
      setTimeout(() => setSuccess(''), 3000)
      handleCancelEdit()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存专利失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCompetition = async (record: any) => {
    if (!editingCompetition) return
    setLoading(true)
    try {
      const updatedCompetition = {
        ...editingCompetition,
        competition_name: record.competition_name,
        competition_region: record.competition_region,
        competition_level: record.competition_level,
        competition_type: record.competition_type,
        award_type: record.award_type,
        award_value: record.award_value,
        team_leader_is_bupt: record.team_leader_is_bupt,
        is_main_member: record.is_main_member,
        main_members_count: record.main_members_count,
        coefficient: record.coefficient,
        note: record.note,
        score: record.score,
      }
      const response = await fetch('/api/admin/update-competition', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCompetition)
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '保存失败')
      setStudentData(prev => prev ? { ...prev, competitions: prev.competitions.map(c => c.id === editingCompetition.id ? updatedCompetition : c) } : prev)
      setSuccess('竞赛信息保存成功')
      setTimeout(() => setSuccess(''), 3000)
      handleCancelEdit()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存竞赛失败')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateDefenseStatus = async (paperId: string, defenseStatus: 'pending' | 'passed' | 'failed') => {
    const loadingKey = `defense-${paperId}`
    setDefenseLoading(prev => ({ ...prev, [loadingKey]: true }))
    try {
      const response = await fetch('/api/admin/update-defense-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId, defenseStatus })
      })
      if (!response.ok) throw new Error((await response.json()).error || '更新答辩状态失败')
      setStudentData(prev => prev ? { ...prev, papers: prev.papers.map(p => p.id === paperId ? { ...p, defense_status: defenseStatus } : p) } : prev)
      setSuccess(`论文答辩状态已更新`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新答辩状态失败')
    } finally {
      setDefenseLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }

  const handleUpdatePatentDefenseStatus = async (patentId: string, defenseStatus: 'pending' | 'passed' | 'failed') => {
    const loadingKey = `patent-defense-${patentId}`
    setDefenseLoading(prev => ({ ...prev, [loadingKey]: true }))
    try {
      const response = await fetch('/api/admin/update-patent-defense-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patentId, defenseStatus })
      })
      if (!response.ok) throw new Error((await response.json()).error || '更新专利答辩状态失败')
      setStudentData(prev => prev ? { ...prev, patents: prev.patents.map(p => p.id === patentId ? { ...p, defense_status: defenseStatus } : p) } : prev)
      setSuccess(`专利答辩状态已更新`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新专利答辩状态失败')
    } finally {
      setDefenseLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }

  const handleSearch = async () => {
    if (!studentId.trim()) { setError('请输入学号'); return }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/admin/student-papers-patents?studentId=${encodeURIComponent(studentId)}`)
      if (!response.ok) throw new Error((await response.json()).error || '获取数据失败')
      const data = await response.json()
      setStudentData(data)
      setExtraBonusScore(data.extraBonus?.bonus_score?.toString() || '0')
      if (data.total.papers === 0 && data.total.patents === 0 && data.total.competitions === 0) {
        setError('该学号未找到论文、专利或竞赛信息')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败')
    } finally {
      setLoading(false)
    }
  }

  const loadApprovalStats = async () => {
    setStatsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/student-approval-stats')
      const result = await response.json()
      if (result.success) {
        setApprovalStats(result.data)
      } else {
        setError('获取审核统计失败')
      }
    } catch (err) {
      console.error('加载审核统计失败:', err)
      setError('加载审核统计失败')
    } finally {
      setStatsLoading(false)
    }
  }

  const handleEditExtraBonus = () => setEditingExtraBonus(true)
  
  const handleSaveExtraBonus = async () => {
    if (!studentData) return
    try {
      const score = parseFloat(extraBonusScore)
      if (isNaN(score) || score < 0 || score > 4) { setError('额外加分必须在0-4之间'); return }
      const response = await fetch('/api/admin/student-papers-patents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'extra_bonus', studentId: studentData.studentId, score })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '更新额外加分失败')
      setStudentData(prev => prev ? { ...prev, extraBonus: result.data } : prev)
      setEditingExtraBonus(false)
      setSuccess('额外加分更新成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新额外加分失败')
    }
  }

  const handleCancelExtraBonusEdit = () => {
    setExtraBonusScore(studentData?.extraBonus?.bonus_score?.toString() || '0')
    setEditingExtraBonus(false)
  }

  // ==================== 导出函数 ====================

  const handleExportMoralScores = async () => {
    try {
      const response = await fetch('/api/admin/moral-education-scores?format=csv')
      if (!response.ok) throw new Error('导出失败')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comprehensive_evaluation_scores_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setSuccess('推免加分总表CSV导出成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('导出推免加分总表失败')
    }
  }

  const handleExportMoralScoresExcel = async () => {
    try {
      const response = await fetch('/api/admin/export-moral-education-excel')
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '导出失败')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `推免加分总表_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setSuccess('推免加分总表Excel导出成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出推免加分总表失败')
    }
  }

  const handleExportRanking = async () => {
    try {
      const response = await fetch('/api/admin/comprehensive-ranking?format=csv&topN=100')
      if (!response.ok) throw new Error('导出失败')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comprehensive_ranking_top100_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setSuccess('综合排名导出成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('导出综合排名失败')
    }
  }

  const handleExportRankingExcel = async () => {
    try {
      let url = '/api/admin/export-comprehensive-ranking-excel?topN=100'
      if (exportProgramme && exportProgramme !== 'all') {
        url += `&programme=${encodeURIComponent(exportProgramme)}`
      }
      const response = await fetch(url)
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '导出失败')
      const blob = await response.blob()
      const url2 = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url2
      const fileName = exportProgramme && exportProgramme !== 'all' 
        ? `${exportProgramme}_综合排名_${new Date().toISOString().split('T')[0]}.xlsx`
        : `综合排名_${new Date().toISOString().split('T')[0]}.xlsx`
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url2)
      document.body.removeChild(a)
      setSuccess('综合排名Excel导出成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('导出综合排名Excel失败')
    }
  }

  const handleExportPapers = async () => {
    try {
      const response = await fetch('/api/admin/export-papers')
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '导出失败')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `论文数据_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setSuccess('论文数据导出成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('导出论文数据失败')
    }
  }

  const handleExportPatents = async () => {
    try {
      const response = await fetch('/api/admin/export-patents')
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '导出失败')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `专利数据_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setSuccess('专利数据导出成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('导出专利数据失败')
    }
  }

  const handleExportCompetitions = async () => {
    try {
      const response = await fetch('/api/admin/export-competitions')
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '导出失败')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `竞赛数据_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setSuccess('竞赛数据导出成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('导出竞赛数据失败')
    }
  }

  const handleExportExtraBonus = async () => {
    try {
      const response = await fetch('/api/admin/export-extra-bonus')
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '导出失败')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `额外推免加分_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setSuccess('额外加分数据导出成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('导出额外加分数据失败')
    }
  }

  // ==================== 数据加载函数 ====================

  const loadScoreTable = async () => {
    try {
      const response = await fetch('/api/admin/moral-education-scores?limit=10')
      if (!response.ok) throw new Error((await response.json()).error || '获取推免加分总表失败')
      const result = await response.json()
      const sortedScores = (result.data || []).sort((a: any, b: any) => b.total_score - a.total_score).slice(0, 10)
      setComprehensiveScores(sortedScores)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取推免加分总表失败')
    }
  }

  const handleShowScoreTable = async () => {
    if (!showScoreTable) await loadScoreTable()
    setShowScoreTable(!showScoreTable)
  }

  const loadAcademicScores = async () => {
    try {
      const response = await fetch('/api/admin/academic-scores?limit=200')
      if (!response.ok) throw new Error((await response.json()).error || '获取智育成绩失败')
      const result = await response.json()
      const academicData = result.data || []
      setAcademicScores(academicData)
      updateAvailableProgrammes(academicData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取智育成绩失败')
    }
  }

  const handleShowAcademicTable = async () => {
    if (!showAcademicTable) await loadAcademicScores()
    setShowAcademicTable(!showAcademicTable)
  }

  const loadRankings = async () => {
    try {
      const response = await fetch('/api/admin/comprehensive-ranking?topN=100')
      if (!response.ok) throw new Error((await response.json()).error || '获取综合排名失败')
      const result = await response.json()
      const rankingData = result.data || []
      setComprehensiveRankings(rankingData)
      updateAvailableProgrammes(rankingData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取综合排名失败')
    }
  }

  const handleShowRankingTable = async () => {
    if (!showRankingTable) await loadRankings()
    setShowRankingTable(!showRankingTable)
  }

  const loadExtraBonusData = async () => {
    try {
      const response = await fetch('/api/admin/extra-bonus')
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '获取额外加分数据失败')
      setExtraBonusData(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取额外加分数据失败')
    }
  }

  const handleShowExtraBonusTable = async () => {
    if (!showExtraBonusTable) await loadExtraBonusData()
    setShowExtraBonusTable(!showExtraBonusTable)
  }

  const updateAvailableProgrammes = (data: any[]) => {
    const programmes = [...new Set(data.map(item => item.programme).filter(Boolean))].sort()
    setAvailableProgrammes(programmes)

    // 当当前筛选值不在新列表中时，自动切换为第一个可用专业或“全部”
    setAcademicProgrammeFilter(prev => {
      if (prev === 'all') return prev
      return programmes.includes(prev) ? prev : (programmes[0] ?? 'all')
    })
    setRankingProgrammeFilter(prev => {
      if (prev === 'all') return prev
      return programmes.includes(prev) ? prev : (programmes[0] ?? 'all')
    })
  }

  // ==================== 导入函数 ====================

  const handleAcademicImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setAcademicImportLoading(true)
    setError('')
    setSuccess('')
    try {
      const parsedData = await parseAcademicFile(file)
      if (!parsedData?.length) throw new Error('文件解析失败或文件为空')
      const response = await fetch('/api/admin/academic-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicScores: parsedData, replaceExisting: importMode === 'replace' })
      })
      if (!response.ok) throw new Error((await response.json()).error || '导入智育成绩失败')
      const result = await response.json()
      setSuccess(`智育成绩导入成功：${result.message}`)
      await loadAcademicScores()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入智育成绩失败')
    } finally {
      setAcademicImportLoading(false)
      event.target.value = ''
    }
  }

  const handleMoralImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setMoralImportLoading(true)
    setError('')
    setSuccess('')
    setValidationResult(null)
    setShowValidationResult(false)
    try {
      const parsedData = await parseMoralEducationFile(file)
      if (!parsedData?.length) throw new Error('文件解析失败或文件为空')
      
      const validateResponse = await fetch('/api/admin/import-moral-education-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moralScores: parsedData, validateOnly: true })
      })
      const validateResult = await validateResponse.json()
      setValidationResult(validateResult.validation)
      setShowValidationResult(true)
      
      if (!validateResult.validation.isValid) {
        setError('数据验证失败，请查看详细信息并修正后重新上传')
        return
      }
      
      if (window.confirm(`数据验证通过！\n有效记录: ${validateResult.validation.validRecords.length} 条\n是否继续导入？`)) {
        const importResponse = await fetch('/api/admin/import-moral-education-scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moralScores: parsedData, replaceExisting: moralImportMode === 'replace' })
        })
        if (!importResponse.ok) throw new Error((await importResponse.json()).error || '导入推免加分总表失败')
        const result = await importResponse.json()
        setSuccess(`推免加分总表导入成功！处理了 ${result.summary.validRecords} 条有效记录`)
        if (showScoreTable) setShowScoreTable(false)
        setTimeout(() => setSuccess(''), 5000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入推免加分总表失败')
    } finally {
      setMoralImportLoading(false)
      if (event.target) event.target.value = ''
    }
  }

  const handleExtraBonusImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setExtraBonusImportLoading(true)
    setError('')
    setSuccess('')
    try {
      const parsedData = await parseExtraBonusFile(file)
      const response = await fetch('/api/admin/extra-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsedData, mode: extraBonusImportMode })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '导入失败')
      setSuccess(result.message || '额外加分数据导入成功')
      setTimeout(() => setSuccess(''), 3000)
      if (showExtraBonusTable) await loadExtraBonusData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入额外加分数据失败')
    } finally {
      setExtraBonusImportLoading(false)
      e.target.value = ''
    }
  }

  const handleGenerateRanking = async () => {
    setRankingGenerateLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/admin/comprehensive-ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error((await response.json()).error || '生成综合排名失败')
      const result = await response.json()
      setSuccess(`${result.message}`)
      await loadRankings()
      setShowRankingTable(true)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成综合排名失败')
    } finally {
      setRankingGenerateLoading(false)
    }
  }

  // ==================== 备份与清空函数 ====================

  const loadBackupStatus = async () => {
    setBackupLoading(true)
    try {
      const response = await fetch('/api/admin/moral-education-backup')
      if (!response.ok) throw new Error('获取备份状态失败')
      const result = await response.json()
      setBackupStatus(result)
    } catch (err) {
      setError('获取备份状态失败')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    if (!window.confirm('确定要创建当前推免加分总表的备份吗？')) return
    setBackupLoading(true)
    try {
      const response = await fetch('/api/admin/moral-education-backup', { method: 'POST' })
      if (!response.ok) throw new Error('创建备份失败')
      const result = await response.json()
      setSuccess(`备份创建成功！备份了 ${result.backupCount} 条记录`)
      await loadBackupStatus()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('创建备份失败')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRollback = async () => {
    if (!window.confirm('确定要回退到备份数据吗？当前数据将被完全替换！')) return
    setBackupLoading(true)
    try {
      const response = await fetch('/api/admin/moral-education-backup', { method: 'PUT' })
      if (!response.ok) throw new Error((await response.json()).error || '回退失败')
      const result = await response.json()
      setSuccess(`${result.message}！恢复了 ${result.restoredCount} 条记录`)
      await loadBackupStatus()
      if (showScoreTable) setShowScoreTable(false)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '回退失败')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleClearMoralTable = async () => {
    if (!window.confirm('⚠️ 确定要清空推免加分总表吗？此操作不可撤销！')) return
    if (!window.confirm('⚠️ 最后确认：真的要清空推免加分总表吗？')) return
    setClearMoralTableLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/admin/clear-moral-table', { method: 'DELETE' })
      if (!response.ok) throw new Error((await response.json()).error || '清空推免加分总表失败')
      const result = await response.json()
      setSuccess(`推免加分总表清空成功！已删除 ${result.deletedCount} 条记录`)
      if (showScoreTable) { setShowScoreTable(false); setComprehensiveScores([]) }
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '清空推免加分总表失败')
    } finally {
      setClearMoralTableLoading(false)
    }
  }

  const handleClearExtraBonusTable = async () => {
    if (!confirm('确定要清空额外加分表吗？此操作不可恢复！')) return
    try {
      const response = await fetch('/api/admin/extra-bonus', { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '清空失败')
      setSuccess('额外加分表已清空')
      setTimeout(() => setSuccess(''), 3000)
      if (showExtraBonusTable) await loadExtraBonusData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '清空额外加分表失败')
    }
  }

  // ==================== 截止时间函数 ====================

  const loadDeadlineConfig = async () => {
    try {
      const response = await fetch('/api/admin/deadline-config')
      const result = await response.json()
      if (result.success && result.data) {
        if (result.data.deadline) {
          const date = new Date(result.data.deadline)
          const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
          setDeadline(formattedDate)
        } else {
          setDeadline('')
        }
        setIsDeadlineEnabled(result.data.is_enabled || false)
      }
    } catch (error) {
      console.error('加载截止时间配置失败:', error)
    }
  }

  const handleSaveDeadline = async () => {
    setDeadlineLoading(true)
    setError('')
    setSuccess('')
    try {
      let deadlineToSave = null
      if (deadline) {
        const localDate = new Date(deadline)
        deadlineToSave = localDate.toISOString()
      }
      const response = await fetch('/api/admin/deadline-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline: deadlineToSave, is_enabled: isDeadlineEnabled })
      })
      const result = await response.json()
      if (result.success) {
        setSuccess('截止时间配置保存成功')
        setTimeout(() => setSuccess(''), 3000)
        await loadDeadlineConfig()
      } else {
        setError(result.message || '保存失败')
      }
    } catch (error) {
      setError('保存截止时间配置失败')
    } finally {
      setDeadlineLoading(false)
    }
  }

  const handleToggleDeadlineEnabled = async () => {
    const newEnabledState = !isDeadlineEnabled
    if (newEnabledState && !deadline) { setError('请先设置截止时间'); return }
    setIsDeadlineEnabled(newEnabledState)
    setDeadlineLoading(true)
    setError('')
    setSuccess('')
    try {
      let deadlineToSave = null
      if (deadline) deadlineToSave = new Date(deadline).toISOString()
      const response = await fetch('/api/admin/deadline-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline: deadlineToSave, is_enabled: newEnabledState })
      })
      const result = await response.json()
      if (result.success) {
        setSuccess(newEnabledState ? '截止时间限制已启用' : '截止时间限制已禁用')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(result.message || '操作失败')
        setIsDeadlineEnabled(!newEnabledState)
      }
    } catch (error) {
      setError('操作失败')
      setIsDeadlineEnabled(!newEnabledState)
    } finally {
      setDeadlineLoading(false)
    }
  }

  React.useEffect(() => { 
    loadDeadlineConfig()
    loadApprovalStats()
  }, [])

  // ==================== 审核函数 ====================

  const startEditScore = (type: 'paper' | 'patent' | 'competition', id: string, currentScore: string | number) => {
    setEditingScores(prev => ({ ...prev, [`${type}-${id}`]: currentScore.toString() }))
  }

  const cancelEditScore = (type: 'paper' | 'patent' | 'competition', id: string) => {
    setEditingScores(prev => { const newScores = { ...prev }; delete newScores[`${type}-${id}`]; return newScores })
  }

  const saveScore = async (type: 'paper' | 'patent' | 'competition', id: string) => {
    const key = `${type}-${id}`
    const newScore = editingScores[key]
    if (!newScore || isNaN(parseFloat(newScore))) { setError('请输入有效的分数'); return }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/admin/student-papers-patents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, score: parseFloat(newScore) })
      })
      if (!response.ok) throw new Error((await response.json()).error || '更新分数失败')
      if (studentData) {
        const updatedData = { ...studentData }
        if (type === 'paper') updatedData.papers = updatedData.papers.map(p => p.id === id ? { ...p, score: parseFloat(newScore) } : p)
        else if (type === 'patent') updatedData.patents = updatedData.patents.map(p => p.id === id ? { ...p, score: parseFloat(newScore) } : p)
        else if (type === 'competition') updatedData.competitions = updatedData.competitions.map(c => c.id === id ? { ...c, score: parseFloat(newScore) } : c)
        setStudentData(updatedData)
      }
      cancelEditScore(type, id)
      setSuccess('分数更新成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存分数失败')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRecord = async (type: 'paper' | 'patent' | 'competition', id: string, status: 'approved' | 'rejected' | 'pending') => {
    const key = `${type}-${id}`
    setApprovalLoading(prev => ({ ...prev, [key]: true }))
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/admin/approve-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, status })
      })
      if (!response.ok) throw new Error((await response.json()).error || '审核失败')
      if (studentData) {
        const updatedData = { ...studentData }
        if (type === 'paper') updatedData.papers = updatedData.papers.map(p => p.id === id ? { ...p, approval_status: status } : p)
        else if (type === 'patent') updatedData.patents = updatedData.patents.map(p => p.id === id ? { ...p, approval_status: status } : p)
        else if (type === 'competition') updatedData.competitions = updatedData.competitions.map(c => c.id === id ? { ...c, approval_status: status } : c)
        setStudentData(updatedData)
      }
      setSuccess(`记录审核${status === 'approved' ? '通过' : status === 'rejected' ? '拒绝' : '重置'}成功`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '审核失败')
    } finally {
      setApprovalLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const checkAllRecordsApproved = (data: StudentData): { canApprove: boolean; pendingRecords: string[] } => {
    const pendingRecords: string[] = []
    data.papers.forEach(p => { if (p.approval_status !== 'approved') pendingRecords.push(`论文《${p.paper_title}》`) })
    data.patents.forEach(p => { if (p.approval_status !== 'approved') pendingRecords.push(`专利《${p.patent_name}》`) })
    data.competitions.forEach(c => { if (c.approval_status !== 'approved') pendingRecords.push(`竞赛《${c.competition_name}》`) })
    return { canApprove: pendingRecords.length === 0, pendingRecords }
  }

  const handleDeleteRecord = async (type: 'paper' | 'patent' | 'competition', id: string, title: string) => {
    if (!window.confirm(`确定要删除这条${type === 'paper' ? '论文' : type === 'patent' ? '专利' : '竞赛'}记录吗？\n\n标题：${title}`)) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/admin/delete-record', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id })
      })
      if (!response.ok) throw new Error((await response.json()).error || '删除记录失败')
      if (studentData) {
        const updatedData = { ...studentData }
        if (type === 'paper') { updatedData.papers = updatedData.papers.filter(p => p.id !== id); updatedData.total.papers = updatedData.papers.length }
        else if (type === 'patent') { updatedData.patents = updatedData.patents.filter(p => p.id !== id); updatedData.total.patents = updatedData.patents.length }
        else if (type === 'competition') { updatedData.competitions = updatedData.competitions.filter(c => c.id !== id); updatedData.total.competitions = updatedData.competitions.length }
        setStudentData(updatedData)
      }
      setSuccess(`${type === 'paper' ? '论文' : type === 'patent' ? '专利' : '竞赛'}记录删除成功`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除记录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveStudent = async (studentId: string, status: 'approved' | 'rejected' | 'pending') => {
    if (status === 'approved' && studentData) {
      const { canApprove, pendingRecords } = checkAllRecordsApproved(studentData)
      if (!canApprove) {
        setError(`无法审核通过，以下记录尚未审核通过：\n${pendingRecords.map(r => `• ${r}`).join('\n')}`)
        return
      }
    }
    setApprovalLoading(prev => ({ ...prev, [`student-${studentId}`]: true }))
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/admin/approve-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, status })
      })
      if (!response.ok) throw new Error((await response.json()).error || '学生审核失败')
      const result = await response.json()
      if (studentData) setStudentData({ ...studentData, overall_approval_status: status })
      setSuccess(result.message || `学生综合资格${status === 'approved' ? '通过' : status === 'rejected' ? '拒绝' : '重置'}成功`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '学生审核失败')
    } finally {
      setApprovalLoading(prev => ({ ...prev, [`student-${studentId}`]: false }))
    }
  }

  // ==================== 辅助函数 ====================

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    if (/^\d{4}-\d{2}$/.test(dateString)) return dateString
    try { return new Date(dateString).toLocaleDateString('zh-CN') } catch { return dateString }
  }

  const formatScore = (score: string | number): string => {
    if (score === null || score === undefined) return '0'
    if (typeof score === 'number') return score.toString()
    if (typeof score === 'string') { const n = parseFloat(score); return isNaN(n) ? '0' : n.toString() }
    return '0'
  }

  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-800 border-green-200">已通过</Badge>
      case 'rejected': return <Badge className="bg-red-100 text-red-800 border-red-200">已拒绝</Badge>
      default: return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">待审核</Badge>
    }
  }

  const getDefenseStatusBadge = (status: string, paperId: string) => {
    const handleClick = () => {
      let nextStatus: 'pending' | 'passed' | 'failed' = status === 'pending' ? 'passed' : status === 'passed' ? 'failed' : 'pending'
      handleUpdateDefenseStatus(paperId, nextStatus)
    }
    const isLoading = defenseLoading[`defense-${paperId}`]
    switch (status) {
      case 'passed': return <Badge className="bg-blue-100 text-blue-800 border-blue-200 cursor-pointer hover:bg-blue-200" onClick={handleClick}>{isLoading ? '更新中...' : '已通过'}</Badge>
      case 'failed': return <Badge className="bg-red-100 text-red-800 border-red-200 cursor-pointer hover:bg-red-200" onClick={handleClick}>{isLoading ? '更新中...' : '未通过'}</Badge>
      default: return <Badge className="bg-gray-100 text-gray-800 border-gray-200 cursor-pointer hover:bg-gray-200" onClick={handleClick}>{isLoading ? '更新中...' : '待答辩'}</Badge>
    }
  }

  const getPatentDefenseStatusBadge = (status: string, patentId: string) => {
    const handleClick = () => {
      let nextStatus: 'pending' | 'passed' | 'failed' = status === 'pending' ? 'passed' : status === 'passed' ? 'failed' : 'pending'
      handleUpdatePatentDefenseStatus(patentId, nextStatus)
    }
    const isLoading = defenseLoading[`patent-defense-${patentId}`]
    switch (status) {
      case 'passed': return <Badge className="bg-blue-100 text-blue-800 border-blue-200 cursor-pointer hover:bg-blue-200" onClick={handleClick}>{isLoading ? '更新中...' : '已通过'}</Badge>
      case 'failed': return <Badge className="bg-red-100 text-red-800 border-red-200 cursor-pointer hover:bg-red-200" onClick={handleClick}>{isLoading ? '更新中...' : '未通过'}</Badge>
      default: return <Badge className="bg-gray-100 text-gray-800 border-gray-200 cursor-pointer hover:bg-gray-200" onClick={handleClick}>{isLoading ? '更新中...' : '待答辩'}</Badge>
    }
  }

  const filteredAcademicScores = (academicProgrammeFilter === 'all' ? academicScores : academicScores.filter(s => s.programme === academicProgrammeFilter)).slice(0, 10)
  const filteredRankings = (rankingProgrammeFilter === 'all' ? comprehensiveRankings : comprehensiveRankings.filter(r => r.programme === rankingProgrammeFilter)).slice(0, 10)

  // ==================== 渲染 ====================

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">成绩综合管理</h1>
          <p className="text-gray-600">管理学生论文发表、专利申请和竞赛获奖的加分记录审核，设置学生综合资格</p>
        </div>

        {/* 错误和成功消息 */}
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800 whitespace-pre-line">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Tab 导航 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="review" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              学生审核
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              数据导入
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              数据导出
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              排名管理
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              系统设置
            </TabsTrigger>
          </TabsList>

          {/* ==================== Tab 1: 学生审核 ==================== */}
          <TabsContent value="review" className="space-y-6">
            {/* 审核统计面板 */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 mb-1">审核通过</p>
                      <p className="text-3xl font-bold text-green-700">
                        {statsLoading ? '...' : approvalStats.approved}
                      </p>
                    </div>
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 mb-1">待审核</p>
                      <p className="text-3xl font-bold text-yellow-700">
                        {statsLoading ? '...' : approvalStats.pending}
                      </p>
                    </div>
                    <Clock className="h-10 w-10 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 mb-1">已拒绝</p>
                      <p className="text-3xl font-bold text-red-700">
                        {statsLoading ? '...' : approvalStats.rejected}
                      </p>
                    </div>
                    <XCircle className="h-10 w-10 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 搜索区域 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Search className="h-5 w-5 mr-2" />
                    学生信息查询
                  </div>
                  <Button 
                    onClick={loadApprovalStats} 
                    disabled={statsLoading}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
                    刷新统计
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end space-x-4">
                  <div className="flex-1 max-w-md">
                    <Label htmlFor="studentId">学号</Label>
                    <Input
                      id="studentId"
                      type="text"
                      placeholder="请输入学生学号"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                    {loading ? '搜索中...' : '查询'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 学生信息展示 */}
            {studentData && (
              <div className="space-y-6">
                {/* 学生整体审核状态 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Award className="h-5 w-5 mr-2" />
                        学生综合资格审核
                      </div>
                      {getApprovalStatusBadge(studentData.overall_approval_status || 'pending')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">学号：<span className="font-mono font-semibold">{studentData.studentId}</span></p>
                        {studentData.phoneNumber && (
                          <p className="text-sm text-gray-600 mb-2">手机号：<span className="font-mono font-semibold">{studentData.phoneNumber}</span></p>
                        )}
                        <p className="text-sm text-gray-600 mb-1">
                          当前状态：{studentData.overall_approval_status === 'approved' ? '综合资格已通过' : studentData.overall_approval_status === 'rejected' ? '综合资格已拒绝' : '等待审核'}
                        </p>
                        {studentData.overall_approval_status === 'approved' && (
                          <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">⚠️ 学生综合资格已通过，所有推免相关信息已锁定</p>
                        )}
                        {(() => {
                          const { canApprove, pendingRecords } = checkAllRecordsApproved(studentData)
                          if (!canApprove && studentData.overall_approval_status === 'pending') {
                            return (
                              <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-2">
                                ⚠️ 还有 {pendingRecords.length} 项加分记录未审核通过
                              </div>
                            )
                          }
                          return null
                        })()}
                      </div>
                      <div className="flex space-x-2">
                        {(() => {
                          const { canApprove, pendingRecords } = checkAllRecordsApproved(studentData)
                          const isDisabled = approvalLoading[`student-${studentData.studentId}`] || studentData.overall_approval_status === 'approved'
                          const hasUnApprovedRecords = !canApprove && studentData.overall_approval_status !== 'approved'
                          return (
                            <div className="relative">
                              <Button onClick={() => handleApproveStudent(studentData.studentId, 'approved')} disabled={isDisabled}
                                className={`${hasUnApprovedRecords ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`} size="sm">
                                {approvalLoading[`student-${studentData.studentId}`] ? '处理中...' : '通过综合'}
                              </Button>
                              {hasUnApprovedRecords && <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{pendingRecords.length}</div>}
                            </div>
                          )
                        })()}
                        <Button onClick={() => handleApproveStudent(studentData.studentId, 'rejected')}
                          disabled={approvalLoading[`student-${studentData.studentId}`] || studentData.overall_approval_status === 'rejected'}
                          variant="destructive" size="sm">
                          {approvalLoading[`student-${studentData.studentId}`] ? '处理中...' : '拒绝综合'}
                        </Button>
                        {studentData.overall_approval_status !== 'pending' && (
                          <Button onClick={() => handleApproveStudent(studentData.studentId, 'pending')}
                            disabled={approvalLoading[`student-${studentData.studentId}`]}
                            variant="outline" className="border-yellow-500 text-yellow-600" size="sm">
                            重置审核
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 统计信息 */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><FileText className="h-5 w-5 text-blue-600" /><div><p className="text-sm text-gray-600">论文数量</p><p className="text-2xl font-bold text-blue-600">{studentData.total.papers}</p></div></div></CardContent></Card>
                  <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><Award className="h-5 w-5 text-green-600" /><div><p className="text-sm text-gray-600">专利数量</p><p className="text-2xl font-bold text-green-600">{studentData.total.patents}</p></div></div></CardContent></Card>
                  <Card><CardContent className="p-4"><div className="flex items-center space-x-2"><Trophy className="h-5 w-5 text-orange-600" /><div><p className="text-sm text-gray-600">竞赛数量</p><p className="text-2xl font-bold text-orange-600">{studentData.total.competitions}</p></div></div></CardContent></Card>
                  <Card><CardContent className="p-4"><div><p className="text-sm text-gray-600">查询学号</p><p className="text-2xl font-bold text-purple-600">{studentData.studentId}</p></div></CardContent></Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">额外加分</p>
                          {editingExtraBonus ? (
                            <div className="flex items-center space-x-2 mt-1">
                              <Input type="number" step="0.01" min="0" max="4" value={extraBonusScore} onChange={(e) => setExtraBonusScore(e.target.value)} className="w-20 h-8" />
                              <Button size="sm" onClick={handleSaveExtraBonus} className="h-8 px-2"><Save className="h-4 w-4" /></Button>
                              <Button size="sm" variant="outline" onClick={handleCancelExtraBonusEdit} className="h-8 px-2"><X className="h-4 w-4" /></Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <p className="text-2xl font-bold text-indigo-600">{studentData.extraBonus?.bonus_score || 0}</p>
                              <Button size="sm" variant="ghost" onClick={handleEditExtraBonus} className="h-6 px-2"><Edit className="h-3 w-3" /></Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 论文信息表格 */}
                {studentData.papers.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center"><FileText className="h-5 w-5 mr-2" />论文发表信息</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>论文标题</TableHead>
                              <TableHead>期刊名称</TableHead>
                              <TableHead>期刊类别</TableHead>
                              <TableHead>姓名</TableHead>
                              <TableHead>作者类型</TableHead>
                              <TableHead>发表日期</TableHead>
                              <TableHead>分数</TableHead>
                              <TableHead>审核状态</TableHead>
                              <TableHead>答辩状态</TableHead>
                              <TableHead>操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentData.papers.map((paper) => {
                              const editKey = `paper-${paper.id}`
                              const isEditing = editKey in editingScores
                              return (
                                <TableRow key={paper.id}>
                                  <TableCell className="font-medium max-w-xs truncate">{paper.paper_title}</TableCell>
                                  <TableCell>{paper.journal_name}</TableCell>
                                  <TableCell><Badge variant="outline">{paper.journal_category}</Badge></TableCell>
                                  <TableCell>{paper.full_name}</TableCell>
                                  <TableCell>{paper.author_type}</TableCell>
                                  <TableCell>{formatDate(paper.publish_date || '')}</TableCell>
                                  <TableCell>
                                    {isEditing ? (
                                      <Input type="number" step="0.01" className="w-20" value={editingScores[editKey]}
                                        onChange={(e) => setEditingScores(prev => ({ ...prev, [editKey]: e.target.value }))} />
                                    ) : (
                                      <span className="font-semibold text-blue-600">{formatScore(paper.score)}</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{getApprovalStatusBadge(paper.approval_status || 'pending')}</TableCell>
                                  <TableCell>{getDefenseStatusBadge(paper.defense_status || 'pending', paper.id)}</TableCell>
                                  <TableCell>
                                    <div className="flex space-x-1">
                                      {studentData.overall_approval_status === 'approved' ? (
                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">已锁定</span>
                                      ) : (
                                        <>
                                          {isEditing ? (
                                            <>
                                              <Button size="sm" variant="outline" onClick={() => saveScore('paper', paper.id)} disabled={loading}><Check className="h-3 w-3" /></Button>
                                              <Button size="sm" variant="outline" onClick={() => cancelEditScore('paper', paper.id)}><X className="h-3 w-3" /></Button>
                                            </>
                                          ) : (
                                            <Button size="sm" variant="outline" onClick={() => handleEditPaper(paper)} className="border-purple-500 text-purple-600"><Edit className="h-3 w-3" /></Button>
                                          )}
                                          <Button size="sm" onClick={() => handleApproveRecord('paper', paper.id, 'approved')}
                                            disabled={approvalLoading[`paper-${paper.id}`] || paper.approval_status === 'approved'}
                                            className="bg-green-600 hover:bg-green-700"><CheckCircle className="h-3 w-3" /></Button>
                                          <Button size="sm" onClick={() => handleApproveRecord('paper', paper.id, 'rejected')}
                                            disabled={approvalLoading[`paper-${paper.id}`] || paper.approval_status === 'rejected'}
                                            variant="destructive"><XCircle className="h-3 w-3" /></Button>
                                          {paper.approval_status !== 'pending' && (
                                            <Button size="sm" onClick={() => handleApproveRecord('paper', paper.id, 'pending')}
                                              disabled={approvalLoading[`paper-${paper.id}`]}
                                              variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="h-3 w-3" /></Button>
                                          )}
                                          <Button size="sm" onClick={() => handleDeleteRecord('paper', paper.id, paper.paper_title)}
                                            disabled={loading} variant="outline" className="border-red-500 text-red-600"><Trash2 className="h-3 w-3" /></Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 专利信息表格 */}
                {studentData.patents.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center"><Award className="h-5 w-5 mr-2" />专利申请信息</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>专利名称</TableHead>
                              <TableHead>专利号</TableHead>
                              <TableHead>专利权人类别</TableHead>
                              <TableHead>姓名</TableHead>
                              <TableHead>申请日期</TableHead>
                              <TableHead>分数</TableHead>
                              <TableHead>审核状态</TableHead>
                              <TableHead>答辩状态</TableHead>
                              <TableHead>操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentData.patents.map((patent) => {
                              const editKey = `patent-${patent.id}`
                              const isEditing = editKey in editingScores
                              return (
                                <TableRow key={patent.id}>
                                  <TableCell className="font-medium max-w-xs truncate">{patent.patent_name}</TableCell>
                                  <TableCell className="font-mono text-sm">{patent.patent_number || '-'}</TableCell>
                                  <TableCell><Badge variant="outline">{patent.category_of_patent_owner}</Badge></TableCell>
                                  <TableCell>{patent.full_name}</TableCell>
                                  <TableCell>{formatDate(patent.patent_date || '')}</TableCell>
                                  <TableCell>
                                    {isEditing ? (
                                      <Input type="number" step="0.01" className="w-20" value={editingScores[editKey]}
                                        onChange={(e) => setEditingScores(prev => ({ ...prev, [editKey]: e.target.value }))} />
                                    ) : (
                                      <span className="font-semibold text-green-600">{formatScore(patent.score)}</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{getApprovalStatusBadge(patent.approval_status || 'pending')}</TableCell>
                                  <TableCell>{getPatentDefenseStatusBadge(patent.defense_status || 'pending', patent.id)}</TableCell>
                                  <TableCell>
                                    <div className="flex space-x-1">
                                      {studentData.overall_approval_status === 'approved' ? (
                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">已锁定</span>
                                      ) : (
                                        <>
                                          {isEditing ? (
                                            <>
                                              <Button size="sm" variant="outline" onClick={() => saveScore('patent', patent.id)} disabled={loading}><Check className="h-3 w-3" /></Button>
                                              <Button size="sm" variant="outline" onClick={() => cancelEditScore('patent', patent.id)}><X className="h-3 w-3" /></Button>
                                            </>
                                          ) : (
                                            <Button size="sm" variant="outline" onClick={() => handleEditPatent(patent)} className="border-purple-500 text-purple-600"><Edit className="h-3 w-3" /></Button>
                                          )}
                                          <Button size="sm" onClick={() => handleApproveRecord('patent', patent.id, 'approved')}
                                            disabled={approvalLoading[`patent-${patent.id}`] || patent.approval_status === 'approved'}
                                            className="bg-green-600 hover:bg-green-700"><CheckCircle className="h-3 w-3" /></Button>
                                          <Button size="sm" onClick={() => handleApproveRecord('patent', patent.id, 'rejected')}
                                            disabled={approvalLoading[`patent-${patent.id}`] || patent.approval_status === 'rejected'}
                                            variant="destructive"><XCircle className="h-3 w-3" /></Button>
                                          {patent.approval_status !== 'pending' && (
                                            <Button size="sm" onClick={() => handleApproveRecord('patent', patent.id, 'pending')}
                                              disabled={approvalLoading[`patent-${patent.id}`]}
                                              variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="h-3 w-3" /></Button>
                                          )}
                                          <Button size="sm" onClick={() => handleDeleteRecord('patent', patent.id, patent.patent_name)}
                                            disabled={loading} variant="outline" className="border-red-500 text-red-600"><Trash2 className="h-3 w-3" /></Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 竞赛信息表格 */}
                {studentData.competitions.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center"><Trophy className="h-5 w-5 mr-2" />竞赛获奖信息</CardTitle></CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>竞赛名称</TableHead>
                              <TableHead>竞赛地区</TableHead>
                              <TableHead>竞赛级别</TableHead>
                              <TableHead>竞赛类型</TableHead>
                              <TableHead>获得奖项</TableHead>
                              <TableHead>姓名</TableHead>
                              <TableHead>备注</TableHead>
                              <TableHead>分数</TableHead>
                              <TableHead>审核状态</TableHead>
                              <TableHead>操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {studentData.competitions.map((competition) => {
                              const editKey = `competition-${competition.id}`
                              const isEditing = editKey in editingScores
                              return (
                                <TableRow key={competition.id}>
                                  <TableCell className="font-medium">{competition.competition_name}</TableCell>
                                  <TableCell>{competition.competition_region}</TableCell>
                                  <TableCell><Badge variant="outline">{competition.competition_level}</Badge></TableCell>
                                  <TableCell>{(competition as any).competition_type === 'individual' ? '个人' : (competition as any).competition_type === 'team' ? '团体' : '-'}</TableCell>
                                  <TableCell>{(competition as any).award_value ? translateAwardValue((competition as any).award_type, (competition as any).award_value) : '-'}</TableCell>
                                  <TableCell>{competition.full_name}</TableCell>
                                  <TableCell>{competition.note || '-'}</TableCell>
                                  <TableCell>
                                    {isEditing ? (
                                      <Input type="number" step="0.01" className="w-20" value={editingScores[editKey]}
                                        onChange={(e) => setEditingScores(prev => ({ ...prev, [editKey]: e.target.value }))} />
                                    ) : (
                                      <span className="font-semibold text-orange-600">{competition.score}</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{getApprovalStatusBadge(competition.approval_status || 'pending')}</TableCell>
                                  <TableCell>
                                    <div className="flex space-x-1">
                                      {studentData.overall_approval_status === 'approved' ? (
                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">已锁定</span>
                                      ) : (
                                        <>
                                          {isEditing ? (
                                            <>
                                              <Button size="sm" variant="outline" onClick={() => saveScore('competition', competition.id)} disabled={loading}><Check className="h-3 w-3" /></Button>
                                              <Button size="sm" variant="outline" onClick={() => cancelEditScore('competition', competition.id)}><X className="h-3 w-3" /></Button>
                                            </>
                                          ) : (
                                            <Button size="sm" variant="outline" onClick={() => handleEditCompetition(competition)} className="border-purple-500 text-purple-600"><Edit className="h-3 w-3" /></Button>
                                          )}
                                          <Button size="sm" onClick={() => handleApproveRecord('competition', competition.id, 'approved')}
                                            disabled={approvalLoading[`competition-${competition.id}`] || competition.approval_status === 'approved'}
                                            className="bg-green-600 hover:bg-green-700"><CheckCircle className="h-3 w-3" /></Button>
                                          <Button size="sm" onClick={() => handleApproveRecord('competition', competition.id, 'rejected')}
                                            disabled={approvalLoading[`competition-${competition.id}`] || competition.approval_status === 'rejected'}
                                            variant="destructive"><XCircle className="h-3 w-3" /></Button>
                                          {competition.approval_status !== 'pending' && (
                                            <Button size="sm" onClick={() => handleApproveRecord('competition', competition.id, 'pending')}
                                              disabled={approvalLoading[`competition-${competition.id}`]}
                                              variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="h-3 w-3" /></Button>
                                          )}
                                          <Button size="sm" onClick={() => handleDeleteRecord('competition', competition.id, competition.competition_name)}
                                            disabled={loading} variant="outline" className="border-red-500 text-red-600"><Trash2 className="h-3 w-3" /></Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 无数据提示 */}
                {studentData.total.papers === 0 && studentData.total.patents === 0 && studentData.total.competitions === 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                      <p className="text-gray-500">该学生暂无论文发表、专利申请或竞赛获奖信息</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ==================== Tab 2: 数据导入 ==================== */}
          <TabsContent value="import" className="space-y-6">
            {/* 智育成绩导入 */}
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center text-blue-700">
                  <BookOpen className="h-5 w-5 mr-2" />
                  智育成绩导入
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">📋 支持的表头格式</h4>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p><strong>支持中文表头：</strong>学号、姓名、上课院系、学生校区、专业名称、班级名称、培养层次、所修总门数、所修总学分、所得学分、未得学分、加权均分、平均学分绩点、专业排名、专业排名总人数</p>
                    <p><strong>文件格式：</strong>支持 .csv、.xlsx、.xls 格式</p>
                  </div>
                </div>
                <div className="mb-4">
                  <Label className="text-sm font-medium">导入模式选择：</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center">
                      <input type="radio" name="importMode" value="append" checked={importMode === 'append'} onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')} className="mr-2" />
                      <span className="text-sm">追加/更新模式</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="importMode" value="replace" checked={importMode === 'replace'} onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')} className="mr-2" />
                      <span className="text-sm">替换模式</span>
                      <Badge variant="outline" className="ml-2 text-xs">推荐</Badge>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={handleAcademicImport} disabled={academicImportLoading} className="hidden" />
                    {academicImportLoading ? '导入中...' : '📥 导入智育成绩'}
                  </label>
                  <Button onClick={handleShowAcademicTable} variant="outline" className="border-blue-500 text-blue-600">
                    {showAcademicTable ? '隐藏智育成绩' : '👁️ 查看智育成绩'}
                  </Button>
                </div>
                {showAcademicTable && (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-center gap-4 mb-4">
                      <label className="text-sm font-medium">专业选择：</label>
                      <select value={academicProgrammeFilter} onChange={(e) => setAcademicProgrammeFilter(e.target.value)}
                        className="px-3 py-1 border rounded-md text-sm">
                        <option value="all">全部专业</option>
                        {availableProgrammes.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>学号</TableHead><TableHead>姓名</TableHead><TableHead>专业</TableHead><TableHead>班级</TableHead>
                          <TableHead>加权均分</TableHead><TableHead>GPA</TableHead><TableHead>专业排名</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAcademicScores.map((s, i) => (
                          <TableRow key={s.id || i}>
                            <TableCell>{s.bupt_student_id}</TableCell><TableCell>{s.full_name}</TableCell>
                            <TableCell>{s.programme || '-'}</TableCell><TableCell>{s.class || '-'}</TableCell>
                            <TableCell>{s.weighted_average || 0}</TableCell><TableCell>{s.gpa || 0}</TableCell>
                            <TableCell>{s.programme_rank ? <Badge variant="secondary">第 {s.programme_rank} 名</Badge> : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredAcademicScores.length === 0 && <p className="text-center py-4 text-gray-500">暂无数据</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 推免加分总表导入 */}
            <Card className="border-orange-200">
              <CardHeader className="bg-orange-50">
                <CardTitle className="flex items-center text-orange-700">
                  <Trophy className="h-5 w-5 mr-2" />
                  推免加分总表导入
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="text-sm font-medium text-orange-800 mb-2">📋 支持的表头格式</h4>
                  <div className="text-xs text-orange-700 space-y-1">
                    <p><strong>支持中文表头：</strong>学号、姓名、班级、论文分数、专利分数、竞赛分数、论文+专利小计、总加分</p>
                    <p><strong>文件格式：</strong>支持 .csv、.xlsx、.xls 格式</p>
                  </div>
                </div>
                <div className="mb-4">
                  <Label className="text-sm font-medium">导入模式选择：</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center">
                      <input type="radio" name="moralImportMode" value="append" checked={moralImportMode === 'append'} onChange={(e) => setMoralImportMode(e.target.value as 'append' | 'replace')} className="mr-2" />
                      <span className="text-sm">追加模式</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="moralImportMode" value="replace" checked={moralImportMode === 'replace'} onChange={(e) => setMoralImportMode(e.target.value as 'append' | 'replace')} className="mr-2" />
                      <span className="text-sm">替换模式</span>
                      <Badge variant="outline" className="ml-2 text-xs">推荐</Badge>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center cursor-pointer bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded">
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={handleMoralImport} disabled={moralImportLoading} className="hidden" />
                    {moralImportLoading ? '导入中...' : '📥 导入推免加分总表'}
                  </label>
                  <Button onClick={handleShowScoreTable} variant="outline" className="border-orange-500 text-orange-600">
                    {showScoreTable ? '隐藏推免加分总表' : '👁️ 查看推免加分总表'}
                  </Button>
                </div>
                {showValidationResult && validationResult && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className={`font-medium ${validationResult.isValid ? 'text-green-700' : 'text-red-700'}`}>
                        {validationResult.isValid ? '✓ 数据验证通过' : '✗ 数据验证失败'}
                      </h4>
                      <Button variant="ghost" size="sm" onClick={() => setShowValidationResult(false)}><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="bg-blue-50 p-2 rounded">有效: {validationResult.validRecords?.length || 0}</div>
                      <div className="bg-red-50 p-2 rounded">无效: {validationResult.invalidRecords?.length || 0}</div>
                      <div className="bg-yellow-50 p-2 rounded">警告: {validationResult.warnings?.length || 0}</div>
                      <div className="bg-gray-100 p-2 rounded">错误: {validationResult.errors?.length || 0}</div>
                    </div>
                  </div>
                )}
                {showScoreTable && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">推免加分总表 - 前10名</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>排名</TableHead><TableHead>学号</TableHead><TableHead>姓名</TableHead><TableHead>班级</TableHead>
                          <TableHead>论文分数</TableHead><TableHead>专利分数</TableHead><TableHead>竞赛分数</TableHead><TableHead>总加分</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comprehensiveScores.map((s, i) => (
                          <TableRow key={s.id} className={i < 3 ? 'bg-yellow-50' : ''}>
                            <TableCell>{i + 1}{i === 0 && '🥇'}{i === 1 && '🥈'}{i === 2 && '🥉'}</TableCell>
                            <TableCell className="font-mono">{s.bupt_student_id}</TableCell>
                            <TableCell>{s.full_name}</TableCell><TableCell>{s.class}</TableCell>
                            <TableCell className="text-blue-600">{s.paper_score.toFixed(2)}</TableCell>
                            <TableCell className="text-green-600">{s.patent_score.toFixed(2)}</TableCell>
                            <TableCell className="text-orange-600">{s.competition_score.toFixed(2)}</TableCell>
                            <TableCell className="text-red-600 font-bold">{s.total_score.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {comprehensiveScores.length === 0 && <p className="text-center py-4 text-gray-500">暂无数据</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 额外加分导入 */}
            <Card className="border-indigo-200">
              <CardHeader className="bg-indigo-50">
                <CardTitle className="flex items-center text-indigo-700">
                  <Award className="h-5 w-5 mr-2" />
                  额外推免加分导入
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <h4 className="text-sm font-medium text-indigo-800 mb-2">📋 文件格式要求</h4>
                  <div className="text-xs text-indigo-700 space-y-1">
                    <p><strong>必需字段：</strong>学号、分数</p>
                    <p><strong>文件格式：</strong>支持 .csv、.xlsx、.xls 格式</p>
                    <p><strong>分数范围：</strong>0-4分</p>
                  </div>
                </div>
                <div className="mb-4">
                  <Label className="text-sm font-medium">导入模式选择：</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center">
                      <input type="radio" name="extraBonusImportMode" value="append" checked={extraBonusImportMode === 'append'} onChange={(e) => setExtraBonusImportMode(e.target.value as 'append' | 'replace')} className="mr-2" />
                      <span className="text-sm">追加模式</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="extraBonusImportMode" value="replace" checked={extraBonusImportMode === 'replace'} onChange={(e) => setExtraBonusImportMode(e.target.value as 'append' | 'replace')} className="mr-2" />
                      <span className="text-sm">替换模式</span>
                      <Badge variant="outline" className="ml-2 text-xs">推荐</Badge>
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={handleExtraBonusImport} disabled={extraBonusImportLoading} className="hidden" />
                    {extraBonusImportLoading ? '导入中...' : '📥 导入额外加分'}
                  </label>
                  <Button onClick={handleShowExtraBonusTable} variant="outline" className="border-indigo-500 text-indigo-600">
                    {showExtraBonusTable ? '隐藏额外加分表' : '👁️ 查看额外加分表'}
                  </Button>
                  <Button onClick={handleClearExtraBonusTable} variant="outline" className="border-red-500 text-red-600">
                    🗑️ 清空额外加分表
                  </Button>
                </div>
                {showExtraBonusTable && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">额外加分数据（共 {extraBonusData.length} 条）</h4>
                    <div className="max-h-64 overflow-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>学号</TableHead><TableHead>分数</TableHead><TableHead>更新时间</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {extraBonusData.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.bupt_student_id}</TableCell>
                              <TableCell className="font-medium text-indigo-600">{item.bonus_score}</TableCell>
                              <TableCell className="text-sm text-gray-500">{item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN') : '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {extraBonusData.length === 0 && <p className="text-center py-4 text-gray-500">暂无数据</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== Tab 3: 数据导出 ==================== */}
          <TabsContent value="export" className="space-y-6">
            <Card className="border-green-200">
              <CardHeader className="bg-green-50">
                <CardTitle className="flex items-center text-green-700">
                  <Download className="h-5 w-5 mr-2" />
                  数据导出管理
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-700 mb-6">导出论文、专利和竞赛的完整数据表格，包含所有字段信息。</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* 论文数据导出 */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">📄 论文数据</h4>
                    <p className="text-xs text-gray-600 mb-3">包含学号、姓名、论文标题、期刊信息、作者类型、审核状态、答辩状态等</p>
                    <Button onClick={handleExportPapers} variant="outline" className="w-full border-blue-500 text-blue-600 hover:bg-blue-100">
                      导出论文数据
                    </Button>
                  </div>

                  {/* 专利数据导出 */}
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="text-sm font-medium text-purple-800 mb-2">🔬 专利数据</h4>
                    <p className="text-xs text-gray-600 mb-3">包含学号、姓名、专利名称、专利号、专利权人类别、审核状态、答辩状态等</p>
                    <Button onClick={handleExportPatents} variant="outline" className="w-full border-purple-500 text-purple-600 hover:bg-purple-100">
                      导出专利数据
                    </Button>
                  </div>

                  {/* 竞赛数据导出 */}
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h4 className="text-sm font-medium text-orange-800 mb-2">🏆 竞赛数据</h4>
                    <p className="text-xs text-gray-600 mb-3">包含学号、姓名、竞赛名称、竞赛级别、竞赛类型、团队信息、审核状态等</p>
                    <Button onClick={handleExportCompetitions} variant="outline" className="w-full border-orange-500 text-orange-600 hover:bg-orange-100">
                      导出竞赛数据
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 推免加分总表导出 */}
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="text-sm font-medium text-red-800 mb-2">📊 推免加分总表</h4>
                    <p className="text-xs text-gray-600 mb-3">包含学号、姓名、班级、论文分数、专利分数、竞赛分数、总加分等</p>
                    <div className="flex gap-2">
                      <Button onClick={handleExportMoralScores} variant="outline" className="flex-1 border-red-500 text-red-600 hover:bg-red-100">
                        导出CSV
                      </Button>
                      <Button onClick={handleExportMoralScoresExcel} variant="outline" className="flex-1 border-red-500 text-red-600 hover:bg-red-100">
                        导出Excel
                      </Button>
                    </div>
                  </div>

                  {/* 额外加分导出 */}
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <h4 className="text-sm font-medium text-indigo-800 mb-2">⭐ 额外加分数据</h4>
                    <p className="text-xs text-gray-600 mb-3">包含学号、额外加分分数、更新时间等</p>
                    <Button onClick={handleExportExtraBonus} variant="outline" className="w-full border-indigo-500 text-indigo-600 hover:bg-indigo-100">
                      导出额外加分
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== Tab 4: 排名管理 ==================== */}
          <TabsContent value="ranking" className="space-y-6">
            <Card className="border-red-200">
              <CardHeader className="bg-red-50">
                <CardTitle className="flex items-center text-red-700">
                  <Trophy className="h-5 w-5 mr-2" />
                  综合排名管理
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">选择导出专业</label>
                  <select value={exportProgramme} onChange={(e) => setExportProgramme(e.target.value)}
                    className="w-full max-w-xs p-2 border rounded-md">
                    <option value="all">全部专业</option>
                    <option value="智能科学与技术">智能科学与技术</option>
                    <option value="电子信息工程">电子信息工程</option>
                    <option value="电信工程及管理">电信工程及管理</option>
                    <option value="物联网工程">物联网工程</option>
                  </select>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button onClick={handleGenerateRanking} disabled={rankingGenerateLoading} className="bg-red-600 hover:bg-red-700">
                    {rankingGenerateLoading ? '生成中...' : '🔄 生成综合排名'}
                  </Button>
                  <Button onClick={handleShowRankingTable} variant="outline" className="border-red-500 text-red-600">
                    {showRankingTable ? '隐藏综合排名' : '👁️ 查看综合排名'}
                  </Button>
                  <Button onClick={handleExportRanking} variant="outline" className="border-purple-500 text-purple-600">
                    导出CSV
                  </Button>
                  <Button onClick={handleExportRankingExcel} variant="outline" className="border-green-500 text-green-600">
                    导出Excel
                  </Button>
                </div>

                {showRankingTable && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-4 mb-4">
                      <label className="text-sm font-medium">专业选择：</label>
                      <select value={rankingProgrammeFilter} onChange={(e) => setRankingProgrammeFilter(e.target.value)}
                        className="px-3 py-1 border rounded-md text-sm">
                        <option value="all">全部专业</option>
                        {availableProgrammes.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>综合排名</TableHead><TableHead>学号</TableHead><TableHead>姓名</TableHead><TableHead>专业</TableHead>
                          <TableHead>智育成绩</TableHead><TableHead>推免加分</TableHead><TableHead>综合成绩</TableHead><TableHead>排名百分比</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRankings.map((r, i) => (
                          <TableRow key={r.id || i}>
                            <TableCell>
                              {r.overall_rank === 1 && '🥇'}{r.overall_rank === 2 && '🥈'}{r.overall_rank === 3 && '🥉'}
                              <Badge variant={r.overall_rank <= 3 ? "default" : "secondary"}>第 {r.overall_rank} 名</Badge>
                            </TableCell>
                            <TableCell className="font-mono">{r.bupt_student_id}</TableCell>
                            <TableCell>{r.full_name}</TableCell>
                            <TableCell>{r.programme || '-'}</TableCell>
                            <TableCell><Badge variant="outline" className="bg-blue-50">{r.academic_weighted_average}</Badge></TableCell>
                            <TableCell><Badge variant="outline" className="bg-green-50">+{r.practice_extra_points}</Badge></TableCell>
                            <TableCell><Badge className="bg-purple-600">{r.academic_practice_total}</Badge></TableCell>
                            <TableCell><Badge variant="outline">{r.overall_rank_percentage}%</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredRankings.length === 0 && <p className="text-center py-4 text-gray-500">暂无数据</p>}
                    
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">综测计算规则：</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• <strong>智育成绩</strong>：学生的加权均分</li>
                        <li>• <strong>推免加分</strong>：论文、专利、竞赛的实践活动加分（最高4分）</li>
                        <li>• <strong>综合成绩</strong>：智育成绩 + 推免加分</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== Tab 5: 系统设置 ==================== */}
          <TabsContent value="settings" className="space-y-6">
            {/* 截止时间管理 */}
            <Card className="border-orange-200">
              <CardHeader className="bg-orange-50">
                <CardTitle className="flex items-center text-orange-700">
                  <Clock className="h-5 w-5 mr-2" />
                  ⏰ 提交截止时间管理
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-700 mb-4">设置截止时间后，学生将无法在个人页面新增或修改论文、专利和竞赛记录。</p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">截止时间限制状态：</label>
                    <Button onClick={handleToggleDeadlineEnabled} disabled={deadlineLoading}
                      className={`${isDeadlineEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'}`}>
                      {deadlineLoading ? '切换中...' : isDeadlineEnabled ? (<><CheckCircle className="h-4 w-4 mr-2" />已启用</>) : (<><XCircle className="h-4 w-4 mr-2" />已禁用</>)}
                    </Button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">截止时间</label>
                    <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                      className="w-full max-w-md p-2 border rounded-md" />
                    <p className="text-xs text-gray-500 mt-1">
                      {deadline ? `学生将在 ${new Date(deadline).toLocaleString('zh-CN')} 后无法修改记录` : '请选择截止时间'}
                    </p>
                  </div>
                  
                  <Button onClick={handleSaveDeadline} disabled={deadlineLoading || !deadline} variant="outline" className="border-orange-500 text-orange-600">
                    {deadlineLoading ? '保存中...' : '💾 保存截止时间'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 数据备份与恢复 */}
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center text-blue-700">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  数据备份与恢复
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-700 mb-4">管理推免加分总表的备份和恢复操作。</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button onClick={handleCreateBackup} variant="outline" disabled={backupLoading} className="border-blue-500 text-blue-600">
                    {backupLoading ? '创建中...' : '💾 创建备份'}
                  </Button>
                  <Button onClick={handleRollback} variant="outline" disabled={backupLoading} className="border-yellow-500 text-yellow-600">
                    {backupLoading ? '回退中...' : '↩️ 回退到备份'}
                  </Button>
                  <Button onClick={loadBackupStatus} variant="outline" disabled={backupLoading} className="border-gray-500 text-gray-600">
                    🔄 查看备份状态
                  </Button>
                </div>

                {backupStatus && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-600 mb-1">当前数据</div>
                      <div className="text-2xl font-bold text-blue-800">{backupStatus.currentCount} 条</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-green-600 mb-1">备份数据</div>
                      <div className="text-2xl font-bold text-green-800">{backupStatus.backupCount} 条</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 危险操作区 */}
            <Card className="border-red-200">
              <CardHeader className="bg-red-50">
                <CardTitle className="flex items-center text-red-700">
                  <Trash2 className="h-5 w-5 mr-2" />
                  ⚠️ 危险操作区
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-red-800 mb-4">
                  <strong>警告：</strong>以下操作不可撤销，请谨慎操作！建议在执行前先创建备份。
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleClearMoralTable} variant="destructive" disabled={clearMoralTableLoading}>
                    {clearMoralTableLoading ? '清空中...' : '🗑️ 清空推免加分总表'}
                  </Button>
                  <Button onClick={handleClearExtraBonusTable} variant="outline" className="border-red-500 text-red-600">
                    🗑️ 清空额外加分表
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 论文编辑表单 */}
      {showPaperEditForm && editingPaper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">编辑论文信息</h3>
              <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleSavePaper}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">论文标题</label>
                  <input name="paper_title" type="text" required className="w-full p-2 border rounded-md" defaultValue={editingPaper.paper_title || ""} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">期刊名称</label>
                  <input name="journal_name" type="text" className="w-full p-2 border rounded-md" defaultValue={editingPaper.journal_name || ""} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">期刊类别</label>
                  <select name="journal_category" className="w-full p-2 border rounded-md" defaultValue={editingPaper.journal_category || ""}>
                    <option value="">请选择期刊类别</option>
                    <option value="SCI">SCI</option>
                    <option value="EI">EI</option>
                    <option value="CSCD">CSCD</option>
                    <option value="核心期刊">核心期刊</option>
                    <option value="普通期刊">普通期刊</option>
                    <option value="会议论文">会议论文</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">作者类型</label>
                  <select name="author_type" className="w-full p-2 border rounded-md" defaultValue={editingPaper.author_type || ""}>
                    <option value="">请选择作者类型</option>
                    <option value="独立作者">独立作者</option>
                    <option value="第一作者">第一作者</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">发表日期</label>
                  <input name="publish_date" type="month" max={new Date().toISOString().slice(0, 7)} className="w-full p-2 border rounded-md" defaultValue={editingPaper.publish_date || ""} />
                  <p className="text-xs text-gray-500 mt-1">只能选择当月或之前的日期</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">备注</label>
                  <textarea name="note" className="w-full p-2 border rounded-md" rows={3} defaultValue={editingPaper.note || ""} placeholder="请输入备注信息" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">分数</label>
                  <input name="score" type="number" step="0.01" className="w-full p-2 border rounded-md" defaultValue={formatScore(editingPaper.score)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={handleCancelEdit}>取消</Button>
                <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 专利编辑表单 */}
      {showPatentEditForm && editingPatent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">编辑专利信息</h3>
              <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleSavePatent}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">专利名称</label>
                  <input name="patent_name" type="text" required className="w-full p-2 border rounded-md" defaultValue={editingPatent.patent_name || ""} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">专利号</label>
                  <input name="patent_number" type="text" className="w-full p-2 border rounded-md" defaultValue={editingPatent.patent_number || ""} placeholder="请输入专利号" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">申请日期</label>
                  <input name="patent_date" type="month" max={new Date().toISOString().slice(0, 7)} className="w-full p-2 border rounded-md" defaultValue={editingPatent.patent_date || ""} />
                  <p className="text-xs text-gray-500 mt-1">只能选择当月或之前的日期</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">答辩状态</label>
                  <select name="defense_status" className="w-full p-2 border rounded-md" defaultValue={editingPatent.defense_status || "pending"}>
                    <option value="pending">待答辩</option>
                    <option value="passed">已通过</option>
                    <option value="failed">未通过</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">专利权人类别</label>
                  <select name="category_of_patent_owner" className="w-full p-2 border rounded-md" defaultValue={editingPatent.category_of_patent_owner || ""}>
                    <option value="">请选择专利权人类别</option>
                    <option value="独立发明人">独立发明人</option>
                    <option value="第一发明人（多人）">第一发明人（多人）</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">备注</label>
                  <textarea name="note" className="w-full p-2 border rounded-md" rows={3} defaultValue={editingPatent.note || ""} placeholder="请输入备注信息" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">分数</label>
                  <input name="score" type="number" step="0.01" className="w-full p-2 border rounded-md" defaultValue={formatScore(editingPatent.score)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={handleCancelEdit}>取消</Button>
                <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 竞赛编辑表单 */}
      <CompetitionForm
        isOpen={showCompetitionEditForm}
        onClose={handleCancelEdit}
        onSubmit={handleSaveCompetition}
        editingRecord={editingCompetition ? {
          id: editingCompetition.id,
          competition_region: editingCompetition.competition_region,
          competition_level: editingCompetition.competition_level,
          competition_name: editingCompetition.competition_name,
          bupt_student_id: editingCompetition.bupt_student_id,
          full_name: editingCompetition.full_name,
          note: editingCompetition.note,
          score: editingCompetition.score,
          colorIndex: 0,
          award_type: (editingCompetition as any).award_type,
          award_value: (editingCompetition as any).award_value,
          competition_type: (editingCompetition as any).competition_type,
          team_leader_is_bupt: (editingCompetition as any).team_leader_is_bupt,
          is_main_member: (editingCompetition as any).is_main_member,
          main_members_count: (editingCompetition as any).main_members_count,
          coefficient: (editingCompetition as any).coefficient
        } : null}
        studentId={editingCompetition?.bupt_student_id || ''}
        studentName={editingCompetition?.full_name || ''}
        loading={loading}
        adminMode={true}
      />
    </AdminLayout>
  )
}
