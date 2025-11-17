"use client"

import React, { useState } from 'react'
import { Search, FileText, Award, Edit, Save, X, Check, Trophy, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import AdminLayout from '@/components/admin/AdminLayout'

interface Paper {
  id: string
  paper_title: string
  journal_name: string
  journal_category: string
  bupt_student_id: string
  full_name: string
  class: string | number
  author_type: string
  publish_date: string
  note?: string
  score: string | number  // 数据库中是text类型，但可能包含数字字符串
  created_at: string
  updated_at: string
}

interface Patent {
  id: string
  patent_name: string
  patent_number?: string
  patent_date: string
  bupt_student_id: string
  class: string | number
  full_name: string
  category_of_patent_owner: string
  note?: string
  score: string | number  // 数据库中是text类型，但可能包含数字字符串
  created_at: string
  updated_at: string
}

interface Competition {
  id: string
  competition_region: string
  competition_level: string
  competition_name: string
  bupt_student_id: string
  full_name: string
  class: string
  note: string
  score: number
  created_at: string
  updated_at: string
}

interface StudentData {
  studentId: string
  papers: Paper[]
  patents: Patent[]
  competitions: Competition[]
  total: {
    papers: number
    patents: number
    competitions: number
  }
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

export default function ComprehensiveEvaluationPage() {
  const [studentId, setStudentId] = useState('')
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingScores, setEditingScores] = useState<{ [key: string]: string }>({})
  
  // 总加分表相关状态
  const [showScoreTable, setShowScoreTable] = useState(false)
  const [comprehensiveScores, setComprehensiveScores] = useState<ComprehensiveScore[]>([])
  const [generateLoading, setGenerateLoading] = useState(false)
  
  // 智育成绩相关状态
  const [academicScores, setAcademicScores] = useState<any[]>([])
  const [showAcademicTable, setShowAcademicTable] = useState(false)
  const [academicImportLoading, setAcademicImportLoading] = useState(false)
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append')
  
  // 综测排名相关状态
  const [comprehensiveRankings, setComprehensiveRankings] = useState<any[]>([])
  const [showRankingTable, setShowRankingTable] = useState(false)
  const [rankingGenerateLoading, setRankingGenerateLoading] = useState(false)

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

  // 生成德育总表
  const handleGenerateScoreTable = async () => {
    setGenerateLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/moral-education-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '生成德育总表失败')
      }

      const result = await response.json()
      setSuccess(`${result.message}`)
      
      // 生成成功后自动显示德育总表
      await loadScoreTable()
      setShowScoreTable(true)
      
      // 3秒后清除成功消息
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('生成德育总表失败:', err)
      setError(err instanceof Error ? err.message : '生成德育总表失败')
    } finally {
      setGenerateLoading(false)
    }
  }

  // 导出德育总表CSV
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
      
      setSuccess('德育总表导出成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('导出失败:', err)
      setError('导出德育总表失败')
    }
  }

  // 加载德育总表（只显示前10名）
  const loadScoreTable = async () => {
    try {
      const response = await fetch('/api/admin/moral-education-scores?limit=10')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取德育总表失败')
      }

      const result = await response.json()
      // 按总分降序排列并只取前10名
      const sortedScores = (result.data || [])
        .sort((a: any, b: any) => b.total_score - a.total_score)
        .slice(0, 10)
      setComprehensiveScores(sortedScores)
    } catch (err) {
      console.error('获取德育总表失败:', err)
      setError(err instanceof Error ? err.message : '获取德育总表失败')
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
      // 这里应该解析CSV/Excel文件，暂时用示例数据
      const formData = new FormData()
      formData.append('file', file)

      // 实际项目中需要先解析文件内容，然后发送JSON数据
      // 这里简化处理，假设有解析后的数据
      const sampleData = [
        {
          bupt_student_id: '2021001',
          full_name: '张三',
          programme: '计算机科学与技术',
          class: '计科2101',
          weighted_average: 85.5,
          gpa: 3.8,
          programme_rank: 5,
          programme_total: 120
        }
      ]

      const response = await fetch('/api/admin/academic-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          academicScores: sampleData,
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
      const response = await fetch('/api/admin/academic-scores?limit=20')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取智育成绩失败')
      }

      const result = await response.json()
      setAcademicScores(result.data || [])
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

  // 生成综测排名表
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
        throw new Error(errorData.error || '生成综测排名失败')
      }

      const result = await response.json()
      setSuccess(`${result.message}`)
      
      // 生成成功后自动显示排名表
      await loadRankings()
      setShowRankingTable(true)
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('生成综测排名失败:', err)
      setError(err instanceof Error ? err.message : '生成综测排名失败')
    } finally {
      setRankingGenerateLoading(false)
    }
  }

  // 加载综测排名
  const loadRankings = async () => {
    try {
      const response = await fetch('/api/admin/comprehensive-ranking?topN=20')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取综测排名失败')
      }

      const result = await response.json()
      setComprehensiveRankings(result.data || [])
    } catch (err) {
      console.error('获取综测排名失败:', err)
      setError(err instanceof Error ? err.message : '获取综测排名失败')
    }
  }

  // 显示综测排名表
  const handleShowRankingTable = async () => {
    if (!showRankingTable) {
      await loadRankings()
    }
    setShowRankingTable(!showRankingTable)
  }

  // 导出综测排名CSV
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
      
      setSuccess('综测排名导出成功')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('导出失败:', err)
      setError('导出综测排名失败')
    }
  }

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
    return new Date(dateString).toLocaleDateString('zh-CN')
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

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">综评成绩管理</h1>
          <p className="text-gray-600">管理学生论文发表、专利申请和竞赛获奖的综合评价加分，生成德育总表用于与智育成绩合并</p>
        </div>

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
              <Button 
                onClick={handleDebug} 
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                调试
              </Button>
              <Button 
                onClick={handleGenerateScoreTable} 
                disabled={generateLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {generateLoading ? '生成中...' : '生成德育总表'}
              </Button>
              <Button 
                onClick={handleShowScoreTable} 
                variant="outline"
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                {showScoreTable ? '隐藏德育总表' : '查看德育总表'}
              </Button>
              <Button 
                onClick={handleExportMoralScores} 
                variant="outline"
                className="border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                导出德育总表CSV
              </Button>
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
                    <Badge variant="outline" className="ml-2 text-xs">推荐</Badge>
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
                    <Badge variant="destructive" className="ml-2 text-xs">谨慎</Badge>
                  </label>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {importMode === 'append' ? (
                    <span>• 相同学号的学生数据会被更新，不同学号会新增，不会删除现有其他数据</span>
                  ) : (
                    <span className="text-red-600">• ⚠️ 将清空所有现有数据，然后导入新数据（不可恢复）</span>
                  )}
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
            
            {/* 综测排名管理 */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              <Button 
                onClick={handleGenerateRanking} 
                disabled={rankingGenerateLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {rankingGenerateLoading ? '生成中...' : '生成综测排名'}
              </Button>
              <Button 
                onClick={handleShowRankingTable} 
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                {showRankingTable ? '隐藏综测排名' : '查看综测排名'}
              </Button>
              <Button 
                onClick={handleExportRanking} 
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                导出综测排名CSV
              </Button>
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

        {/* 学生信息展示 */}
        {studentData && (
          <div className="space-y-6">
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
                          <TableHead>班级</TableHead>
                          <TableHead>作者类型</TableHead>
                          <TableHead>发布日期</TableHead>
                          <TableHead>分数</TableHead>
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
                              <TableCell>{paper.class}</TableCell>
                              <TableCell>{paper.author_type}</TableCell>
                              <TableCell>{formatDate(paper.publish_date)}</TableCell>
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
                                {isEditing ? (
                                  <div className="flex space-x-1">
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
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditScore('paper', paper.id, paper.score)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
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
                          <TableHead>班级</TableHead>
                          <TableHead>发明人类型</TableHead>
                          <TableHead>申请日期</TableHead>
                          <TableHead>分数</TableHead>
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
                              <TableCell>{patent.class}</TableCell>
                              <TableCell>{patent.category_of_patent_owner}</TableCell>
                              <TableCell>{formatDate(patent.patent_date)}</TableCell>
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
                                {isEditing ? (
                                  <div className="flex space-x-1">
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
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditScore('patent', patent.id, patent.score)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
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
                          <TableHead>班级</TableHead>
                          <TableHead>备注</TableHead>
                          <TableHead>分数</TableHead>
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
                              <TableCell>{competition.class}</TableCell>
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
                                {isEditing ? (
                                  <div className="flex space-x-1">
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
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditScore('competition', competition.id, competition.score)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
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
                德育总表 - 前10名
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
                智育成绩表
                <Badge variant="outline" className="ml-2">
                  显示 {academicScores.length} 条记录
                </Badge>
              </CardTitle>
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
                    {academicScores.map((score, index) => (
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
              {academicScores.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  暂无智育成绩数据，请先导入智育成绩
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 综测排名表 */}
        {showRankingTable && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                综测排名表 - 前20名
                <Badge variant="outline" className="ml-2">
                  显示前 {comprehensiveRankings.length} 名
                </Badge>
              </CardTitle>
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
                      <TableHead>德育加分</TableHead>
                      <TableHead>综合成绩</TableHead>
                      <TableHead>排名百分比</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comprehensiveRankings.map((ranking, index) => (
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
              {comprehensiveRankings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  暂无综测排名数据，请先生成综测排名
                </div>
              )}
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">综测计算规则：</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>智育成绩</strong>：学生的加权均分</li>
                  <li>• <strong>德育加分</strong>：论文、专利、竞赛的实践活动加分（最高4分）</li>
                  <li>• <strong>综合成绩</strong>：智育成绩 + 德育加分</li>
                  <li>• <strong>排名</strong>：按专业内综合成绩降序排列</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
