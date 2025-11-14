"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, Download, Trash2, FileText, AlertCircle, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import AdminLayout from '@/components/admin/AdminLayout'

interface EducationPlan {
  name: string
  year: string
  size: number
  lastModified: string
  url?: string
}

export default function AdminEducationPlanPage() {
  const [plans, setPlans] = useState<EducationPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadYear, setUploadYear] = useState('')
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [duplicateFileName, setDuplicateFileName] = useState('')
  const [hasFileNameConflict, setHasFileNameConflict] = useState(false)

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

  // 检查文件名是否重复
  const checkFileNameDuplicate = (fileName: string) => {
    return plans.some(plan => plan.name === fileName)
  }

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 重置状态
      setMessage(null)
      setHasFileNameConflict(false)
      setShowDuplicateDialog(false)
      setDuplicateFileName('')

      if (file.type !== 'application/pdf') {
        setMessage({ type: 'error', text: '请选择 PDF 文件' })
        return
      }

      // 检查文件名重复（基于原文件名，不是重命名后的文件名）
      if (checkFileNameDuplicate(file.name)) {
        setDuplicateFileName(file.name)
        setHasFileNameConflict(true)
        setShowDuplicateDialog(true)
        setSelectedFile(null)
        // 清空文件输入
        event.target.value = ''
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

    // 检查是否有文件名冲突
    if (hasFileNameConflict) {
      setMessage({ type: 'error', text: '存在文件名冲突，请重新选择文件' })
      return
    }

    // 验证文件类型
    if (selectedFile.type !== 'application/pdf') {
      setMessage({ type: 'error', text: '请选择 PDF 文件' })
      return
    }

    // 验证年份格式
    if (!/^\d{4}$/.test(uploadYear)) {
      setMessage({ type: 'error', text: '年份格式不正确' })
      return
    }

    // 检查文件大小（50MB = 52428800 bytes）
    if (selectedFile.size > 52428800) {
      setMessage({ type: 'error', text: '文件大小不能超过 50MB' })
      return
    }

    const filename = `Education_Plan_PDF_${uploadYear}.pdf`

    setLoading(true)
    try {
      // 再次检查文件名是否重复（基于原始文件名）
      if (checkFileNameDuplicate(selectedFile.name)) {
        setMessage({ type: 'error', text: '文件名已存在，请先删除旧文件或重新选择文件' })
        setLoading(false)
        return
      }

      // 检查是否已存在相同年份的文件
      console.log('🔍 检查文件是否已存在...')
      const existingPlans = plans
      const existingPlan = existingPlans.find(plan => plan.year === uploadYear)
      
      if (existingPlan) {
        setMessage({ type: 'error', text: `${uploadYear} 年的培养方案已存在，请先删除后再上传` })
        setLoading(false)
        return
      }

      // 客户端直接上传到 Supabase Storage
      console.log('☁️ 直接上传到 Supabase Storage...')
      
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY!
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      const { data, error } = await supabase.storage
        .from('education-plans')
        .upload(filename, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        })

      if (error) {
        console.error('❌ 上传失败:', error)
        
        let errorMessage = '上传失败，请重试'
        if (error.message.includes('already exists')) {
          errorMessage = '文件已存在，请先删除后再上传'
        } else if (error.message.includes('size')) {
          errorMessage = '文件大小超过限制'
        } else if (error.message.includes('permission')) {
          errorMessage = '没有上传权限'
        }
        
        setMessage({ type: 'error', text: errorMessage })
        return
      }

      console.log('✅ 上传成功:', data)
      setMessage({ type: 'success', text: '培养方案上传成功' })
      setSelectedFile(null)
      setUploadYear('')
      
      // 重新获取文件列表
      fetchPlans()

    } catch (error) {
      console.error('💥 上传过程中发生错误:', error)
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
  const handleDownload = (plan: EducationPlan) => {
    if (plan.url) {
      // 使用 Supabase Storage 的公开 URL
      window.open(plan.url, '_blank')
    } else {
      // 回退到本地路径（兼容性）
      const url = `/Education_Plan_PDF/${plan.name}`
      window.open(url, '_blank')
    }
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
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-3xl font-bold">培养方案管理</h1>
        </div>

        {/* 文件名重复警告弹窗 */}
        <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                文件名重复警告
              </DialogTitle>
              <DialogDescription>
                您选择的文件名 "<span className="font-semibold text-gray-900">{duplicateFileName}</span>" 与已存在的文件重复。
                <br />
                如需替换此文件，请先删除旧文件再上传新文件。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDuplicateDialog(false)}
              >
                我知道了
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                  disabled={!selectedFile || !uploadYear || loading || hasFileNameConflict}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {loading ? '上传中...' : hasFileNameConflict ? '文件名冲突' : '上传文件'}
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
                            onClick={() => handleDownload(plan)}
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
    </AdminLayout>
  )
}
