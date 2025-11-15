"use client"

import React, { useState } from 'react'
import { Search, FileText, Award, Edit, Save, X, Check, Trophy } from 'lucide-react'
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

export default function ComprehensiveEvaluationPage() {
  const [studentId, setStudentId] = useState('')
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingScores, setEditingScores] = useState<{ [key: string]: string }>({})

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
          <p className="text-gray-600">管理学生论文发表、专利申请和竞赛获奖的综合评价加分</p>
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
      </div>
    </AdminLayout>
  )
}



