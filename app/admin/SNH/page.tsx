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
import * as XLSX from 'xlsx'

interface UploadResult {
  success: boolean
  message: string
  processed: number
  total?: number
  fileRows?: number
  skipped?: number
  errors: string[]
  batchProgress?: {
    current: number
    total: number
  }
}

interface ParsedRecord {
  student_number: string
  student_hash: string
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

  // 解析文件（前端解析）
  const parseFile = async (file: File): Promise<{ records: ParsedRecord[], totalRows: number, skipped: number }> => {
    const records: ParsedRecord[] = []
    let totalRows = 0
    let skipped = 0

    try {
      if (file.name.endsWith('.csv')) {
        // 处理CSV文件
        const text = await file.text()
        const lines = text.split('\n').filter(line => line.trim())
        totalRows = Math.max(0, lines.length - 1) // 减去标题行

        // 跳过标题行
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
          
          const validStudentNumber = values[0] && String(values[0]).trim() !== ''
          const validStudentHash = values[1] && String(values[1]).trim() !== ''
          
          if (values.length >= 2 && validStudentNumber && validStudentHash) {
            records.push({
              student_number: values[0],
              student_hash: values[1]
            })
          } else {
            skipped++
          }
        }
      } else {
        // 处理Excel文件
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

        if (jsonData.length < 2) {
          throw new Error('Excel文件至少需要包含标题行和一行数据')
        }

        totalRows = Math.max(0, jsonData.length - 1) // 减去标题行

        // 查找学号和哈希值列的索引
        const headerRow = jsonData[0]
        
        const snIndex = headerRow.findIndex((header: any) => {
          const headerStr = String(header).toUpperCase().trim()
          return headerStr === 'SN' || headerStr === 'STUDENT_NUMBER'
        })
        
        const snhIndex = headerRow.findIndex((header: any) => {
          const headerStr = String(header).toUpperCase().trim()
          return headerStr === 'SNH' || headerStr === 'STUDENT_HASH'
        })

        if (snIndex === -1 || snhIndex === -1) {
          throw new Error('文件必须包含学号列（SN 或 student_number）和哈希值列（SNH 或 student_hash）')
        }

        // 解析数据行
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          const studentNumber = row[snIndex]
          const studentHash = row[snhIndex]

          const validStudentNumber = studentNumber !== null && studentNumber !== undefined && String(studentNumber).trim() !== ''
          const validStudentHash = studentHash !== null && studentHash !== undefined && String(studentHash).trim() !== ''

          if (validStudentNumber && validStudentHash) {
            records.push({
              student_number: String(studentNumber).trim(),
              student_hash: String(studentHash).trim()
            })
          } else {
            skipped++
          }
        }
      }
    } catch (parseError) {
      throw new Error('文件解析失败: ' + (parseError instanceof Error ? parseError.message : '未知错误'))
    }

    return { records, totalRows, skipped }
  }

  // 分批上传文件
  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    // 保存最后上传的文件，用于重试
    setLastUploadedFile(file)

    try {
      // 1. 解析文件
      setUploadProgress(5)
      const { records, totalRows, skipped } = await parseFile(file)
      
      if (records.length === 0) {
        setUploadResult({
          success: false,
          message: '文件中没有找到有效的数据行',
          processed: 0,
          total: 0,
          fileRows: totalRows,
          skipped: skipped,
          errors: ['文件中没有有效数据']
        })
        setUploading(false)
        return
      }

      console.log(`解析到 ${records.length} 条记录，将分成 ${Math.ceil(records.length / 1000)} 批进行导入`)

      // 2. 分批处理（每批1000条）
      const BATCH_SIZE = 1000
      const batches: ParsedRecord[][] = []
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        batches.push(records.slice(i, i + BATCH_SIZE))
      }

      const totalBatches = batches.length
      let totalProcessed = 0
      const allErrors: string[] = []

      // 3. 逐批上传
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const batchProgress = Math.floor((i / totalBatches) * 90) + 5 // 5-95% 用于分批上传
        
        // 更新进度和批次信息
        setUploadProgress(batchProgress)
        setUploadResult({
          success: false,
          message: `正在导入第 ${i + 1} / ${totalBatches} 批...`,
          processed: totalProcessed,
          total: records.length,
          fileRows: totalRows,
          skipped: skipped,
          errors: allErrors,
          batchProgress: {
            current: i + 1,
            total: totalBatches
          }
        })
        
        try {
          const response = await fetch('/api/admin/snh/batch-upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ records: batch }),
          })

          const result = await response.json()

          if (response.ok) {
            totalProcessed += result.processed || 0
            if (result.errors && result.errors.length > 0) {
              allErrors.push(...result.errors)
            }
          } else {
            // 如果批次失败，记录错误但继续处理下一批
            allErrors.push(`批次 ${i + 1}/${totalBatches} 失败: ${result.error || '未知错误'}`)
          }
        } catch (error) {
          allErrors.push(`批次 ${i + 1}/${totalBatches} 网络错误: ${error instanceof Error ? error.message : '连接失败'}`)
        }
      }

      // 4. 完成
      setUploadProgress(100)
      
      const hasErrors = allErrors.length > 0
      const successCount = totalProcessed
      const totalCount = records.length
      
      setUploadResult({
        success: !hasErrors || successCount > 0,
        message: hasErrors ? 
          `处理完成，但有 ${allErrors.length} 条记录失败` : 
          `文件上传成功！处理了 ${successCount} 条记录`,
        processed: successCount,
        total: totalCount,
        fileRows: totalRows,
        skipped: skipped,
        errors: allErrors,
        batchProgress: {
          current: totalBatches,
          total: totalBatches
        }
      })
      
      // 只有在完全成功时才清空文件选择
      if (!hasErrors) {
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      setUploadProgress(100)
      
      setUploadResult({
        success: false,
        message: '文件处理失败',
        processed: 0,
        total: 0,
        errors: [
          error instanceof Error ? error.message : '文件解析或上传失败',
          '可能的原因：',
          '• 文件格式不正确',
          '• 文件损坏',
          '• 网络连接问题'
        ]
      })
    }

    setUploading(false)
  }

  // 重试上传（使用相同的分批导入逻辑）
  const handleRetry = async () => {
    if (!lastUploadedFile && !file) return
    
    // 使用最后上传的文件或当前选择的文件
    const fileToRetry = lastUploadedFile || file
    if (!fileToRetry) return
    
    // 重置结果并重新上传
    setUploadResult(null)
    setFile(fileToRetry)
    
    // 调用相同的上传函数
    await handleUpload()
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
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>导入进度</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              {uploadResult?.batchProgress && (
                <div className="text-xs text-gray-500 text-center">
                  正在处理批次 {uploadResult.batchProgress.current} / {uploadResult.batchProgress.total}
                </div>
              )}
            </div>
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
                          {uploadResult.batchProgress && (
                            <div className="flex justify-between col-span-2">
                              <span className="text-gray-600">分批导入:</span>
                              <span className="font-medium text-blue-600">
                                共 {uploadResult.batchProgress.total} 批（每批1000条）
                              </span>
                            </div>
                          )}
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
