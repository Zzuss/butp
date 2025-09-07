"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, Download, Trash2, FileText, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface EducationPlan {
  name: string
  year: string
  size: number
  lastModified: string
}

export default function EducationPlanPage() {
  const [plans, setPlans] = useState<EducationPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadYear, setUploadYear] = useState('')

  // 获取所有培养方案
  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/education-plan')
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error)
      setMessage({ type: 'error', text: '获取培养方案列表失败' })
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setMessage({ type: 'error', text: '请选择 PDF 文件' })
        return
      }
      setSelectedFile(file)
    }
  }

  // 上传文件
  const handleUpload = async () => {
    if (!selectedFile || !uploadYear) {
      setMessage({ type: 'error', text: '请选择文件并输入年份' })
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('year', uploadYear)

    setLoading(true)
    try {
      const response = await fetch('/api/education-plan/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setMessage({ type: 'success', text: '培养方案上传成功' })
        setSelectedFile(null)
        setUploadYear('')
        fetchPlans()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.message || '上传失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '上传失败，请重试' })
    } finally {
      setLoading(false)
    }
  }

  // 删除文件
  const handleDelete = async (filename: string) => {
    if (!confirm('确定要删除这个培养方案吗？')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/education-plan/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: '培养方案删除成功' })
        fetchPlans()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.message || '删除失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '删除失败，请重试' })
    } finally {
      setLoading(false)
    }
  }

  // 下载文件
  const handleDownload = (filename: string) => {
    const url = `/Education_Plan_PDF/${filename}`
    window.open(url, '_blank')
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6" />
        <h1 className="text-3xl font-bold">培养方案管理</h1>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* 上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle>上传培养方案</CardTitle>
          <CardDescription>
            上传新的培养方案文件，文件将以 "Education_Plan_PDF_年份.pdf" 的格式命名
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="year" className="block text-sm font-medium mb-2">
                年份
              </label>
              <Input
                id="year"
                type="number"
                placeholder="例如: 2024"
                value={uploadYear}
                onChange={(e) => setUploadYear(e.target.value)}
                min="2000"
                max="2030"
              />
            </div>
            <div>
              <label htmlFor="file" className="block text-sm font-medium mb-2">
                选择PDF文件
              </label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || !uploadYear || loading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {loading ? '上传中...' : '上传文件'}
              </Button>
            </div>
          </div>
          
          {selectedFile && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                选中文件: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
              <p className="text-sm text-gray-600">
                将保存为: Education_Plan_PDF_{uploadYear}.pdf
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 培养方案列表 */}
      <Card>
        <CardHeader>
          <CardTitle>现有培养方案</CardTitle>
          <CardDescription>
            管理现有的培养方案文件
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无培养方案文件
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>文件名</TableHead>
                  <TableHead>年份</TableHead>
                  <TableHead>文件大小</TableHead>
                  <TableHead>修改时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.name}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-500" />
                        {plan.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{plan.year}</Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(plan.size)}</TableCell>
                    <TableCell>{new Date(plan.lastModified).toLocaleString('zh-CN')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(plan.name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(plan.name)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
