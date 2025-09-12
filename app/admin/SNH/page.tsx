'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, Upload, FileSpreadsheet, Download, Trash2 } from 'lucide-react'

interface UploadResult {
  success: boolean
  message: string
  processed: number
  errors: string[]
}

export default function SNHAdminPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadResult(null)
    }
  }

  // 上传文件
  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/admin/snh/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setUploadResult({
          success: true,
          message: result.message,
          processed: result.processed,
          errors: result.errors || []
        })
        // 清空文件选择
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setUploadResult({
          success: false,
          message: result.error || '上传失败',
          processed: 0,
          errors: result.errors || []
        })
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: '网络错误，请重试',
        processed: 0,
        errors: [error instanceof Error ? error.message : '未知错误']
      })
    }

    setUploading(false)
    setUploadProgress(100)
  }

  // 清空所有映射
  const handleClearAll = async () => {
    if (!confirm('确定要清空所有学号哈希值映射吗？此操作不可恢复！')) {
      return
    }

    setDeleteLoading(true)
    try {
      const response = await fetch('/api/admin/snh/clear', {
        method: 'DELETE'
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message)
      } else {
        const error = await response.json()
        alert('清空失败: ' + error.error)
      }
    } catch (error) {
      alert('网络错误，请重试')
    }
    setDeleteLoading(false)
  }

  // 下载模板
  const handleDownloadTemplate = () => {
    // 创建模板数据
    const templateData = [
      ['SN', 'SNH'],
      ['示例学号1', '示例哈希值1'],
      ['示例学号2', '示例哈希值2']
    ]

    // 转换为CSV格式
    const csvContent = templateData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'SN_SNH_Template.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">学号哈希值映射管理</h1>
        <p className="text-muted-foreground mt-2">
          管理学号与哈希值的映射关系，支持上传Excel文件批量导入
        </p>
      </div>

      {/* 文件上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            上传映射文件
          </CardTitle>
          <CardDescription>
            支持上传Excel(.xlsx)或CSV文件，文件应包含SN（学号）和SNH（哈希值）两列
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载模板
            </Button>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="file">选择文件</Label>
            <Input
              ref={fileInputRef}
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </div>

          {file && (
            <div className="flex items-center gap-4">
              <FileSpreadsheet className="w-5 h-5 text-blue-500" />
              <span className="text-sm">{file.name}</span>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="ml-auto"
              >
                {uploading ? '上传中...' : '开始上传'}
              </Button>
            </div>
          )}

          {uploading && (
            <Progress value={uploadProgress} className="w-full" />
          )}

          {uploadResult && (
            <Alert className={uploadResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {uploadResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p>{uploadResult.message}</p>
                    {uploadResult.processed > 0 && (
                      <p>成功处理 {uploadResult.processed} 条记录</p>
                    )}
                    {uploadResult.errors.length > 0 && (
                      <div>
                        <p className="font-semibold">错误信息：</p>
                        <pre className="mt-2 h-24 p-3 text-xs bg-gray-100 rounded-md overflow-auto border">
                          {uploadResult.errors.join('\n')}
                        </pre>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 清空映射表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            危险操作
          </CardTitle>
          <CardDescription>
            清空所有学号哈希值映射记录，此操作不可恢复
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleClearAll}
            disabled={deleteLoading}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {deleteLoading ? '清空中...' : '清空所有映射记录'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
