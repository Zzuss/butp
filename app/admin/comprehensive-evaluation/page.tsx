"use client"

import React, { useState } from 'react'
import { Search, FileText, Award, Edit, Save, X, Check, Trophy, BookOpen, CheckCircle, XCircle, Clock, RotateCcw, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import * as XLSX from 'xlsx'
import AdminLayout from '@/components/admin/AdminLayout'

interface Paper {
  id: string
  paper_title: string
  journal_name: string
  journal_category: string
  bupt_student_id: string
  full_name: string
  phone_number: string | null  // 修改：class → phone_number
  author_type: string
  publish_date: string | null
  note?: string
  score: string | number  // 数据库中是text类型，但可能包含数字字符串
  approval_status: 'pending' | 'approved' | 'rejected'  // 审核状态
  defense_status?: 'pending' | 'passed' | 'failed'  // 答辩状态
  created_at: string
  updated_at: string
}

interface Patent {
  id: string
  patent_name: string
  patent_number?: string
  patent_date: string | null
  bupt_student_id: string
  phone_number: string | null  // 修改：class → phone_number
  full_name: string
  category_of_patent_owner: string
  note?: string
  score: string | number  // 数据库中是text类型，但可能包含数字字符串
  approval_status: 'pending' | 'approved' | 'rejected'  // 审核状态
  defense_status?: 'pending' | 'passed' | 'failed'  // 新增：答辩状态
  created_at: string
  updated_at: string
}

interface Competition {
  id: string
  competition_region: string
  competition_level: string
  competition_name: string
  competition_type: string
  bupt_student_id: string
  full_name: string
  phone_number: string | null  // 修改：class → phone_number
  note: string
  score: number
  approval_status: 'pending' | 'approved' | 'rejected'  // 审核状态
  created_at: string
  updated_at: string
}

interface StudentData {
  studentId: string
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
  overall_approval_status: 'pending' | 'approved' | 'rejected'  // 学生整体审核状态
}

interface ComprehensiveScore {
  id: string
  bupt_student_id: string
  class: string  // 注意：这里保持 class，因为是学生基本信息中的班级
  full_name: string
  paper_score: number
  patent_score: number
  competition_score: number
  paper_patent_total: number
  total_score: number
  created_at: string
  updated_at: string
}

// 解析额外加分文件（简化版，只支持学号和分数两列）
const parseExtraBonusFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    console.log('开始解析额外加分文件:', file.name)
    
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('文件读取结果为空'))
          return
        }
        
        let workbook: XLSX.WorkBook
        
        if (file.name.endsWith('.csv')) {
          workbook = XLSX.read(data, { type: 'binary' })
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          workbook = XLSX.read(data, { type: 'array' })
        } else {
          reject(new Error('不支持的文件格式，请上传CSV或Excel文件'))
          return
        }
        
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        if (!worksheet) {
          reject(new Error('工作表为空'))
          return
        }
        
        // 转换为JSON数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        console.log('额外加分文件JSON数据行数:', jsonData.length)
        
        if (jsonData.length < 2) {
          reject(new Error('文件内容为空或格式不正确，至少需要表头和一行数据'))
          return
        }
        
        // 第一行是表头
        const headers = (jsonData[0] as any[]).map(h => h ? h.toString().trim() : '')
        console.log('额外加分表头:', headers)
        
        // 从第二行开始是数据
        const rows = jsonData.slice(1)
        
        // 查找学号和分数列的索引
        let studentIdIndex = -1
        let scoreIndex = -1
        
        headers.forEach((header, index) => {
          if (header === '学号' || header === 'bupt_student_id') {
            studentIdIndex = index
          }
          if (header === '分数' || header === '额外加分' || header === 'bonus_score') {
            scoreIndex = index
          }
        })
        
        if (studentIdIndex === -1) {
          reject(new Error('未找到"学号"列，请确保表头包含"学号"'))
          return
        }
        
        if (scoreIndex === -1) {
          reject(new Error('未找到"分数"列，请确保表头包含"分数"'))
          return
        }
        
        // 解析数据
        const parsedData = rows.map((row: unknown) => {
          const rowArray = row as any[]
          return {
            bupt_student_id: rowArray[studentIdIndex]?.toString().trim() || '',
            bonus_score: parseFloat(rowArray[scoreIndex]?.toString() || '0') || 0
          }
        }).filter(item => item.bupt_student_id) // 过滤掉学号为空的行
        
        console.log('额外加分解析完成，有效数据行数:', parsedData.length)
        console.log('额外加分数据示例:', parsedData.slice(0, 2))
        
        if (parsedData.length === 0) {
          reject(new Error('没有找到有效的数据行，请检查学号列是否为空'))
          return
        }
        
        resolve(parsedData)
      } catch (error) {
        console.error('额外加分文件解析错误:', error)
        reject(new Error('文件解析失败: ' + (error instanceof Error ? error.message : '未知错误')))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    
    if (file.name.endsWith('.csv')) {
      reader.readAsBinaryString(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}

// 解析智育成绩文件（支持CSV和Excel）
const parseAcademicFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    console.log('开始解析文件:', file.name, '大小:', file.size, '类型:', file.type)
    
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('文件读取结果为空'))
          return
        }
        
        console.log('文件读取成功，数据长度:', typeof data === 'string' ? data.length : (data as ArrayBuffer).byteLength)
        
        let workbook: XLSX.WorkBook
        
        if (file.name.endsWith('.csv')) {
          // 处理CSV文件
          workbook = XLSX.read(data, { type: 'binary' })
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          // 处理Excel文件
          workbook = XLSX.read(data, { type: 'array' })
        } else {
          reject(new Error('不支持的文件格式，请上传CSV或Excel文件'))
          return
        }
        
        console.log('工作簿解析成功，工作表数量:', workbook.SheetNames.length)
        console.log('工作表名称:', workbook.SheetNames)
        
        // 获取第一个工作表
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        if (!worksheet) {
          reject(new Error('工作表为空'))
          return
        }
        
        // 转换为JSON数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        console.log('JSON数据行数:', jsonData.length)
        console.log('前3行数据:', jsonData.slice(0, 3))
        
        if (jsonData.length < 2) {
          reject(new Error('文件内容为空或格式不正确，至少需要表头和一行数据'))
          return
        }
        
        // 检测并处理合并表头
        let headers: string[] = []
        let dataStartRow = 1
        
        // 智能处理合并表头（前两行）
        const firstRow = jsonData[0] as any[]
        const secondRow = jsonData[1] as any[]
        
        console.log('第一行:', firstRow)
        console.log('第二行:', secondRow)
        
        // 详细调试信息
        console.log('第一行详细信息:')
        firstRow.forEach((cell, index) => {
          console.log(`  列${index}: "${cell}" (类型: ${typeof cell}, 长度: ${cell ? cell.toString().length : 0})`)
        })
        
        if (secondRow) {
          console.log('第二行详细信息:')
          secondRow.forEach((cell, index) => {
            console.log(`  列${index}: "${cell}" (类型: ${typeof cell}, 长度: ${cell ? cell.toString().length : 0})`)
          })
        }
        
        // 智能合并表头处理算法
        const processMergedHeaders = (row1: any[], row2: any[]): string[] => {
          const result: string[] = []
          
          console.log('开始智能处理合并表头...')
          
          // 遍历每一列
          for (let i = 0; i < Math.max(row1.length, row2?.length || 0); i++) {
            const cell1 = row1[i] ? row1[i].toString().trim() : ''
            const cell2 = row2 && row2[i] ? row2[i].toString().trim() : ''
            
            console.log(`列${i}: 第一行="${cell1}", 第二行="${cell2}"`)
            
            // 情况1: 如果第一行和第二行都有内容，且不同，说明是合并表头
            if (cell1 && cell2 && cell1 !== cell2) {
              // 如果第一行是合并的大类标题，第二行是具体字段，使用第二行
              result.push(cell2)
              console.log(`  → 使用第二行作为表头: "${cell2}"`)
            }
            // 情况2: 如果第一行有内容，第二行为空，说明是跨行合并
            else if (cell1 && !cell2) {
              result.push(cell1)
              console.log(`  → 使用第一行作为表头（跨行合并）: "${cell1}"`)
            }
            // 情况3: 如果第一行为空，第二行有内容
            else if (!cell1 && cell2) {
              result.push(cell2)
              console.log(`  → 使用第二行作为表头: "${cell2}"`)
            }
            // 情况4: 如果两行内容相同，使用任意一行
            else if (cell1 && cell2 && cell1 === cell2) {
              result.push(cell1)
              console.log(`  → 两行相同，使用第一行: "${cell1}"`)
            }
            // 情况5: 都为空，跳过
            else if (!cell1 && !cell2) {
              console.log(`  → 两行都为空，跳过`)
              continue
            }
            // 默认情况
            else {
              const header = cell1 || cell2 || `列${i}`
              result.push(header)
              console.log(`  → 默认使用: "${header}"`)
            }
          }
          
          console.log('合并表头处理完成，最终表头:', result)
          return result
        }
        
        headers = processMergedHeaders(firstRow, secondRow)
        dataStartRow = 2 // 合并表头情况下，数据从第三行开始
        
        console.log('智能处理后的表头:', headers)
        
        const rows = jsonData.slice(dataStartRow)
        
        // 字段映射表：中文/英文表头 -> 数据库字段名
        const fieldMapping: { [key: string]: string } = {
          // 中文表头映射
          '学号': 'bupt_student_id',
          '姓名': 'full_name',
          '上课院系': 'school',
          '学生校区': 'campus',
          '专业名称': 'programme',
          '班级名称': 'class',
          '培养层次': 'degree_category',
          '所修总门数': 'total_diet',
          '所修总学分': 'total_credits',
          '所得学分': 'taken_credits',
          '未得学分': 'untaken_credits',
          '加权均分': 'weighted_average',
          '平均学分绩点': 'gpa',
          '专业排名': 'programme_rank',
          '专业排名总人数': 'programme_total',
          // 额外加分表头映射
          '分数': 'bonus_score',
          '额外加分': 'bonus_score',
          '备注': 'note',
          // 英文表头映射（保持向后兼容）
          'BUPT Student ID': 'bupt_student_id',
          'Full name': 'full_name',
          'School': 'school',
          'Campus': 'campus',
          'Programme': 'programme',
          'Class': 'class',
          'Degree Category': 'degree_category',
          'Total Diet': 'total_diet',
          'Total Credits': 'total_credits',
          'Taken Credits': 'taken_credits',
          'Untaken Credits': 'untaken_credits',
          'Weighted Average': 'weighted_average',
          'GPA': 'gpa',
          'Pragramme Rank': 'programme_rank',
          'Programme Total': 'programme_total'
        }
        
        // 转换为对象数组
        const parsedData = rows.map((row: unknown) => {
          const rowArray = row as any[]
          const obj: any = {}
          headers.forEach((header, index) => {
            if (header && header.trim()) {
              // 清理表头：只去除首尾空格
              const cleanedHeader = header.trim()
              
              // 使用映射表转换字段名，如果没有映射则保持原名
              const dbFieldName = fieldMapping[cleanedHeader] || cleanedHeader
              
              // 详细调试信息
              if (index < 15) { // 只显示前15列避免日志过多
                console.log(`字段映射 - 原始: "${header}" -> 清理后: "${cleanedHeader}" -> 数据库字段: "${dbFieldName}" -> 值: "${rowArray[index]}"`)
              }
              
              obj[dbFieldName] = rowArray[index]
            }
          })
          return obj
        }).filter(row => {
          // 检查是否有学号字段（支持多种可能的字段名）
          const hasStudentId = (row.bupt_student_id || row.学号) && 
                               (row.bupt_student_id || row.学号).toString().trim()
          console.log('行数据:', row, '有学号:', hasStudentId)
          return hasStudentId
        })
        
        console.log('解析完成，有效数据行数:', parsedData.length)
        console.log('解析后的数据示例:', parsedData.slice(0, 2))
        
        if (parsedData.length === 0) {
          console.error('解析失败 - 表头:', headers)
          console.error('解析失败 - 原始行数:', rows.length)
          console.error('解析失败 - 字段映射结果:', rows.slice(0, 2).map((row: unknown) => {
            const rowArray = row as any[]
            const obj: any = {}
            headers.forEach((header, index) => {
              if (header && header.trim()) {
                const cleanedHeader = header.trim()
                const dbFieldName = fieldMapping[cleanedHeader] || cleanedHeader
                obj[dbFieldName] = rowArray[index]
              }
            })
            return obj
          }))
          reject(new Error('没有找到有效的数据行。请确保：1) 表头包含"学号"列 2) 数据行中学号不为空'))
          return
        }
        
        resolve(parsedData)
      } catch (error) {
        console.error('文件解析错误:', error)
        reject(new Error('文件解析失败: ' + (error instanceof Error ? error.message : '未知错误')))
      }
    }
    
    reader.onerror = () => {
      console.error('文件读取错误')
      reject(new Error('文件读取失败'))
    }
    
    if (file.name.endsWith('.csv')) {
      reader.readAsBinaryString(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}

// 解析推免加分总表文件（支持CSV和Excel）
const parseMoralEducationFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    console.log('开始解析推免加分总表文件:', file.name, '大小:', file.size, '类型:', file.type)
    
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('文件读取结果为空'))
          return
        }
        
        let workbook: XLSX.WorkBook
        
        if (file.name.endsWith('.csv')) {
          workbook = XLSX.read(data, { type: 'binary' })
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          workbook = XLSX.read(data, { type: 'array' })
        } else {
          reject(new Error('不支持的文件格式，请上传CSV或Excel文件'))
          return
        }
        
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        if (!worksheet) {
          reject(new Error('工作表为空'))
          return
        }
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        if (jsonData.length < 2) {
          reject(new Error('文件内容为空或格式不正确，至少需要表头和一行数据'))
          return
        }
        
        // 检测并处理合并表头
        let headers: string[] = []
        let dataStartRow = 1
        
        // 检查是否有合并表头（前两行）
        const firstRow = jsonData[0] as any[]
        const secondRow = jsonData[1] as any[]
        
        console.log('推免加分表第一行:', firstRow)
        console.log('推免加分表第二行:', secondRow)
        
        // 如果第一行有很多空值，可能是合并表头，使用第二行作为表头
        const firstRowEmptyCount = firstRow.filter(cell => !cell || cell.toString().trim() === '').length
        const firstRowTotalCount = firstRow.length
        
        if (firstRowEmptyCount > firstRowTotalCount * 0.5 && secondRow && secondRow.length > 0) {
          // 第一行空值过多，可能是合并表头，使用第二行
          headers = secondRow.map(cell => cell ? cell.toString() : '')
          dataStartRow = 2
          console.log('推免加分表检测到合并表头，使用第二行作为表头:', headers)
        } else {
          // 使用第一行作为表头
          headers = firstRow.map(cell => cell ? cell.toString() : '')
          dataStartRow = 1
          console.log('推免加分表使用第一行作为表头:', headers)
        }
        
        const rows = jsonData.slice(dataStartRow)
        
        // 推免加分总表字段映射
        const moralFieldMapping: { [key: string]: string } = {
          // 中文表头映射
          '学号': 'bupt_student_id',
          '姓名': 'full_name',
          '班级': 'class',
          '手机号': 'phone_number',
          '论文分数': 'paper_score',
          '专利分数': 'patent_score',
          '竞赛分数': 'competition_score',
          '论文+专利小计': 'paper_patent_total',
          '总加分': 'total_score',
          // 英文表头映射（保持向后兼容）
          'BUPT Student ID': 'bupt_student_id',
          'Full Name': 'full_name',
          'Class': 'class',
          'Phone Number': 'phone_number',
          'Paper Score': 'paper_score',
          'Patent Score': 'patent_score',
          'Competition Score': 'competition_score',
          'Paper Patent Total': 'paper_patent_total',
          'Total Score': 'total_score'
        }
        
        const parsedData = rows.map((row: unknown) => {
          const rowArray = row as any[]
          const obj: any = {}
          headers.forEach((header, index) => {
            if (header && header.trim()) {
              const trimmedHeader = header.trim()
              const dbFieldName = moralFieldMapping[trimmedHeader] || trimmedHeader
              obj[dbFieldName] = rowArray[index]
            }
          })
          return obj
        }).filter(row => {
          const hasStudentId = row.bupt_student_id && row.bupt_student_id.toString().trim()
          return hasStudentId
        })
        
        console.log('推免加分总表解析完成，有效数据行数:', parsedData.length)
        
        if (parsedData.length === 0) {
          reject(new Error('没有找到有效的数据行，请检查文件格式和学号字段'))
          return
        }
        
        resolve(parsedData)
      } catch (error) {
        console.error('推免加分总表文件解析错误:', error)
        reject(new Error('文件解析失败: ' + (error instanceof Error ? error.message : '未知错误')))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    
    if (file.name.endsWith('.csv')) {
      reader.readAsBinaryString(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}

export default function GradeRecommendationPage() {
  const [studentId, setStudentId] = useState('')
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingScores, setEditingScores] = useState<{ [key: string]: string }>({})
  const [approvalLoading, setApprovalLoading] = useState<{ [key: string]: boolean }>({})
  const [defenseLoading, setDefenseLoading] = useState<{ [key: string]: boolean }>({})

  // 记录编辑相关状态
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null)
  const [editingPatent, setEditingPatent] = useState<Patent | null>(null)
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null)
  const [showPaperEditForm, setShowPaperEditForm] = useState(false)
  const [showPatentEditForm, setShowPatentEditForm] = useState(false)
  const [showCompetitionEditForm, setShowCompetitionEditForm] = useState(false)
  
  // 额外加分编辑状态
  const [editingExtraBonus, setEditingExtraBonus] = useState(false)
  const [extraBonusScore, setExtraBonusScore] = useState<string>('')

  // 竞赛表单字段状态
  const [competitionFormData, setCompetitionFormData] = useState({
    competition_name: '',
    competition_region: '',
    competition_level: '',
    phone_number: '',
    note: '',
    score: ''
  })

  // 总加分表相关状态
  const [showScoreTable, setShowScoreTable] = useState(false)
  const [comprehensiveScores, setComprehensiveScores] = useState<ComprehensiveScore[]>([])

  // 智育成绩相关状态
  const [academicScores, setAcademicScores] = useState<any[]>([])
  const [showAcademicTable, setShowAcademicTable] = useState(false)
  const [academicImportLoading, setAcademicImportLoading] = useState(false)
  const [importMode, setImportMode] = useState<'append' | 'replace'>('replace')
  
  // 综合排名相关状态
  const [comprehensiveRankings, setComprehensiveRankings] = useState<any[]>([])
  const [showRankingTable, setShowRankingTable] = useState(false)
  const [rankingGenerateLoading, setRankingGenerateLoading] = useState(false)

  // 推免加分总表导入相关状态
  const [moralImportLoading, setMoralImportLoading] = useState(false)
  const [moralImportMode, setMoralImportMode] = useState<'append' | 'replace'>('replace')
  const [validationResult, setValidationResult] = useState<any>(null)
  const [showValidationResult, setShowValidationResult] = useState(false)
  const [clearMoralTableLoading, setClearMoralTableLoading] = useState(false)

  // 简单备份相关状态
  const [backupStatus, setBackupStatus] = useState<any>(null)
  const [backupLoading, setBackupLoading] = useState(false)

  // 专业过滤器相关状态
  const [academicProgrammeFilter, setAcademicProgrammeFilter] = useState<string>('智能科学与技术')
  const [rankingProgrammeFilter, setRankingProgrammeFilter] = useState<string>('智能科学与技术')
  const [availableProgrammes, setAvailableProgrammes] = useState<string[]>([])
  
  // 截止时间管理相关状态
  const [deadline, setDeadline] = useState<string>('')
  const [isDeadlineEnabled, setIsDeadlineEnabled] = useState(false)
  const [deadlineLoading, setDeadlineLoading] = useState(false)
  
  // 导出专业选择状态
  const [exportProgramme, setExportProgramme] = useState<string>('all')
  
  // 额外加分相关状态
  const [extraBonusData, setExtraBonusData] = useState<any[]>([])
  const [showExtraBonusTable, setShowExtraBonusTable] = useState(false)
  const [extraBonusImportLoading, setExtraBonusImportLoading] = useState(false)
  const [extraBonusImportMode, setExtraBonusImportMode] = useState<'append' | 'replace'>('replace')
  
  // 审核相关状态已在上面定义

  // 编辑记录处理函数
  const handleEditPaper = (paper: Paper) => {
    setEditingPaper(paper)
    setShowPaperEditForm(true)
  }

  const handleEditPatent = (patent: Patent) => {
    setEditingPatent(patent)
    setShowPatentEditForm(true)
  }

  const handleEditCompetition = (competition: Competition) => {
    console.log('编辑竞赛记录:', competition)
    console.log('竞赛级别:', competition.competition_level)
    setEditingCompetition(competition)
    // 初始化表单数据
    setCompetitionFormData({
      competition_name: competition.competition_name || '',
      competition_region: competition.competition_region || '',
      competition_level: competition.competition_level || '',
      phone_number: competition.phone_number || '',
      note: competition.note || '',
      score: competition.score?.toString() || ''
    })
    setShowCompetitionEditForm(true)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingPaper(null)
    setEditingPatent(null)
    setEditingCompetition(null)
    setShowPaperEditForm(false)
    setShowPatentEditForm(false)
    setShowCompetitionEditForm(false)
    // 清空竞赛表单数据
    setCompetitionFormData({
      competition_name: '',
      competition_region: '',
      competition_level: '',
      phone_number: '',
      note: '',
      score: ''
    })
  }

  // 保存论文编辑
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
        phone_number: formData.get('phone_number') as string,  // 修改：class → phone_number
        author_type: formData.get('author_type') as string,
        publish_date: (formData.get('publish_date') as string) || null,
        note: formData.get('note') as string,
        score: parseFloat(formData.get('score') as string) || 0,
      }

      // 调用保存API
      const response = await fetch('/api/admin/update-paper', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPaper)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('论文保存API错误:', errorData)
        throw new Error(errorData.error || `保存失败 (${response.status})`)
      }

      // 更新本地状态
      setStudentData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          papers: prev.papers.map(paper => 
            paper.id === editingPaper.id ? updatedPaper : paper
          )
        }
      })

      setSuccess('论文信息保存成功')
      setTimeout(() => setSuccess(''), 3000)
      handleCancelEdit()
    } catch (err) {
      console.error('保存论文失败:', err)
      setError(err instanceof Error ? err.message : '保存论文失败')
    } finally {
      setLoading(false)
    }
  }

  // 保存专利编辑
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
        phone_number: formData.get('phone_number') as string,  // 修改：class → phone_number
        category_of_patent_owner: formData.get('category_of_patent_owner') as string,
        defense_status: formData.get('defense_status') as 'pending' | 'passed' | 'failed',  // 新增：答辩状态
        note: formData.get('note') as string,
        score: parseFloat(formData.get('score') as string) || 0,
      }

      console.log('发送专利更新数据:', updatedPatent)

      // 调用保存API
      const response = await fetch('/api/admin/update-patent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPatent)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('专利保存API错误:', errorData)
        throw new Error(errorData.error || `保存失败 (${response.status})`)
      }

      // 更新本地状态
      setStudentData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          patents: prev.patents.map(patent => 
            patent.id === editingPatent.id ? updatedPatent : patent
          )
        }
      })

      setSuccess('专利信息保存成功')
      setTimeout(() => setSuccess(''), 3000)
      handleCancelEdit()
    } catch (err) {
      console.error('保存专利失败:', err)
      setError(err instanceof Error ? err.message : '保存专利失败')
    } finally {
      setLoading(false)
    }
  }

  // 保存竞赛编辑
  const handleSaveCompetition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingCompetition) return

    setLoading(true)
    try {
      // 验证必填字段
      if (!competitionFormData.competition_level || competitionFormData.competition_level.trim() === '') {
        setError('请选择竞赛级别');
        setLoading(false);
        return;
      }
      
      const updatedCompetition = {
        ...editingCompetition,
        competition_name: competitionFormData.competition_name,
        competition_region: competitionFormData.competition_region,
        competition_level: competitionFormData.competition_level,
        phone_number: competitionFormData.phone_number || null,
        note: competitionFormData.note,
        score: parseFloat(competitionFormData.score) || 0,
      }

      console.log('保存竞赛数据:', updatedCompetition)

      // 调用保存API
      const response = await fetch('/api/admin/update-competition', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCompetition)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '保存失败')
      }

      // 更新本地状态
      setStudentData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          competitions: prev.competitions.map(competition => 
            competition.id === editingCompetition.id ? updatedCompetition : competition
          )
        }
      })

      setSuccess('竞赛信息保存成功')
      setTimeout(() => setSuccess(''), 3000)
      handleCancelEdit()
    } catch (err) {
      console.error('保存竞赛失败:', err)
      setError(err instanceof Error ? err.message : '保存竞赛失败')
    } finally {
      setLoading(false)
    }
  }

  // 更新论文答辩状态
  const handleUpdateDefenseStatus = async (paperId: string, defenseStatus: 'pending' | 'passed' | 'failed') => {
    const loadingKey = `defense-${paperId}`
    setDefenseLoading(prev => ({ ...prev, [loadingKey]: true }))
    
    try {
      const response = await fetch('/api/admin/update-defense-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paperId,
          defenseStatus
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '更新答辩状态失败')
      }

      // 更新本地状态
      setStudentData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          papers: prev.papers.map(paper => 
            paper.id === paperId 
              ? { ...paper, defense_status: defenseStatus }
              : paper
          )
        }
      })

      setSuccess(`论文答辩状态已更新为${defenseStatus === 'pending' ? '待答辩' : defenseStatus === 'passed' ? '已通过' : '未通过'}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('更新答辩状态失败:', err)
      setError(err instanceof Error ? err.message : '更新答辩状态失败')
    } finally {
      setDefenseLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }

  // 更新专利答辩状态
  const handleUpdatePatentDefenseStatus = async (patentId: string, defenseStatus: 'pending' | 'passed' | 'failed') => {
    const loadingKey = `patent-defense-${patentId}`
    setDefenseLoading(prev => ({ ...prev, [loadingKey]: true }))
    
    try {
      const response = await fetch('/api/admin/update-patent-defense-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patentId,
          defenseStatus
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '更新专利答辩状态失败')
      }

      // 更新本地状态
      setStudentData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          patents: prev.patents.map(patent => 
            patent.id === patentId 
              ? { ...patent, defense_status: defenseStatus }
              : patent
          )
        }
      })

      setSuccess(`专利答辩状态已更新为${defenseStatus === 'pending' ? '待答辩' : defenseStatus === 'passed' ? '已通过' : '未通过'}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('更新专利答辩状态失败:', err)
      setError(err instanceof Error ? err.message : '更新专利答辩状态失败')
    } finally {
      setDefenseLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }

  // 搜索学生信息
  const handleSearch = async () => {
    if (!studentId.trim()) {
      setError('请输入学号')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/student-papers-patents?studentId=${encodeURIComponent(studentId)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取数据失败')
      }

      const data = await response.json()
      setStudentData(data)
      
      // 初始化额外加分编辑状态
      if (data.extraBonus) {
        setExtraBonusScore(data.extraBonus.bonus_score.toString())
      } else {
        setExtraBonusScore('0')
      }
      
      if (data.total.papers === 0 && data.total.patents === 0 && data.total.competitions === 0) {
        setError('该学号未找到论文、专利或竞赛信息')
      }
    } catch (err) {
      console.error('搜索失败:', err)
      setError(err instanceof Error ? err.message : '搜索失败')
    } finally {
      setLoading(false)
    }
  }

  // 开始编辑额外加分
  const handleEditExtraBonus = () => {
    setEditingExtraBonus(true)
  }

  // 保存额外加分
  const handleSaveExtraBonus = async () => {
    if (!studentData) return

    try {
      const score = parseFloat(extraBonusScore)
      if (isNaN(score) || score < 0 || score > 4) {
        setError('额外加分必须在0-4之间')
        return
      }

      const response = await fetch('/api/admin/student-papers-patents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'extra_bonus',
          studentId: studentData.studentId,
          score: score
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '更新额外加分失败')
      }

      // 更新本地状态
      setStudentData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          extraBonus: result.data
        }
      })

      setEditingExtraBonus(false)
      setSuccess('额外加分更新成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('更新额外加分失败:', err)
      setError(err instanceof Error ? err.message : '更新额外加分失败')
    }
  }

  // 取消编辑额外加分
  const handleCancelExtraBonusEdit = () => {
    if (studentData?.extraBonus) {
      setExtraBonusScore(studentData.extraBonus.bonus_score.toString())
    } else {
      setExtraBonusScore('0')
    }
    setEditingExtraBonus(false)
  }

  // 调试功能：查看数据库中的实际数据
  const handleDebug = async () => {
    try {
      const response = await fetch(`/api/admin/debug-student-data?studentId=${encodeURIComponent(studentId)}`)
      const debugData = await response.json()
      console.log('=== 数据库调试信息 ===')
      console.log('查询学号:', studentId)
      console.log('最近的论文记录:', debugData.allPapers)
      console.log('最近的专利记录:', debugData.allPatents)
      console.log('该学号的论文:', debugData.specificPapers)
      console.log('该学号的专利:', debugData.specificPatents)
      alert('调试信息已输出到控制台，请按F12查看')
    } catch (err) {
      console.error('调试失败:', err)
      alert('调试失败，请查看控制台')
    }
  }


  // 导出推免加分总表CSV
  const handleExportMoralScores = async () => {
    try {
      const response = await fetch('/api/admin/moral-education-scores?format=csv')
      
      if (!response.ok) {
        throw new Error('导出失败')
      }

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
      console.error('导出失败:', err)
      setError('导出推免加分总表失败')
    }
  }

  // 导出推免加分总表Excel
  const handleExportMoralScoresExcel = async () => {
    try {
      const response = await fetch('/api/admin/export-moral-education-excel')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '导出失败')
      }

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
      console.error('Excel导出失败:', err)
      setError(err instanceof Error ? err.message : '导出推免加分总表失败')
    }
  }

  // 加载推免加分总表（只显示前10名）
  const loadScoreTable = async () => {
    try {
      const response = await fetch('/api/admin/moral-education-scores?limit=10')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取推免加分总表失败')
      }

      const result = await response.json()
      // 按总分降序排列并只取前10名
      const sortedScores = (result.data || [])
        .sort((a: any, b: any) => b.total_score - a.total_score)
        .slice(0, 10)
      setComprehensiveScores(sortedScores)
    } catch (err) {
      console.error('获取推免加分总表失败:', err)
      setError(err instanceof Error ? err.message : '获取推免加分总表失败')
    }
  }

  // 显示总加分表
  const handleShowScoreTable = async () => {
    if (!showScoreTable) {
      await loadScoreTable()
    }
    setShowScoreTable(!showScoreTable)
  }

  // 智育成绩导入（文件上传）
  const handleAcademicImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setAcademicImportLoading(true)
    setError('')
    setSuccess('')

    try {
      // 解析上传的文件
      const parsedData = await parseAcademicFile(file)
      
      if (!parsedData || parsedData.length === 0) {
        throw new Error('文件解析失败或文件为空')
      }

      const response = await fetch('/api/admin/academic-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          academicScores: parsedData,
          replaceExisting: importMode === 'replace'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '导入智育成绩失败')
      }

      const result = await response.json()
      setSuccess(`智育成绩导入成功：${result.message}`)
      
      // 导入成功后加载数据
      await loadAcademicScores()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('导入智育成绩失败:', err)
      setError(err instanceof Error ? err.message : '导入智育成绩失败')
    } finally {
      setAcademicImportLoading(false)
      // 清空文件输入
      event.target.value = ''
    }
  }

  // 加载智育成绩
  const loadAcademicScores = async () => {
    try {
      const response = await fetch('/api/admin/academic-scores?limit=200')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取智育成绩失败')
      }

      const result = await response.json()
      const academicData = result.data || []
      setAcademicScores(academicData)
      updateAvailableProgrammes(academicData)
    } catch (err) {
      console.error('获取智育成绩失败:', err)
      setError(err instanceof Error ? err.message : '获取智育成绩失败')
    }
  }

  // 显示智育成绩表
  const handleShowAcademicTable = async () => {
    if (!showAcademicTable) {
      await loadAcademicScores()
    }
    setShowAcademicTable(!showAcademicTable)
  }

  // 生成综合排名表
  const handleGenerateRanking = async () => {
    setRankingGenerateLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/comprehensive-ranking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '生成综合排名失败')
      }

      const result = await response.json()
      setSuccess(`${result.message}`)
      
      // 生成成功后自动显示排名表
      await loadRankings()
      setShowRankingTable(true)
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('生成综合排名失败:', err)
      setError(err instanceof Error ? err.message : '生成综合排名失败')
    } finally {
      setRankingGenerateLoading(false)
    }
  }

  // 加载综合排名
  const loadRankings = async () => {
    try {
      const response = await fetch('/api/admin/comprehensive-ranking?topN=100')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取综合排名失败')
      }

      const result = await response.json()
      const rankingData = result.data || []
      setComprehensiveRankings(rankingData)
      updateAvailableProgrammes(rankingData)
    } catch (err) {
      console.error('获取综合排名失败:', err)
      setError(err instanceof Error ? err.message : '获取综合排名失败')
    }
  }

  // 显示综合排名表
  const handleShowRankingTable = async () => {
    if (!showRankingTable) {
      await loadRankings()
    }
    setShowRankingTable(!showRankingTable)
  }

  // 导出综合排名CSV
  const handleExportRanking = async () => {
    try {
      const response = await fetch('/api/admin/comprehensive-ranking?format=csv&topN=100')
      
      if (!response.ok) {
        throw new Error('导出失败')
      }

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
      console.error('导出失败:', err)
      setError('导出综合排名失败')
    }
  }

  // 导出综合排名Excel
  const handleExportRankingExcel = async () => {
    try {
      // 构建URL，如果选择了特定专业则添加专业参数
      let url = '/api/admin/export-comprehensive-ranking-excel?topN=100'
      if (exportProgramme && exportProgramme !== 'all') {
        url += `&programme=${encodeURIComponent(exportProgramme)}`
      }
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '导出失败')
      }

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
      console.error('Excel导出失败:', err)
      setError('导出综合排名Excel失败')
    }
  }

  // 导出论文数据
  const handleExportPapers = async () => {
    try {
      const response = await fetch('/api/admin/export-papers')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '导出失败')
      }

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
      console.error('导出论文数据失败:', err)
      setError('导出论文数据失败')
    }
  }

  // 导出专利数据
  const handleExportPatents = async () => {
    try {
      const response = await fetch('/api/admin/export-patents')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '导出失败')
      }

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
      console.error('导出专利数据失败:', err)
      setError('导出专利数据失败')
    }
  }

  // 导出竞赛数据
  const handleExportCompetitions = async () => {
    try {
      const response = await fetch('/api/admin/export-competitions')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '导出失败')
      }

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
      console.error('导出竞赛数据失败:', err)
      setError('导出竞赛数据失败')
    }
  }

  // 导入额外加分数据
  const handleExtraBonusImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setExtraBonusImportLoading(true)
    setError('')
    setSuccess('')

    try {
      const parsedData = await parseExtraBonusFile(file)
      console.log('解析的额外加分数据:', parsedData)

      const response = await fetch('/api/admin/extra-bonus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: parsedData,
          mode: extraBonusImportMode
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '导入失败')
      }

      setSuccess(result.message || '额外加分数据导入成功')
      setTimeout(() => setSuccess(''), 3000)
      
      // 刷新额外加分表
      if (showExtraBonusTable) {
        await loadExtraBonusData()
      }
    } catch (err) {
      console.error('导入额外加分数据失败:', err)
      setError(err instanceof Error ? err.message : '导入额外加分数据失败')
    } finally {
      setExtraBonusImportLoading(false)
      e.target.value = ''
    }
  }

  // 加载额外加分数据
  const loadExtraBonusData = async () => {
    try {
      const response = await fetch('/api/admin/extra-bonus')
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || '获取额外加分数据失败')
      }

      setExtraBonusData(result.data || [])
    } catch (err) {
      console.error('获取额外加分数据失败:', err)
      setError(err instanceof Error ? err.message : '获取额外加分数据失败')
    }
  }

  // 显示/隐藏额外加分表
  const handleShowExtraBonusTable = async () => {
    if (!showExtraBonusTable) {
      await loadExtraBonusData()
    }
    setShowExtraBonusTable(!showExtraBonusTable)
  }

  // 导出额外加分数据
  const handleExportExtraBonus = async () => {
    try {
      const response = await fetch('/api/admin/export-extra-bonus')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '导出失败')
      }

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
      console.error('导出额外加分数据失败:', err)
      setError('导出额外加分数据失败')
    }
  }

  // 清空额外加分表
  const handleClearExtraBonusTable = async () => {
    if (!confirm('确定要清空额外加分表吗？此操作不可恢复！')) {
      return
    }

    try {
      const response = await fetch('/api/admin/extra-bonus', {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '清空失败')
      }

      setSuccess('额外加分表已清空')
      setTimeout(() => setSuccess(''), 3000)
      
      // 刷新表格
      if (showExtraBonusTable) {
        await loadExtraBonusData()
      }
    } catch (err) {
      console.error('清空额外加分表失败:', err)
      setError(err instanceof Error ? err.message : '清空额外加分表失败')
    }
  }

  // 加载截止时间配置
  const loadDeadlineConfig = async () => {
    try {
      const response = await fetch('/api/admin/deadline-config')
      const result = await response.json()
      
      if (result.success && result.data) {
        // 转换数据库时间格式为 datetime-local 格式
        if (result.data.deadline) {
          const date = new Date(result.data.deadline)
          // 转换为本地时间的 YYYY-MM-DDTHH:mm 格式
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`
          setDeadline(formattedDate)
        } else {
          setDeadline('')
        }
        setIsDeadlineEnabled(result.data.is_enabled || false)
        
        console.log('截止时间配置已加载:', {
          deadline: result.data.deadline,
          is_enabled: result.data.is_enabled
        })
      }
    } catch (error) {
      console.error('加载截止时间配置失败:', error)
    }
  }

  // 保存截止时间配置
  const handleSaveDeadline = async () => {
    setDeadlineLoading(true)
    setError('')
    setSuccess('')
    
    try {
      // 将 datetime-local 格式转换为 ISO 8601 格式（带时区）
      let deadlineToSave = null
      if (deadline) {
        // datetime-local 格式: 2026-01-10T23:25
        // 需要转换为完整的 ISO 8601 格式
        const localDate = new Date(deadline)
        deadlineToSave = localDate.toISOString()
        
        console.log('保存截止时间:', {
          输入值: deadline,
          本地时间: localDate.toLocaleString('zh-CN'),
          ISO格式: deadlineToSave
        })
      }
      
      const response = await fetch('/api/admin/deadline-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deadline: deadlineToSave,
          is_enabled: isDeadlineEnabled
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSuccess('截止时间配置保存成功')
        setTimeout(() => setSuccess(''), 3000)
        // 重新加载配置以确保显示一致
        await loadDeadlineConfig()
      } else {
        setError(result.message || '保存失败')
      }
    } catch (error) {
      console.error('保存截止时间配置失败:', error)
      setError('保存截止时间配置失败')
    } finally {
      setDeadlineLoading(false)
    }
  }

  // 切换截止时间启用状态（立即保存）
  const handleToggleDeadlineEnabled = async () => {
    const newEnabledState = !isDeadlineEnabled
    setIsDeadlineEnabled(newEnabledState)
    
    // 如果要启用但没有设置截止时间，提示用户
    if (newEnabledState && !deadline) {
      setError('请先设置截止时间')
      setIsDeadlineEnabled(false)
      return
    }
    
    setDeadlineLoading(true)
    setError('')
    setSuccess('')
    
    try {
      // 将 datetime-local 格式转换为 ISO 8601 格式
      let deadlineToSave = null
      if (deadline) {
        const localDate = new Date(deadline)
        deadlineToSave = localDate.toISOString()
      }
      
      const response = await fetch('/api/admin/deadline-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deadline: deadlineToSave,
          is_enabled: newEnabledState
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSuccess(newEnabledState ? '截止时间限制已启用' : '截止时间限制已禁用')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(result.message || '操作失败')
        // 恢复原状态
        setIsDeadlineEnabled(!newEnabledState)
      }
    } catch (error) {
      console.error('切换截止时间状态失败:', error)
      setError('操作失败')
      // 恢复原状态
      setIsDeadlineEnabled(!newEnabledState)
    } finally {
      setDeadlineLoading(false)
    }
  }

  // 页面加载时获取截止时间配置
  React.useEffect(() => {
    loadDeadlineConfig()
  }, [])

  // 推免加分总表导入（文件上传）
  const handleMoralImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setMoralImportLoading(true)
    setError('')
    setSuccess('')
    setValidationResult(null)
    setShowValidationResult(false)

    try {
      // 解析上传的文件
      const parsedData = await parseMoralEducationFile(file)
      
      if (!parsedData || parsedData.length === 0) {
        throw new Error('文件解析失败或文件为空')
      }

      // 先验证数据
      const validateResponse = await fetch('/api/admin/import-moral-education-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moralScores: parsedData,
          validateOnly: true
        })
      })

      const validateResult = await validateResponse.json()
      setValidationResult(validateResult.validation)
      setShowValidationResult(true)

      if (!validateResult.validation.isValid) {
        setError('数据验证失败，请查看详细信息并修正后重新上传')
        return
      }

      // 如果验证通过，询问用户是否继续导入
      if (window.confirm(`数据验证通过！\n有效记录: ${validateResult.validation.validRecords.length} 条\n${validateResult.validation.warnings.length > 0 ? `警告: ${validateResult.validation.warnings.length} 条\n` : ''}是否继续导入？`)) {
        // 执行实际导入
        const importResponse = await fetch('/api/admin/import-moral-education-scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            moralScores: parsedData,
            replaceExisting: moralImportMode === 'replace'
          })
        })

        if (!importResponse.ok) {
          const errorData = await importResponse.json()
          throw new Error(errorData.error || '导入推免加分总表失败')
        }

        const result = await importResponse.json()
        setSuccess(`推免加分总表导入成功！处理了 ${result.summary.validRecords} 条有效记录`)
        
        // 如果推免加分总表正在显示，隐藏它以便用户重新加载
        if (showScoreTable) {
          setShowScoreTable(false)
        }
        
        setTimeout(() => setSuccess(''), 5000)
      }
    } catch (err) {
      console.error('导入失败:', err)
      setError(err instanceof Error ? err.message : '导入推免加分总表失败')
    } finally {
      setMoralImportLoading(false)
      // 清空文件输入
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  // 获取备份状态
  const loadBackupStatus = async () => {
    setBackupLoading(true)
    try {
      const response = await fetch('/api/admin/moral-education-backup')
      if (!response.ok) {
        throw new Error('获取备份状态失败')
      }
      const result = await response.json()
      setBackupStatus(result)
    } catch (err) {
      console.error('获取备份状态失败:', err)
      setError('获取备份状态失败')
    } finally {
      setBackupLoading(false)
    }
  }

  // 创建备份
  const handleCreateBackup = async () => {
    if (!window.confirm('确定要创建当前推免加分总表的备份吗？\n\n这将覆盖之前的备份数据。')) {
      return
    }

    setBackupLoading(true)
    try {
      const response = await fetch('/api/admin/moral-education-backup', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('创建备份失败')
      }

      const result = await response.json()
      setSuccess(`备份创建成功！备份了 ${result.backupCount} 条记录`)
      await loadBackupStatus()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('创建备份失败:', err)
      setError('创建备份失败')
    } finally {
      setBackupLoading(false)
    }
  }

  // 回退到备份
  const handleRollback = async () => {
    if (!window.confirm('确定要回退到备份数据吗？\n\n⚠️ 当前推免加分总表数据将被完全替换，此操作不可撤销！')) {
      return
    }

    setBackupLoading(true)
    try {
      const response = await fetch('/api/admin/moral-education-backup', {
        method: 'PUT'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '回退失败')
      }

      const result = await response.json()
      setSuccess(`${result.message}！恢复了 ${result.restoredCount} 条记录`)
      
      // 刷新备份状态和推免加分总表
      await loadBackupStatus()
      if (showScoreTable) {
        setShowScoreTable(false)
      }
      
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      console.error('回退失败:', err)
      setError(err instanceof Error ? err.message : '回退失败')
    } finally {
      setBackupLoading(false)
    }
  }

  // 清空推免加分总表
  const handleClearMoralTable = async () => {
    if (!window.confirm('⚠️ 确定要清空推免加分总表吗？\n\n此操作将删除所有推免加分总表数据，建议先创建备份！\n\n此操作不可撤销，请谨慎操作！')) {
      return
    }

    // 二次确认
    if (!window.confirm('⚠️ 最后确认：真的要清空推免加分总表吗？\n\n所有学生的推免加分数据都将被删除！')) {
      return
    }

    setClearMoralTableLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/clear-moral-table', {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '清空推免加分总表失败')
      }

      const result = await response.json()
      setSuccess(`推免加分总表清空成功！已删除 ${result.deletedCount} 条记录`)
      
      // 如果推免加分总表正在显示，隐藏它
      if (showScoreTable) {
        setShowScoreTable(false)
        setComprehensiveScores([])
      }
      
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      console.error('清空推免加分总表失败:', err)
      setError(err instanceof Error ? err.message : '清空推免加分总表失败')
    } finally {
      setClearMoralTableLoading(false)
    }
  }

  // 更新可用专业列表
  const updateAvailableProgrammes = (data: any[]) => {
    const programmes = [...new Set(data.map(item => item.programme).filter(Boolean))]
    setAvailableProgrammes(programmes.sort())
  }

  // 过滤智育成绩数据 - 始终按专业过滤
  const filteredAcademicScores = academicScores
    .filter(score => score.programme === academicProgrammeFilter)
    .slice(0, 10)

  // 过滤综合排名数据 - 始终按专业过滤
  const filteredRankings = comprehensiveRankings
    .filter(ranking => ranking.programme === rankingProgrammeFilter)
    .slice(0, 10)

  // 开始编辑分数
  const startEditScore = (type: 'paper' | 'patent' | 'competition', id: string, currentScore: string | number) => {
    const key = `${type}-${id}`
    setEditingScores(prev => ({
      ...prev,
      [key]: currentScore.toString()
    }))
  }

  // 取消编辑分数
  const cancelEditScore = (type: 'paper' | 'patent' | 'competition', id: string) => {
    const key = `${type}-${id}`
    setEditingScores(prev => {
      const newScores = { ...prev }
      delete newScores[key]
      return newScores
    })
  }

  // 保存分数
  const saveScore = async (type: 'paper' | 'patent' | 'competition', id: string) => {
    const key = `${type}-${id}`
    const newScore = editingScores[key]

    if (!newScore || isNaN(parseFloat(newScore))) {
      setError('请输入有效的分数')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/student-papers-patents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          id,
          score: parseFloat(newScore)
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '更新分数失败')
      }

      const result = await response.json()
      
      // 更新本地数据
      if (studentData) {
        const updatedData = { ...studentData }
        if (type === 'paper') {
          updatedData.papers = updatedData.papers.map(paper => 
            paper.id === id ? { ...paper, score: parseFloat(newScore) } : paper
          )
        } else if (type === 'patent') {
          updatedData.patents = updatedData.patents.map(patent => 
            patent.id === id ? { ...patent, score: parseFloat(newScore) } : patent
          )
        } else if (type === 'competition') {
          updatedData.competitions = updatedData.competitions.map(competition => 
            competition.id === id ? { ...competition, score: parseFloat(newScore) } : competition
          )
        }
        setStudentData(updatedData)
      }

      // 取消编辑状态
      cancelEditScore(type, id)
      setSuccess('分数更新成功')
      
      // 3秒后清除成功消息
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('保存分数失败:', err)
      setError(err instanceof Error ? err.message : '保存分数失败')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    
    // 如果是月份格式 YYYY-MM，直接返回
    if (/^\d{4}-\d{2}$/.test(dateString)) {
      return dateString
    }
    
    // 如果是完整日期格式，格式化显示
    try {
      return new Date(dateString).toLocaleDateString('zh-CN')
    } catch {
      return dateString // 如果格式化失败，返回原字符串
    }
  }

  // 安全地处理分数显示和转换
  const formatScore = (score: string | number): string => {
    if (score === null || score === undefined) return '0'
    if (typeof score === 'number') return score.toString()
    if (typeof score === 'string') {
      const numScore = parseFloat(score)
      return isNaN(numScore) ? '0' : numScore.toString()
    }
    return '0'
  }

  const parseScore = (score: string | number): number => {
    if (typeof score === 'number') return score
    if (typeof score === 'string') {
      const numScore = parseFloat(score)
      return isNaN(numScore) ? 0 : numScore
    }
    return 0
  }

  // 审核单条记录
  const handleApproveRecord = async (type: 'paper' | 'patent' | 'competition', id: string, status: 'approved' | 'rejected' | 'pending') => {
    const key = `${type}-${id}`
    setApprovalLoading(prev => ({ ...prev, [key]: true }))
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/approve-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          id,
          status
        })
      })

      if (!response.ok) {
        if (!['approved', 'rejected', 'pending'].includes(status)) {
          throw new Error('审核失败')
        }

        const errorData = await response.json()
        throw new Error(errorData.error || '审核失败')
      }

      const result = await response.json()
      
      // 更新本地数据
      if (studentData) {
        const updatedData = { ...studentData }
        if (type === 'paper') {
          updatedData.papers = updatedData.papers.map(paper => 
            paper.id === id ? { ...paper, approval_status: status } : paper
          )
        } else if (type === 'patent') {
          updatedData.patents = updatedData.patents.map(patent => 
            patent.id === id ? { ...patent, approval_status: status } : patent
          )
        } else if (type === 'competition') {
          updatedData.competitions = updatedData.competitions.map(competition => 
            competition.id === id ? { ...competition, approval_status: status } : competition
          )
        }
        setStudentData(updatedData)
      }

      setSuccess(`记录审核${status === 'approved' ? '通过' : status === 'rejected' ? '拒绝' : '重置为待审核'}成功`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('审核失败:', err)
      setError(err instanceof Error ? err.message : '审核失败')
    } finally {
      setApprovalLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  // 检查学生的所有加分记录是否都已审核通过
  const checkAllRecordsApproved = (studentData: StudentData): { canApprove: boolean; pendingRecords: string[] } => {
    const pendingRecords: string[] = []

    // 检查论文记录
    studentData.papers.forEach(paper => {
      if (paper.approval_status !== 'approved') {
        pendingRecords.push(`论文《${paper.paper_title}》`)
      }
    })

    // 检查专利记录
    studentData.patents.forEach(patent => {
      if (patent.approval_status !== 'approved') {
        pendingRecords.push(`专利《${patent.patent_name}》`)
      }
    })

    // 检查竞赛记录
    studentData.competitions.forEach(competition => {
      if (competition.approval_status !== 'approved') {
        pendingRecords.push(`竞赛《${competition.competition_name}》`)
      }
    })

    return {
      canApprove: pendingRecords.length === 0,
      pendingRecords
    }
  }

  // 删除单条记录
  const handleDeleteRecord = async (type: 'paper' | 'patent' | 'competition', id: string, title: string) => {
    if (!window.confirm(`确定要删除这条${type === 'paper' ? '论文' : type === 'patent' ? '专利' : '竞赛'}记录吗？\n\n标题：${title}\n\n此操作不可撤销！`)) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/delete-record', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '删除记录失败')
      }

      const result = await response.json()
      
      // 更新本地数据
      if (studentData) {
        const updatedData = { ...studentData }
        if (type === 'paper') {
          updatedData.papers = updatedData.papers.filter(paper => paper.id !== id)
          updatedData.total.papers = updatedData.papers.length
        } else if (type === 'patent') {
          updatedData.patents = updatedData.patents.filter(patent => patent.id !== id)
          updatedData.total.patents = updatedData.patents.length
        } else if (type === 'competition') {
          updatedData.competitions = updatedData.competitions.filter(competition => competition.id !== id)
          updatedData.total.competitions = updatedData.competitions.length
        }
        setStudentData(updatedData)
      }

      setSuccess(`${type === 'paper' ? '论文' : type === 'patent' ? '专利' : '竞赛'}记录删除成功`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('删除记录失败:', err)
      setError(err instanceof Error ? err.message : '删除记录失败')
    } finally {
      setLoading(false)
    }
  }

  // 审核学生整体状态
  const handleApproveStudent = async (studentId: string, status: 'approved' | 'rejected' | 'pending') => {
    // 如果是审核通过，需要先检查所有加分记录是否都已审核通过
    if (status === 'approved' && studentData) {
      const { canApprove, pendingRecords } = checkAllRecordsApproved(studentData)
      
      if (!canApprove) {
        const recordsList = pendingRecords.map(record => `• ${record}`).join('\n')
        setError(`无法审核通过该学生，以下加分记录尚未审核通过：\n${recordsList}\n\n请先审核通过所有加分记录，再审核学生综合资格。`)
        return
      }
    }

    setApprovalLoading(prev => ({ ...prev, [`student-${studentId}`]: true }))
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/approve-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          status
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '学生审核失败')
      }

      const result = await response.json()
      
      // 更新本地数据
      if (studentData) {
        setStudentData({
          ...studentData,
          overall_approval_status: status
        })
      }

      // 显示成功消息，包含推免加分分数信息
      setSuccess(result.message || `学生综合资格${status === 'approved' ? '通过' : status === 'rejected' ? '拒绝' : '重置为待审核'}成功`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('学生审核失败:', err)
      setError(err instanceof Error ? err.message : '学生审核失败')
    } finally {
      setApprovalLoading(prev => ({ ...prev, [`student-${studentId}`]: false }))
    }
  }

  // 获取审核状态徽章
  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">已通过</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">已拒绝</Badge>
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">待审核</Badge>
    }
  }

  // 获取答辩状态徽章（可点击）- 论文
  const getDefenseStatusBadge = (status: string, paperId: string) => {
    const handleDefenseStatusClick = () => {
      // 在三种状态之间循环切换：pending -> passed -> failed -> pending
      let nextStatus: 'pending' | 'passed' | 'failed'
      if (status === 'pending') {
        nextStatus = 'passed'
      } else if (status === 'passed') {
        nextStatus = 'failed'
      } else {
        nextStatus = 'pending'
      }
      handleUpdateDefenseStatus(paperId, nextStatus)
    }

    const isLoading = defenseLoading[`defense-${paperId}`]
    
    switch (status) {
      case 'passed':
        return (
          <Badge 
            className="bg-blue-100 text-blue-800 border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors" 
            onClick={handleDefenseStatusClick}
            title="点击切换到未通过"
          >
            {isLoading ? '更新中...' : '已通过'}
          </Badge>
        )
      case 'failed':
        return (
          <Badge 
            className="bg-red-100 text-red-800 border-red-200 cursor-pointer hover:bg-red-200 transition-colors" 
            onClick={handleDefenseStatusClick}
            title="点击切换到待答辩"
          >
            {isLoading ? '更新中...' : '未通过'}
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge 
            className="bg-gray-100 text-gray-800 border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors" 
            onClick={handleDefenseStatusClick}
            title="点击切换到已通过"
          >
            {isLoading ? '更新中...' : '待答辩'}
          </Badge>
        )
    }
  }

  // 获取答辩状态徽章（可点击）- 专利
  const getPatentDefenseStatusBadge = (status: string, patentId: string) => {
    const handleDefenseStatusClick = () => {
      // 在三种状态之间循环切换：pending -> passed -> failed -> pending
      let nextStatus: 'pending' | 'passed' | 'failed'
      if (status === 'pending') {
        nextStatus = 'passed'
      } else if (status === 'passed') {
        nextStatus = 'failed'
      } else {
        nextStatus = 'pending'
      }
      handleUpdatePatentDefenseStatus(patentId, nextStatus)
    }

    const isLoading = defenseLoading[`patent-defense-${patentId}`]
    
    switch (status) {
      case 'passed':
        return (
          <Badge 
            className="bg-blue-100 text-blue-800 border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors" 
            onClick={handleDefenseStatusClick}
            title="点击切换到未通过"
          >
            {isLoading ? '更新中...' : '已通过'}
          </Badge>
        )
      case 'failed':
        return (
          <Badge 
            className="bg-red-100 text-red-800 border-red-200 cursor-pointer hover:bg-red-200 transition-colors" 
            onClick={handleDefenseStatusClick}
            title="点击切换到待答辩"
          >
            {isLoading ? '更新中...' : '未通过'}
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge 
            className="bg-gray-100 text-gray-800 border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors" 
            onClick={handleDefenseStatusClick}
            title="点击切换到已通过"
          >
            {isLoading ? '更新中...' : '待答辩'}
          </Badge>
        )
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">成绩综合管理</h1>
          <p className="text-gray-600">管理学生论文发表、专利申请和竞赛获奖的加分记录审核，设置学生综合资格</p>
        </div>

        {/* 截止时间管理 */}
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-orange-700">
              <Clock className="h-5 w-5 mr-2" />
              ⏰ 提交截止时间管理
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="bg-white p-4 rounded-lg border border-orange-200">
              <p className="text-sm text-gray-700 mb-4">
                设置截止时间后，学生将无法在个人页面新增或修改论文、专利和竞赛记录。
              </p>
              
              <div className="space-y-4">
                {/* 状态切换按钮 */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    截止时间限制状态：
                  </label>
                  <Button
                    onClick={handleToggleDeadlineEnabled}
                    disabled={deadlineLoading}
                    className={`${
                      isDeadlineEnabled 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gray-400 hover:bg-gray-500'
                    } transition-colors`}
                  >
                    {deadlineLoading ? (
                      '切换中...'
                    ) : isDeadlineEnabled ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        已启用
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        已禁用
                      </>
                    )}
                  </Button>
                  <span className="text-xs text-gray-500">
                    {isDeadlineEnabled ? '点击禁用限制' : '点击启用限制'}
                  </span>
                </div>
                
                {/* 截止时间选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    截止时间
                  </label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full max-w-md p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {deadline ? `学生将在 ${new Date(deadline).toLocaleString('zh-CN')} 后无法修改记录` : '请选择截止时间'}
                  </p>
                </div>
                
                {/* 保存截止时间按钮 */}
                <div>
                  <Button
                    onClick={handleSaveDeadline}
                    disabled={deadlineLoading || !deadline}
                    variant="outline"
                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    {deadlineLoading ? '保存中...' : '💾 保存截止时间'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    修改截止时间后需要点击此按钮保存
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 重要提醒：推免加分总表数据管理 */}
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-red-700">
              <Trophy className="h-5 w-5 mr-2" />
              ⚠️ 重要提醒：推免加分总表数据管理
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <div className="mb-3">
                <p className="text-sm text-red-800 mb-2">
                  <strong>必须定期清理推免加分总表数据！</strong>过时的数据会影响综合排名计算的准确性。
                </p>
                <p className="text-xs text-gray-600 mb-3">
                  建议在每学期开始时清空上学期的旧数据，然后导入新的推免加分数据。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={handleClearMoralTable}
                  variant="destructive"
                  disabled={clearMoralTableLoading}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium"
                >
                  {clearMoralTableLoading ? '清空中...' : '🗑️ 清空推免加分总表'}
                </Button>
                <Button 
                  onClick={handleCreateBackup}
                  variant="outline"
                  disabled={backupLoading}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {backupLoading ? '创建中...' : '💾 创建备份'}
                </Button>
                <Button 
                  onClick={handleShowScoreTable} 
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {showScoreTable ? '隐藏推免加分总表' : '📈 查看推免加分总表'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 数据导出管理 */}
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-green-700">
              <FileText className="h-5 w-5 mr-2" />
              📊 数据导出管理
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <p className="text-sm text-gray-700 mb-4">
                导出论文、专利和竞赛的完整数据表格，包含所有字段信息。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 论文数据导出 */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">📄 论文数据</h4>
                  <p className="text-xs text-gray-600 mb-3">
                    包含学号、姓名、论文标题、期刊信息、作者类型、审核状态、答辩状态等
                  </p>
                  <Button 
                    onClick={handleExportPapers}
                    variant="outline"
                    className="w-full border-blue-500 text-blue-600 hover:bg-blue-100"
                  >
                    导出论文数据
                  </Button>
                </div>

                {/* 专利数据导出 */}
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">🔬 专利数据</h4>
                  <p className="text-xs text-gray-600 mb-3">
                    包含学号、姓名、专利名称、专利号、专利权人类别、审核状态、答辩状态等
                  </p>
                  <Button 
                    onClick={handleExportPatents}
                    variant="outline"
                    className="w-full border-purple-500 text-purple-600 hover:bg-purple-100"
                  >
                    导出专利数据
                  </Button>
                </div>

                {/* 竞赛数据导出 */}
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="text-sm font-medium text-orange-800 mb-2">🏆 竞赛数据</h4>
                  <p className="text-xs text-gray-600 mb-3">
                    包含学号、姓名、竞赛名称、竞赛级别、竞赛类型、团队信息、审核状态等
                  </p>
                  <Button 
                    onClick={handleExportCompetitions}
                    variant="outline"
                    className="w-full border-orange-500 text-orange-600 hover:bg-orange-100"
                  >
                    导出竞赛数据
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 额外推免加分管理 */}
        <Card className="mb-6 border-indigo-200 bg-indigo-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-indigo-700">
              <Award className="h-5 w-5 mr-2" />
              ⭐ 额外推免加分管理
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="bg-white p-4 rounded-lg border border-indigo-200">
              <p className="text-sm text-gray-700 mb-3">
                管理学生的额外推免加分项。额外加分会在生成推免加分总表时自动计入，总加分仍不超过4分。
              </p>
              
              <div className="mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <h4 className="text-sm font-medium text-indigo-800 mb-2">📋 文件格式要求</h4>
                <div className="text-xs text-indigo-700 space-y-1">
                  <p><strong>必需字段：</strong>学号、分数</p>
                  <p><strong>文件格式：</strong>支持 .csv、.xlsx、.xls 格式</p>
                  <p><strong>分数范围：</strong>0-4分</p>
                  <p className="text-red-600"><strong>重要：</strong>额外加分会计入推免总分，总分仍受4分上限约束</p>
                </div>
              </div>

              <div className="mb-3">
                <Label className="text-sm font-medium text-indigo-700">导入模式选择：</Label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="extraBonusImportMode"
                      value="append"
                      checked={extraBonusImportMode === 'append'}
                      onChange={(e) => setExtraBonusImportMode(e.target.value as 'append' | 'replace')}
                      className="mr-2"
                    />
                    <span className="text-sm">追加模式</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="extraBonusImportMode"
                      value="replace"
                      checked={extraBonusImportMode === 'replace'}
                      onChange={(e) => setExtraBonusImportMode(e.target.value as 'append' | 'replace')}
                      className="mr-2"
                    />
                    <span className="text-sm">替换模式</span>
                    <Badge variant="outline" className="ml-2 text-xs">推荐</Badge>
                  </label>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {extraBonusImportMode === 'append' ? (
                    <span>• 相同学号的数据会被更新，不同学号会新增</span>
                  ) : (
                    <span className="text-blue-600">• 🔄 将清空所有现有额外加分数据，然后导入新数据</span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleExtraBonusImport}
                    disabled={extraBonusImportLoading}
                    className="hidden"
                  />
                  {extraBonusImportLoading ? '导入中...' : '导入额外加分'}
                </label>
                <Button 
                  onClick={handleExportExtraBonus} 
                  variant="outline"
                  className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                >
                  导出额外加分
                </Button>
                <Button 
                  onClick={handleShowExtraBonusTable} 
                  variant="outline"
                  className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                >
                  {showExtraBonusTable ? '隐藏额外加分表' : '查看额外加分表'}
                </Button>
                <Button 
                  onClick={handleClearExtraBonusTable}
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50"
                >
                  清空额外加分表
                </Button>
              </div>

              {/* 额外加分表格 */}
              {showExtraBonusTable && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    额外加分数据（共 {extraBonusData.length} 条）
                  </h4>
                  <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>学号</TableHead>
                          <TableHead>分数</TableHead>
                          <TableHead>更新时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extraBonusData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-gray-500">
                              暂无额外加分数据
                            </TableCell>
                          </TableRow>
                        ) : (
                          extraBonusData.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.bupt_student_id}</TableCell>
                              <TableCell className="font-medium text-indigo-600">
                                {item.bonus_score}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN') : '-'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 搜索区域 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              学生信息查询
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end space-x-4">
              <div className="flex-1">
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
              <Button 
                onClick={handleSearch} 
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? '搜索中...' : '查询'}
              </Button>
            </div>
            
            {/* 推免加分总表导入管理 */}
            <div className="mt-4 pt-4 border-t">
              <div className="mb-3">
                <Label className="text-sm font-medium text-orange-700">推免加分总表导入：</Label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="moralImportMode"
                      value="append"
                      checked={moralImportMode === 'append'}
                      onChange={(e) => setMoralImportMode(e.target.value as 'append' | 'replace')}
                      className="mr-2"
                    />
                    <span className="text-sm">追加模式</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="moralImportMode"
                      value="replace"
                      checked={moralImportMode === 'replace'}
                      onChange={(e) => setMoralImportMode(e.target.value as 'append' | 'replace')}
                      className="mr-2"
                    />
                    <span className="text-sm">替换模式</span>
                    <Badge variant="outline" className="ml-2 text-xs">推荐</Badge>
                  </label>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {moralImportMode === 'append' ? (
                    <span>• 相同学号的学生数据会被更新，不同学号会新增</span>
                  ) : (
                    <span className="text-blue-600">• 🔄 将清空所有现有推免加分总表数据，然后导入新数据（推荐用于当年综合计算）</span>
                  )}
                </div>
              </div>
              
              <div className="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="text-sm font-medium text-orange-800 mb-2">📋 支持的表头格式</h4>
                <div className="text-xs text-orange-700 space-y-1">
                  <p><strong>支持中文表头：</strong>学号、姓名、班级、论文分数、专利分数、竞赛分数、论文+专利小计、总加分</p>
                  <p><strong>文件格式：</strong>支持 .csv、.xlsx、.xls 格式</p>
                  <p><strong>表头格式：</strong>🔄 自动识别合并表头，支持第一行或第二行作为表头</p>
                  <p><strong>容错处理：</strong>✨ 自动去除表头两侧的多余空格</p>
                  <p><strong>注意：</strong>数据行必须在表头行之后</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center cursor-pointer bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleMoralImport}
                    disabled={moralImportLoading}
                    className="hidden"
                  />
                  {moralImportLoading ? '导入中...' : '导入推免加分总表'}
                </label>
                <Button 
                  onClick={handleExportMoralScores} 
                  variant="outline"
                  className="border-purple-500 text-purple-600 hover:bg-purple-50"
                >
                  导出推免加分表CSV
                </Button>
                <Button 
                  onClick={handleExportMoralScoresExcel} 
                  variant="outline"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                >
                  导出推免加分表Excel
                </Button>
                <Button 
                  onClick={handleCreateBackup}
                  variant="outline"
                  disabled={backupLoading}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {backupLoading ? '创建中...' : '创建备份'}
                </Button>
                <Button 
                  onClick={handleRollback}
                  variant="outline"
                  disabled={backupLoading}
                  className="border-red-500 text-red-600 hover:bg-red-50"
                >
                  {backupLoading ? '回退中...' : '回退到备份'}
                </Button>
                <Button 
                  onClick={loadBackupStatus}
                  variant="outline"
                  disabled={backupLoading}
                  className="border-gray-500 text-gray-600 hover:bg-gray-50"
                >
                  查看备份状态
                </Button>
              </div>
            </div>
            
            {/* 智育成绩管理 */}
            <div className="mt-4 pt-4 border-t">
              <div className="mb-3">
                <Label className="text-sm font-medium">导入模式选择：</Label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                      className="mr-2"
                    />
                    <span className="text-sm">追加/更新模式</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                      className="mr-2"
                    />
                    <span className="text-sm">替换模式</span>
                    <Badge variant="outline" className="ml-2 text-xs">推荐</Badge>
                  </label>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {importMode === 'append' ? (
                    <span>• 相同学号的学生数据会被更新，不同学号会新增，不会删除现有其他数据</span>
                  ) : (
                    <span className="text-blue-600">• 🔄 将清空所有现有数据，然后导入新数据（推荐用于当年综合计算）</span>
                  )}
                </div>
              </div>
              
              <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-2">📋 支持的表头格式</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>支持中文表头：</strong>学号、姓名、上课院系、学生校区、专业名称、班级名称、培养层次、所修总门数、所修总学分、所得学分、未得学分、加权均分、平均学分绩点、专业排名、专业排名总人数</p>
                  <p><strong>文件格式：</strong>支持 .csv、.xlsx、.xls 格式</p>
                  <p><strong>表头格式：</strong>🧠 智能识别合并表头，自动处理跨行/跨列合并单元格</p>
                  <p><strong>容错处理：</strong>✨ 自动去除表头两侧的多余空格</p>
                  <p><strong>注意：</strong>数据行必须在表头行之后</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleAcademicImport}
                    disabled={academicImportLoading}
                    className="hidden"
                  />
                  {academicImportLoading ? '导入中...' : '导入智育成绩'}
                </label>
                <Button 
                  onClick={handleShowAcademicTable} 
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {showAcademicTable ? '隐藏智育成绩' : '查看智育成绩'}
                </Button>
              </div>
            </div>
            
            {/* 综合排名管理 */}
            <div className="mt-4 pt-4 border-t">
              {/* 专业选择 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">选择导出专业</label>
                <select 
                  value={exportProgramme}
                  onChange={(e) => setExportProgramme(e.target.value)}
                  className="w-full max-w-xs p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">全部专业</option>
                  <option value="智能科学与技术">智能科学与技术</option>
                  <option value="电子信息工程">电子信息工程</option>
                  <option value="电信工程及管理">电信工程及管理</option>
                  <option value="物联网工程">物联网工程</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">选择"全部专业"将导出所有学生的综合排名</p>
              </div>
              
              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={handleGenerateRanking} 
                  disabled={rankingGenerateLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {rankingGenerateLoading ? '生成中...' : '生成综合排名'}
                </Button>
                <Button 
                  onClick={handleShowRankingTable} 
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50"
                >
                  {showRankingTable ? '隐藏综合排名' : '查看综合排名'}
                </Button>
                <Button 
                  onClick={handleExportRanking} 
                  variant="outline"
                  className="border-purple-500 text-purple-600 hover:bg-purple-50"
                >
                  导出综合排名CSV
                </Button>
                <Button 
                  onClick={handleExportRankingExcel} 
                  variant="outline"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                >
                  导出综合排名Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 错误和成功消息 */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* 推免加分总表导入验证结果 */}
        {showValidationResult && validationResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className={`flex items-center ${validationResult.isValid ? 'text-green-700' : 'text-red-700'}`}>
                {validationResult.isValid ? <CheckCircle className="h-5 w-5 mr-2" /> : <XCircle className="h-5 w-5 mr-2" />}
                数据验证结果
                <Button 
                  onClick={() => setShowValidationResult(false)}
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 统计信息 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-sm text-blue-600">总记录数</div>
                    <div className="text-lg font-semibold text-blue-800">{validationResult.validRecords.length + validationResult.invalidRecords.length}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-sm text-green-600">有效记录</div>
                    <div className="text-lg font-semibold text-green-800">{validationResult.validRecords.length}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <div className="text-sm text-red-600">无效记录</div>
                    <div className="text-lg font-semibold text-red-800">{validationResult.invalidRecords.length}</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded">
                    <div className="text-sm text-yellow-600">警告数</div>
                    <div className="text-lg font-semibold text-yellow-800">{validationResult.warnings.length}</div>
                  </div>
                </div>

                {/* 错误信息 */}
                {validationResult.errors.length > 0 && (
                  <div className="bg-red-50 p-4 rounded">
                    <h4 className="font-semibold text-red-800 mb-2">错误信息：</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {validationResult.errors.map((error: string, index: number) => (
                        <li key={index} className="text-sm text-red-700">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 警告信息 */}
                {validationResult.warnings.length > 0 && (
                  <div className="bg-yellow-50 p-4 rounded">
                    <h4 className="font-semibold text-yellow-800 mb-2">警告信息：</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {validationResult.warnings.map((warning: string, index: number) => (
                        <li key={index} className="text-sm text-yellow-700">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 无效记录详情 */}
                {validationResult.invalidRecords.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="font-semibold text-gray-800 mb-2">无效记录详情：</h4>
                    <div className="max-h-40 overflow-y-auto">
                      {validationResult.invalidRecords.map((record: any, index: number) => (
                        <div key={index} className="text-sm text-gray-700 mb-2 p-2 bg-white rounded">
                          <div className="font-medium">第{record._rowNumber}行: {record.bupt_student_id || '无学号'} - {record.full_name || '无姓名'}</div>
                          <div className="text-red-600 text-xs mt-1">
                            {record._errors?.join('; ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 备份状态显示 */}
        {backupStatus && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <RotateCcw className="h-5 w-5 mr-2" />
                推免加分总表备份状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 mb-1">当前数据</div>
                  <div className="text-2xl font-bold text-blue-800">{backupStatus.currentCount}</div>
                  <div className="text-xs text-blue-600">条记录</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 mb-1">备份数据</div>
                  <div className="text-2xl font-bold text-green-800">{backupStatus.backupCount}</div>
                  <div className="text-xs text-green-600">条记录</div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    备份状态: {backupStatus.hasBackup ? (
                      <span className="text-green-600 font-medium">✓ 有可用备份</span>
                    ) : (
                      <span className="text-orange-600 font-medium">⚠ 暂无备份</span>
                    )}
                  </div>
                  <Button 
                    onClick={loadBackupStatus}
                    variant="ghost"
                    size="sm"
                    disabled={backupLoading}
                  >
                    刷新状态
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                  <div className="flex items-center space-x-2">
                    {getApprovalStatusBadge(studentData.overall_approval_status || 'pending')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      学号：<span className="font-mono font-semibold">{studentData.studentId}</span>
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      当前状态：{studentData.overall_approval_status === 'approved' ? '综合资格已通过' : 
                                studentData.overall_approval_status === 'rejected' ? '综合资格已拒绝' : '等待审核'}
                    </p>
                    {studentData.overall_approval_status === 'approved' && (
                      <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        ⚠️ 学生综合资格已通过，所有保研相关信息已锁定，无法修改
                      </p>
                    )}
                    {(() => {
                      const { canApprove, pendingRecords } = checkAllRecordsApproved(studentData)
                      if (!canApprove && studentData.overall_approval_status === 'pending') {
                        return (
                          <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-2">
                            <div className="flex items-center gap-1">
                              <span>⚠️</span>
                              <span>还有 {pendingRecords.length} 项加分记录未审核通过，无法审核学生综合资格</span>
                            </div>
                            <div className="mt-1 text-xs text-amber-700">
                              待审核记录：{pendingRecords.slice(0, 3).join('、')}
                              {pendingRecords.length > 3 && `等${pendingRecords.length}项`}
                            </div>
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
                          <Button
                            onClick={() => handleApproveStudent(studentData.studentId, 'approved')}
                            disabled={isDisabled}
                            className={`${hasUnApprovedRecords ? 'bg-gray-400 hover:bg-gray-500' : 'bg-green-600 hover:bg-green-700'}`}
                            size="sm"
                            title={hasUnApprovedRecords ? `无法审核通过，还有${pendingRecords.length}项记录未审核通过` : '审核通过学生综合资格'}
                          >
                            {approvalLoading[`student-${studentData.studentId}`] ? '处理中...' : '通过综合'}
                          </Button>
                          {hasUnApprovedRecords && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {pendingRecords.length}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    <Button
                      onClick={() => handleApproveStudent(studentData.studentId, 'rejected')}
                      disabled={approvalLoading[`student-${studentData.studentId}`] || studentData.overall_approval_status === 'rejected'}
                      variant="destructive"
                      size="sm"
                    >
                      {approvalLoading[`student-${studentData.studentId}`] ? '处理中...' : '拒绝综合'}
                    </Button>
                    {(studentData.overall_approval_status !== 'pending') && (
                      <Button
                        onClick={() => handleApproveStudent(studentData.studentId, 'pending')}
                        disabled={approvalLoading[`student-${studentData.studentId}`]}
                        variant="outline"
                        className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                        size="sm"
                      >
                        重置审核
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* 统计信息 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">论文数量</p>
                      <p className="text-2xl font-bold text-blue-600">{studentData.total.papers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">专利数量</p>
                      <p className="text-2xl font-bold text-green-600">{studentData.total.patents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">竞赛数量</p>
                      <p className="text-2xl font-bold text-orange-600">{studentData.total.competitions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm text-gray-600">查询学号</p>
                    <p className="text-2xl font-bold text-purple-600">{studentData.studentId}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">额外加分</p>
                      {editingExtraBonus ? (
                        <div className="flex items-center space-x-2 mt-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="4"
                            value={extraBonusScore}
                            onChange={(e) => setExtraBonusScore(e.target.value)}
                            className="w-24 h-8"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveExtraBonus}
                            className="h-8 px-2"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelExtraBonusEdit}
                            className="h-8 px-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <p className="text-2xl font-bold text-indigo-600">
                            {studentData.extraBonus?.bonus_score || 0}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEditExtraBonus}
                            className="h-6 px-2"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {studentData.extraBonus?.updated_at 
                      ? `更新于 ${new Date(studentData.extraBonus.updated_at).toLocaleString('zh-CN')}`
                      : '暂无记录'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 论文信息表格 */}
            {studentData.papers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    论文发表信息
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>论文标题</TableHead>
                          <TableHead>期刊名称</TableHead>
                          <TableHead>期刊类别</TableHead>
                          <TableHead>姓名</TableHead>
                          <TableHead>手机号</TableHead>
                          <TableHead>作者类型</TableHead>
                          <TableHead>发布日期</TableHead>
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
                              <TableCell className="font-medium">{paper.paper_title}</TableCell>
                              <TableCell>{paper.journal_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{paper.journal_category}</Badge>
                              </TableCell>
                              <TableCell>{paper.full_name}</TableCell>
                              <TableCell>{paper.phone_number || '-'}</TableCell>
                              <TableCell>{paper.author_type}</TableCell>
                              <TableCell>{paper.publish_date ? formatDate(paper.publish_date) : '-'}</TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="w-20"
                                    value={editingScores[editKey]}
                                    onChange={(e) => setEditingScores(prev => ({
                                      ...prev,
                                      [editKey]: e.target.value
                                    }))}
                                  />
                                ) : (
                                  <span className="font-semibold text-blue-600">
                                    {formatScore(paper.score)}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {getApprovalStatusBadge(paper.approval_status || 'pending')}
                              </TableCell>
                              <TableCell>
                                {getDefenseStatusBadge(paper.defense_status || 'pending', paper.id)}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-1">
                                  {studentData.overall_approval_status === 'approved' ? (
                                    <div className="flex items-center text-sm text-gray-500">
                                      <span className="bg-gray-100 px-2 py-1 rounded text-xs">已锁定</span>
                                    </div>
                                  ) : (
                                    <>
                                      {isEditing ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => saveScore('paper', paper.id)}
                                            disabled={loading}
                                          >
                                            <Check className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => cancelEditScore('paper', paper.id)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditPaper(paper)}
                                            title="编辑论文信息"
                                            className="border-purple-500 text-purple-600 hover:bg-purple-50"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveRecord('paper', paper.id, 'approved')}
                                        disabled={approvalLoading[`paper-${paper.id}`] || (paper.approval_status || 'pending') === 'approved'}
                                        className="bg-green-600 hover:bg-green-700"
                                        title="审核通过"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveRecord('paper', paper.id, 'rejected')}
                                        disabled={approvalLoading[`paper-${paper.id}`] || (paper.approval_status || 'pending') === 'rejected'}
                                        variant="destructive"
                                        title="审核拒绝"
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </Button>
                                      {(paper.approval_status || 'pending') !== 'pending' && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleApproveRecord('paper', paper.id, 'pending')}
                                          disabled={approvalLoading[`paper-${paper.id}`]}
                                          variant="outline"
                                          className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                          title="重置为待审核"
                                        >
                                          <Clock className="h-3 w-3" />
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        onClick={() => handleDeleteRecord('paper', paper.id, paper.paper_title)}
                                        disabled={loading}
                                        variant="outline"
                                        className="border-red-500 text-red-600 hover:bg-red-50"
                                        title="删除论文记录"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
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
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    专利申请信息
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>专利名称</TableHead>
                          <TableHead>专利号</TableHead>
                          <TableHead>姓名</TableHead>
                          <TableHead>手机号</TableHead>
                          <TableHead>发明人类型</TableHead>
                          <TableHead>申请日期</TableHead>
                          <TableHead>答辩状态</TableHead>
                          <TableHead>分数</TableHead>
                          <TableHead>审核状态</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentData.patents.map((patent) => {
                          const editKey = `patent-${patent.id}`
                          const isEditing = editKey in editingScores
                          
                          return (
                            <TableRow key={patent.id}>
                              <TableCell className="font-medium">{patent.patent_name}</TableCell>
                              <TableCell>{patent.patent_number || '-'}</TableCell>
                              <TableCell>{patent.full_name}</TableCell>
                              <TableCell>{patent.phone_number || '-'}</TableCell>
                              <TableCell>{patent.category_of_patent_owner}</TableCell>
                              <TableCell>{patent.patent_date ? formatDate(patent.patent_date) : '-'}</TableCell>
                              <TableCell>
                                {getPatentDefenseStatusBadge(patent.defense_status || 'pending', patent.id)}
                              </TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="w-20"
                                    value={editingScores[editKey]}
                                    onChange={(e) => setEditingScores(prev => ({
                                      ...prev,
                                      [editKey]: e.target.value
                                    }))}
                                  />
                                ) : (
                                  <span className="font-semibold text-green-600">
                                    {patent.score}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {getApprovalStatusBadge(patent.approval_status || 'pending')}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-1">
                                  {studentData.overall_approval_status === 'approved' ? (
                                    <div className="flex items-center text-sm text-gray-500">
                                      <span className="bg-gray-100 px-2 py-1 rounded text-xs">已锁定</span>
                                    </div>
                                  ) : (
                                    <>
                                      {isEditing ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => saveScore('patent', patent.id)}
                                            disabled={loading}
                                          >
                                            <Check className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => cancelEditScore('patent', patent.id)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditPatent(patent)}
                                            title="编辑专利信息"
                                            className="border-purple-500 text-purple-600 hover:bg-purple-50"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveRecord('patent', patent.id, 'approved')}
                                        disabled={approvalLoading[`patent-${patent.id}`] || (patent.approval_status || 'pending') === 'approved'}
                                        className="bg-green-600 hover:bg-green-700"
                                        title="审核通过"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveRecord('patent', patent.id, 'rejected')}
                                        disabled={approvalLoading[`patent-${patent.id}`] || (patent.approval_status || 'pending') === 'rejected'}
                                        variant="destructive"
                                        title="审核拒绝"
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </Button>
                                      {(patent.approval_status || 'pending') !== 'pending' && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleApproveRecord('patent', patent.id, 'pending')}
                                          disabled={approvalLoading[`patent-${patent.id}`]}
                                          variant="outline"
                                          className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                          title="重置为待审核"
                                        >
                                          <Clock className="h-3 w-3" />
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        onClick={() => handleDeleteRecord('patent', patent.id, patent.patent_name)}
                                        disabled={loading}
                                        variant="outline"
                                        className="border-red-500 text-red-600 hover:bg-red-50"
                                        title="删除专利记录"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
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
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="h-5 w-5 mr-2" />
                    竞赛获奖信息
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>竞赛名称</TableHead>
                          <TableHead>竞赛地区</TableHead>
                          <TableHead>竞赛级别</TableHead>
                          <TableHead>姓名</TableHead>
                          <TableHead>手机号</TableHead>
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
                              <TableCell>
                                <Badge variant="outline">{competition.competition_level}</Badge>
                              </TableCell>
                              <TableCell>{competition.full_name}</TableCell>
                              <TableCell>{competition.phone_number || '-'}</TableCell>
                              <TableCell>{competition.note || '-'}</TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="w-20"
                                    value={editingScores[editKey]}
                                    onChange={(e) => setEditingScores(prev => ({
                                      ...prev,
                                      [editKey]: e.target.value
                                    }))}
                                  />
                                ) : (
                                  <span className="font-semibold text-orange-600">
                                    {competition.score}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {getApprovalStatusBadge(competition.approval_status || 'pending')}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-1">
                                  {studentData.overall_approval_status === 'approved' ? (
                                    <div className="flex items-center text-sm text-gray-500">
                                      <span className="bg-gray-100 px-2 py-1 rounded text-xs">已锁定</span>
                                    </div>
                                  ) : (
                                    <>
                                      {isEditing ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => saveScore('competition', competition.id)}
                                            disabled={loading}
                                          >
                                            <Check className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => cancelEditScore('competition', competition.id)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditCompetition(competition)}
                                            title="编辑竞赛信息"
                                            className="border-purple-500 text-purple-600 hover:bg-purple-50"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveRecord('competition', competition.id, 'approved')}
                                        disabled={approvalLoading[`competition-${competition.id}`] || (competition.approval_status || 'pending') === 'approved'}
                                        className="bg-green-600 hover:bg-green-700"
                                        title="审核通过"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveRecord('competition', competition.id, 'rejected')}
                                        disabled={approvalLoading[`competition-${competition.id}`] || (competition.approval_status || 'pending') === 'rejected'}
                                        variant="destructive"
                                        title="审核拒绝"
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </Button>
                                      {(competition.approval_status || 'pending') !== 'pending' && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleApproveRecord('competition', competition.id, 'pending')}
                                          disabled={approvalLoading[`competition-${competition.id}`]}
                                          variant="outline"
                                          className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                          title="重置为待审核"
                                        >
                                          <Clock className="h-3 w-3" />
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        onClick={() => handleDeleteRecord('competition', competition.id, competition.competition_name)}
                                        disabled={loading}
                                        variant="outline"
                                        className="border-red-500 text-red-600 hover:bg-red-50"
                                        title="删除竞赛记录"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
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

            {/* 如果没有数据 */}
            {studentData.total.papers === 0 && studentData.total.patents === 0 && studentData.total.competitions === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>该学生暂无论文发表、专利申请或竞赛获奖信息</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 总加分表 */}
        {showScoreTable && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                推免加分总表 - 前10名
                <Badge variant="outline" className="ml-2">
                  显示前 {comprehensiveScores.length} 名
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">排名</TableHead>
                      <TableHead>学号</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>班级</TableHead>
                      <TableHead>论文分数</TableHead>
                      <TableHead>专利分数</TableHead>
                      <TableHead>竞赛分数</TableHead>
                      <TableHead>论文+专利小计</TableHead>
                      <TableHead className="font-bold">总加分</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comprehensiveScores.map((score, index) => (
                      <TableRow key={score.id} className={index < 3 ? 'bg-yellow-50' : ''}>
                        <TableCell className="font-medium">
                          {index + 1}
                          {index === 0 && <span className="ml-1 text-yellow-500">🥇</span>}
                          {index === 1 && <span className="ml-1 text-gray-400">🥈</span>}
                          {index === 2 && <span className="ml-1 text-orange-600">🥉</span>}
                        </TableCell>
                        <TableCell className="font-mono">{score.bupt_student_id}</TableCell>
                        <TableCell className="font-medium">{score.full_name}</TableCell>
                        <TableCell>{score.class}</TableCell>
                        <TableCell>
                          <span className="text-blue-600 font-semibold">
                            {score.paper_score.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-green-600 font-semibold">
                            {score.patent_score.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-orange-600 font-semibold">
                            {score.competition_score.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-purple-600 font-semibold">
                            {score.paper_patent_total.toFixed(2)}
                            {score.paper_patent_total >= 3 && (
                              <Badge variant="outline" className="ml-1 text-xs">
                                已封顶
                              </Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-600 font-bold text-lg">
                            {score.total_score.toFixed(2)}
                            {score.total_score >= 4 && (
                              <Badge variant="outline" className="ml-1 text-xs">
                                已封顶
                              </Badge>
                            )}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {comprehensiveScores.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无总加分数据，请先生成总加分表</p>
                </div>
              )}
              
              <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">加分规则说明：</h4>
                <ul className="space-y-1">
                  <li>• 论文分数 + 专利分数 ≤ 3分（超出部分不计入）</li>
                  <li>• 总加分（论文+专利+竞赛）≤ 4分（超出部分不计入）</li>
                  <li>• 表格按总加分降序排列，只显示前10名学生</li>
                  <li>• 前三名有特殊标识：🥇🥈🥉</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 智育成绩表 */}
        {showAcademicTable && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                智育成绩表 - 前10名
                <Badge variant="outline" className="ml-2">
                  显示 {filteredAcademicScores.length} 条记录
                  {academicProgrammeFilter && ` (${academicProgrammeFilter})`}
                </Badge>
                {availableProgrammes.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {availableProgrammes.length} 个专业
                  </Badge>
                )}
              </CardTitle>
              {/* 专业过滤器 */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">专业选择：</label>
                  <select
                    value={academicProgrammeFilter}
                    onChange={(e) => setAcademicProgrammeFilter(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableProgrammes.map(programme => (
                      <option key={programme} value={programme}>
                        {programme}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>学号</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>专业</TableHead>
                      <TableHead>班级</TableHead>
                      <TableHead>加权均分</TableHead>
                      <TableHead>GPA</TableHead>
                      <TableHead>专业排名</TableHead>
                      <TableHead>专业总人数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAcademicScores.map((score, index) => (
                      <TableRow key={score.id || index}>
                        <TableCell className="font-medium">{score.bupt_student_id}</TableCell>
                        <TableCell>{score.full_name}</TableCell>
                        <TableCell>{score.programme || '-'}</TableCell>
                        <TableCell>{score.class || '-'}</TableCell>
                        <TableCell>{score.weighted_average || 0}</TableCell>
                        <TableCell>{score.gpa || 0}</TableCell>
                        <TableCell>
                          {score.programme_rank ? (
                            <Badge variant="secondary">
                              第 {score.programme_rank} 名
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{score.programme_total || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {academicScores.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无智育成绩数据，请先导入智育成绩
                </div>
              ) : filteredAcademicScores.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  当前专业 "{academicProgrammeFilter}" 暂无数据
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* 综合排名表 */}
        {showRankingTable && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                综合排名表 - 前10名
                <Badge variant="outline" className="ml-2">
                  显示 {filteredRankings.length} 条记录
                  {rankingProgrammeFilter && ` (${rankingProgrammeFilter})`}
                </Badge>
              </CardTitle>
              {/* 专业过滤器 */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">专业选择：</label>
                  <select
                    value={rankingProgrammeFilter}
                    onChange={(e) => setRankingProgrammeFilter(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {availableProgrammes.map(programme => (
                      <option key={programme} value={programme}>
                        {programme}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>综合排名</TableHead>
                      <TableHead>学号</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>专业</TableHead>
                      <TableHead>班级</TableHead>
                      <TableHead>智育成绩</TableHead>
                      <TableHead>推免加分加分</TableHead>
                      <TableHead>综合成绩</TableHead>
                      <TableHead>排名百分比</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRankings.map((ranking, index) => (
                      <TableRow key={ranking.id || index}>
                        <TableCell>
                          <div className="flex items-center">
                            {ranking.overall_rank === 1 && <span className="mr-1">🥇</span>}
                            {ranking.overall_rank === 2 && <span className="mr-1">🥈</span>}
                            {ranking.overall_rank === 3 && <span className="mr-1">🥉</span>}
                            <Badge variant={ranking.overall_rank <= 3 ? "default" : "secondary"}>
                              第 {ranking.overall_rank} 名
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{ranking.bupt_student_id}</TableCell>
                        <TableCell>{ranking.full_name}</TableCell>
                        <TableCell>{ranking.programme || '-'}</TableCell>
                        <TableCell>{ranking.class || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50">
                            {ranking.academic_weighted_average}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50">
                            +{ranking.practice_extra_points}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-purple-600">
                            {ranking.academic_practice_total}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ranking.overall_rank_percentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {comprehensiveRankings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无综合排名数据，请先生成综合排名
                </div>
              ) : filteredRankings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  当前专业 "{rankingProgrammeFilter}" 暂无数据
                </div>
              ) : null}
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">综测计算规则：</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>智育成绩</strong>：学生的加权均分</li>
                  <li>• <strong>推免加分加分</strong>：论文、专利、竞赛的实践活动加分（最高4分）</li>
                  <li>• <strong>综合成绩</strong>：智育成绩 + 推免加分加分</li>
                  <li>• <strong>排名</strong>：按专业内综合成绩降序排列</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 论文编辑表单 */}
      {showPaperEditForm && editingPaper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">编辑论文信息</h3>
              <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSavePaper}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">论文标题</label>
                  <input 
                    name="paper_title"
                    type="text" 
                    required
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingPaper.paper_title || ""}
                    placeholder="请输入论文标题"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">期刊名称</label>
                  <input 
                    name="journal_name"
                    type="text" 
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPaper.journal_name || ""}
                    placeholder="请输入期刊名称"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">期刊类别</label>
                  <select 
                    name="journal_category"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPaper.journal_category || ""}
                  >
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
                  <label className="block text-sm font-medium mb-1">手机号</label>
                  <input 
                    name="phone_number"
                    type="tel"
                    pattern="^1[3-9]\d{9}$"
                    maxLength={11}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPaper.phone_number || ""}
                    placeholder="请输入11位手机号"
                  />
                  <p className="text-xs text-gray-500 mt-1">请输入11位手机号码</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">作者类型</label>
                  <select 
                    name="author_type"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPaper.author_type || ""}
                  >
                    <option value="">请选择作者类型</option>
                    <option value="独立作者">独立作者</option>
                    <option value="第一作者">第一作者</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">发布日期</label>
                  <input 
                    name="publish_date"
                    type="month" 
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={(() => {
                      if (!editingPaper.publish_date) return "";
                      const date = editingPaper.publish_date;
                      // 如果是完整日期格式 YYYY-MM-DD，提取年月部分
                      if (date.includes('-') && date.length >= 7) {
                        return date.substring(0, 7); // 提取 YYYY-MM
                      }
                      return date;
                    })()}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">备注</label>
                  <textarea 
                    name="note"
                    rows={3}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPaper.note || ""}
                    placeholder="请输入备注信息"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">推免加分加分</label>
                  <input 
                    name="score"
                    type="number" 
                    step="0.1"
                    min="0"
                    max="10"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPaper.score || ""}
                    placeholder="请输入推免加分加分（0-10分）"
                  />
                  <p className="text-xs text-gray-500 mt-1">推免加分加分范围：0-10分，支持小数</p>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={loading}>取消</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? '保存中...' : '保存'}
                  </Button>
                </div>
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
              <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSavePatent}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">专利名称</label>
                  <input 
                    name="patent_name"
                    type="text" 
                    required
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingPatent.patent_name || ""}
                    placeholder="请输入专利名称"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">专利号</label>
                  <input 
                    name="patent_number"
                    type="text" 
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPatent.patent_number || ""}
                    placeholder="请输入专利号"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">申请日期</label>
                  <input 
                    name="patent_date"
                    type="month" 
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={(() => {
                      if (!editingPatent.patent_date) return "";
                      const date = editingPatent.patent_date;
                      // 如果是完整日期格式 YYYY-MM-DD，提取年月部分
                      if (date.includes('-') && date.length >= 7) {
                        return date.substring(0, 7); // 提取 YYYY-MM
                      }
                      return date;
                    })()}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">手机号</label>
                  <input 
                    name="phone_number"
                    type="tel"
                    pattern="^1[3-9]\d{9}$"
                    maxLength={11}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPatent.phone_number || ""}
                    placeholder="请输入11位手机号"
                  />
                  <p className="text-xs text-gray-500 mt-1">请输入11位手机号码</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">答辩状态</label>
                  <select 
                    name="defense_status"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPatent.defense_status || 'pending'}
                  >
                    <option value="pending">待答辩</option>
                    <option value="passed">已通过</option>
                    <option value="failed">未通过</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">发明人类型</label>
                  <select 
                    name="category_of_patent_owner"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPatent.category_of_patent_owner || ""}
                  >
                    <option value="">请选择发明人类型</option>
                    <option value="独立发明人">独立发明人</option>
                    <option value="第一发明人（多人）">第一发明人（多人）</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">备注</label>
                  <textarea 
                    name="note"
                    rows={3}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPatent.note || ""}
                    placeholder="请输入备注信息"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">推免加分加分</label>
                  <input 
                    name="score"
                    type="number" 
                    step="0.1"
                    min="0"
                    max="10"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    defaultValue={editingPatent.score || ""}
                    placeholder="请输入推免加分加分（0-10分）"
                  />
                  <p className="text-xs text-gray-500 mt-1">推免加分加分范围：0-10分，支持小数</p>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={loading}>取消</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 竞赛编辑表单 */}
      {showCompetitionEditForm && editingCompetition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">编辑竞赛信息</h3>
              <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSaveCompetition}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">竞赛名称</label>
                  <input 
                    name="competition_name"
                    type="text" 
                    required
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={competitionFormData.competition_name}
                    onChange={(e) => setCompetitionFormData(prev => ({ ...prev, competition_name: e.target.value }))}
                    placeholder="请输入竞赛名称"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">竞赛地区</label>
                  <select 
                    name="competition_region"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={competitionFormData.competition_region}
                    onChange={(e) => setCompetitionFormData(prev => ({ ...prev, competition_region: e.target.value }))}
                  >
                    <option value="">请选择竞赛地区</option>
                    <option value="国际">国际</option>
                    <option value="国家级">国家级</option>
                    <option value="省级">省级</option>
                    <option value="市级">市级</option>
                    <option value="校级">校级</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">竞赛级别 <span className="text-red-500">*</span></label>
                  <select 
                    name="competition_level"
                    required
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={competitionFormData.competition_level}
                    onChange={(e) => setCompetitionFormData(prev => ({ ...prev, competition_level: e.target.value }))}
                  >
                    <option value="">请选择竞赛级别</option>
                    <option value="S">S</option>
                    <option value="A+">A+</option>
                    <option value="A">A</option>
                    <option value="B+">B+</option>
                    <option value="B">B</option>
                    <option value="C+">C+</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">S级最高，依次为A+、A、B+、B、C+、C、D</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">手机号</label>
                  <input 
                    name="phone_number"
                    type="tel"
                    pattern="^1[3-9]\d{9}$"
                    maxLength={11}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={competitionFormData.phone_number}
                    onChange={(e) => setCompetitionFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="请输入11位手机号"
                  />
                  <p className="text-xs text-gray-500 mt-1">请输入11位手机号码</p>
                </div>
                
                
                <div>
                  <label className="block text-sm font-medium mb-1">备注</label>
                  <textarea 
                    name="note"
                    rows={3}
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={competitionFormData.note}
                    onChange={(e) => setCompetitionFormData(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="请输入备注信息"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">推免加分加分</label>
                  <input 
                    name="score"
                    type="number" 
                    step="0.1"
                    min="0"
                    max="10"
                    className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={competitionFormData.score}
                    onChange={(e) => setCompetitionFormData(prev => ({ ...prev, score: e.target.value }))}
                    placeholder="请输入推免加分加分"
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={loading}>取消</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
