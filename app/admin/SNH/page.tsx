'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, Upload, FileSpreadsheet, Download, Trash2, UserCheck } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'

interface UploadResult {
  success: boolean
  message: string
  processed: number
  total?: number
  fileRows?: number
  skipped?: number
  errors: string[]
}

export default function SNHAdminPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null)
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
    
    // 保存最后上传的文件，用于重试
    setLastUploadedFile(file)

    // 模拟进度更新
    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 85) return prev + Math.random() * 15
        return prev
      })
    }, 500)

    try {
      const response = await fetch('/api/admin/snh/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      // 清除进度定时器
      clearInterval(progressTimer)
      setUploadProgress(100)

      if (response.ok) {
        const hasErrors = result.errors && result.errors.length > 0
        const successCount = result.processed || 0
        const totalCount = result.total || 0
        
        setUploadResult({
          success: !hasErrors || successCount > 0, // 如果有部分成功也算成功
          message: hasErrors ? 
            `处理完成，但有 ${result.errors.length} 条记录失败` : 
            result.message,
          processed: successCount,
          total: totalCount,
          fileRows: result.fileRows,
          skipped: result.skipped,
          errors: result.errors || []
        })
        
        // 只有在完全成功时才清空文件选择
        if (!hasErrors) {
          setFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      } else {
        setUploadResult({
          success: false,
          message: result.error || '上传失败',
          processed: result.processed || 0,
          total: result.total || 0,
          fileRows: result.fileRows || 0,
          skipped: result.skipped || 0,
          errors: result.errors || [result.error || '未知错误']
        })
      }
    } catch (error) {
      clearInterval(progressTimer)
      setUploadProgress(100)
      
      setUploadResult({
        success: false,
        message: '网络连接失败，请检查网络后重试',
        processed: 0,
        total: 0,
        errors: [
          '网络错误: ' + (error instanceof Error ? error.message : '连接超时或服务器无响应'),
          '可能的原因：',
          '• 网络连接不稳定',
          '• 服务器暂时不可用',
          '• 文件过大导致超时'
        ]
      })
    }

    setUploading(false)
  }

  // 重试上传
  const handleRetry = async () => {
    if (!lastUploadedFile && !file) return
    
    // 使用最后上传的文件或当前选择的文件
    const fileToRetry = lastUploadedFile || file
    if (!fileToRetry) return
    
    // 重置结果并重新上传
    setUploadResult(null)
    setUploading(true)
    setUploadProgress(0)
    
    const formData = new FormData()
    formData.append('file', fileToRetry)

    // 模拟进度更新
    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 85) return prev + Math.random() * 15
        return prev
      })
    }, 500)

    try {
      const response = await fetch('/api/admin/snh/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      // 清除进度定时器
      clearInterval(progressTimer)
      setUploadProgress(100)

      if (response.ok) {
        const hasErrors = result.errors && result.errors.length > 0
        const successCount = result.processed || 0
        const totalCount = result.total || 0
        
        setUploadResult({
          success: !hasErrors || successCount > 0,
          message: hasErrors ? 
            `重试完成，但仍有 ${result.errors.length} 条记录失败` : 
            '重试成功！' + result.message,
          processed: successCount,
          total: totalCount,
          fileRows: result.fileRows,
          skipped: result.skipped,
          errors: result.errors || []
        })
        
        // 只有在完全成功时才清空文件选择
        if (!hasErrors) {
          setFile(null)
          setLastUploadedFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      } else {
        setUploadResult({
          success: false,
          message: result.error || '重试失败',
          processed: result.processed || 0,
          total: result.total || 0,
          fileRows: result.fileRows || 0,
          skipped: result.skipped || 0,
          errors: result.errors || [result.error || '未知错误']
        })
      }
    } catch (error) {
      clearInterval(progressTimer)
      setUploadProgress(100)
      
      setUploadResult({
        success: false,
        message: '重试时网络连接失败',
        processed: 0,
        total: 0,
        errors: [
          '重试失败: ' + (error instanceof Error ? error.message : '连接超时'),
          '建议：',
          '• 检查网络连接',
          '• 稍后再试',
          '• 联系技术支持'
        ]
      })
    }

    setUploading(false)
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

  // 下载简化格式模板
  const handleDownloadTemplate = () => {
    // 创建简化格式模板数据
    const templateData = [
      ['SN', 'SNH'],
      ['2023213001', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6'],
      ['2023213002', 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1'],
      ['2024213001', 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2']
    ]

    // 转换为CSV格式
    const csvContent = templateData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', '学号哈希映射模板_简化格式.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // 下载数据库字段格式模板
  const handleDownloadDbTemplate = () => {
    // 创建数据库字段格式模板数据
    const templateData = [
      ['student_number', 'student_hash', 'created_at'],
      ['2023213001', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6', '2024-01-01 10:00:00'],
      ['2023213002', 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1', '2024-01-01 10:01:00'],
      ['2024213001', 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2', '2024-01-01 10:02:00']
    ]

    // 转换为CSV格式
    const csvContent = templateData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', '学号哈希映射模板_数据库格式.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // 下载映射表数据
  const handleDownloadData = async () => {
    setDownloadLoading(true)
    
    try {
      const response = await fetch('/api/admin/snh/download', {
        method: 'GET',
      })

      if (response.ok) {
        // 获取文件名（从响应头中获取或使用默认名称）
        const contentDisposition = response.headers.get('content-disposition')
        let filename = `snh_mapping_${new Date().toISOString().split('T')[0]}.csv`
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="([^"]*)"/)
          if (filenameMatch) {
            filename = filenameMatch[1]
          }
        }

        // 创建并触发下载
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        // 提示用户下载成功
        alert('数据表导出成功！')
      } else {
        const error = await response.json()
        alert('下载失败: ' + (error.error || '未知错误'))
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('下载失败，请检查网络连接后重试')
    }
    
    setDownloadLoading(false)
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UserCheck className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">学生登录管理</h1>
            <p className="text-gray-600">管理学号与哈希值的映射关系，支持上传Excel文件批量导入</p>
          </div>
        </div>
      </div>

      {/* 文件上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            上传映射文件
          </CardTitle>
          <CardDescription>
            支持上传Excel(.xlsx)或CSV文件，文件必须包含两列：学号列（SN 或 student_number）和哈希值列（SNH 或 student_hash）。
            如果使用数据库格式模板，created_at 列会被系统自动处理，无需手动填写。
            您也可以导出当前数据库中的所有映射记录进行备份或查看。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载简化模板（SN/SNH）
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadDbTemplate}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载数据库格式模板
            </Button>
            <Button
              variant="default"
              onClick={handleDownloadData}
              disabled={downloadLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              {downloadLoading ? '导出中...' : '导出数据表'}
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
            <div className="space-y-4">
              {/* 主要结果Alert */}
              <Alert className={uploadResult.success && uploadResult.errors.length === 0 ? 'border-green-200 bg-green-50' : 
                              uploadResult.processed > 0 ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {uploadResult.success && uploadResult.errors.length === 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : uploadResult.processed > 0 ? (
                    <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs">!</div>
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <AlertDescription>
                    <div className="space-y-3">
                      <p className="font-medium">{uploadResult.message}</p>
                      
                      {/* 统计信息卡片 */}
                      <div className="bg-white border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">处理统计</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">文件总行数:</span>
                            <span className="font-medium">{uploadResult.fileRows || '未知'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">有效数据行:</span>
                            <span className="font-medium">{uploadResult.total || uploadResult.processed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600">✅ 成功处理:</span>
                            <span className="font-medium text-green-600">{uploadResult.processed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600">❌ 处理失败:</span>
                            <span className="font-medium text-red-600">{uploadResult.errors.length}</span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-gray-600">跳过行数:</span>
                            <span className="font-medium">{uploadResult.skipped || 0}</span>
                          </div>
                        </div>
                        
                        {/* 成功率显示 */}
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">成功率:</span>
                            <span className="font-medium">
                              {uploadResult.total ? 
                                `${Math.round((uploadResult.processed / uploadResult.total) * 100)}%` : 
                                '0%'
                              }
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${
                                uploadResult.errors.length === 0 ? 'bg-green-500' : 
                                uploadResult.processed > 0 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ 
                                width: uploadResult.total ? 
                                  `${Math.max(5, (uploadResult.processed / uploadResult.total) * 100)}%` : 
                                  '0%' 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* 跳过数据提示 */}
                      {uploadResult.skipped && uploadResult.skipped > 0 && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                          <div className="flex items-start gap-2">
                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mt-0.5">i</div>
                            <div className="text-blue-700 text-sm">
                              <p className="font-medium">数据跳过说明</p>
                              <p>跳过了 {uploadResult.skipped} 行数据，原因可能包括：</p>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>学号或哈希值为空</li>
                                <li>数据格式不正确</li>
                                <li>行中包含无效字符</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </Alert>

              {/* 错误详情Alert - 只在有错误时显示 */}
              {uploadResult.errors.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-red-800">
                          处理失败的记录 ({uploadResult.errors.length} 条)
                        </h4>
                        {uploadResult.processed > 0 && (
                          <span className="text-sm text-red-600 bg-red-100 px-2 py-1 rounded">
                            部分成功：{uploadResult.processed} 条记录已成功保存
                          </span>
                        )}
                      </div>
                      
                      <div className="bg-white border border-red-200 rounded-md max-h-40 overflow-auto">
                        <div className="p-3">
                          <div className="space-y-2 text-sm">
                            {uploadResult.errors.map((error, index) => (
                              <div key={index} className="flex items-start gap-2 py-1 border-b border-red-100 last:border-b-0">
                                <span className="text-red-500 font-mono text-xs bg-red-100 px-1 rounded min-w-[20px] text-center">
                                  {index + 1}
                                </span>
                                <span className="text-red-700 text-xs break-all">{error}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-red-100 border border-red-200 rounded-md p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-red-800 text-sm font-medium mb-2">
                              解决建议：
                            </p>
                            <ul className="text-red-700 text-sm space-y-1 list-disc list-inside">
                              <li>检查失败记录中的学号格式是否正确</li>
                              <li>确认哈希值长度和格式符合要求</li>
                              <li>如果是网络问题，可以点击重试按钮</li>
                              <li>可以修正数据后重新上传（已成功的记录会被更新）</li>
                            </ul>
                          </div>
                          <Button
                            onClick={handleRetry}
                            disabled={uploading || (!lastUploadedFile && !file)}
                            variant="outline"
                            size="sm"
                            className="ml-3 border-red-300 text-red-700 hover:bg-red-50"
                          >
                            {uploading ? '重试中...' : '重试上传'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
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
    </AdminLayout>
  )
}
