'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, FileSpreadsheet, Trash2, Database, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

interface FileInfo {
  id: string
  name: string
  size: number
  uploadTime: string
}

interface ImportTask {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  totalFiles: number
  processedFiles: number
  totalRecords: number
  importedRecords: number
  progress: number
  errorMessage?: string
  createdAt: string
  completedAt?: string
  files: Array<{
    id: string
    fileName: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    recordsCount: number
    importedCount: number
    errorMessage?: string
    processedAt?: string
  }>
}

interface ImportResult {
  success: boolean
  totalFiles: number
  totalRecords: number
  importedRecords: number
  errorMessage?: string
  completedAt?: string
}

export default function GradesImportPage() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [currentTask, setCurrentTask] = useState<ImportTask | null>(null)
  const [taskPollingInterval, setTaskPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 加载文件列表
  const loadFileList = async () => {
    try {
      const response = await fetch('/api/admin/grades-import/files')
      if (response.ok) {
        const data = await response.json()
        const fileList = data.files || []
        console.log('加载文件列表:', fileList.length, '个文件', fileList)
        setFiles(fileList)
      } else {
        console.error('加载文件列表失败:', response.status, await response.text())
      }
    } catch (error) {
      console.error('加载文件列表失败:', error)
    }
  }

  // 刷新文件列表
  const refreshFileList = async () => {
    try {
      console.log('刷新文件列表...')
      const response = await fetch('/api/admin/grades-import/refresh-files', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        const fileList = data.files || []
        console.log('刷新完成:', fileList.length, '个文件')
        setFiles(fileList)
        
        if (fileList.length > 0) {
          alert(`发现 ${fileList.length} 个可导入的文件`)
        } else {
          alert('没有找到可导入的文件，请先上传Excel文件')
        }
      } else {
        console.error('刷新文件列表失败:', response.status)
        alert('刷新失败，请重试')
      }
    } catch (error) {
      console.error('刷新文件列表失败:', error)
      alert('刷新失败，请重试')
    }
  }

  useEffect(() => {
    loadFileList()
  }, [])

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length === 0) return

    // 检查已有文件数量
    if (files.length >= 4) {
      const confirmUpload = confirm(`已上传了${files.length}个成绩文件，继续上传可能出错。是否继续？`)
      if (!confirmUpload) {
        // 清空文件选择
        if (event.target) {
          event.target.value = ''
        }
        return
      }
    }

    setUploading(true)
    setCurrentTask(null)

    try {
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/admin/grades-import/upload-to-ecs', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '上传失败')
        }
      }

      // 重新加载文件列表
      await refreshFileList()
    } catch (error) {
      alert(error instanceof Error ? error.message : '上传失败')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 删除文件
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('确定要删除这个文件吗？')) return

    console.log('开始删除文件:', fileId)
    try {
      const response = await fetch(`/api/admin/grades-import/files/${fileId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        console.log('文件删除成功，刷新列表')
        await loadFileList()
      } else {
        const error = await response.json()
        console.error('删除文件失败:', error)
        alert(error.error || '删除失败')
      }
    } catch (error) {
      console.error('删除文件异常:', error)
      alert('删除失败')
    }
  }

  // 智能轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/admin/grades-import/task-status/${taskId}`)
      const data = await response.json()
      
      if (data.success) {
        const task = data.task
        setCurrentTask(task)
        
        // 如果任务完成或失败，停止轮询
        if (task.status === 'completed' || task.status === 'failed') {
          console.log('🎯 任务状态检测到:', task.status, task)
          
          if (taskPollingInterval) {
            clearInterval(taskPollingInterval)
            setTaskPollingInterval(null)
          }
          setImporting(false)
          
          // 显示结果弹窗
          const result: ImportResult = {
            success: task.status === 'completed',
            totalFiles: task.totalFiles,
            totalRecords: task.totalRecords,
            importedRecords: task.importedRecords,
            errorMessage: task.errorMessage,
            completedAt: task.completedAt
          }
          
          setImportResult(result)
          setShowResultDialog(true)
          
          if (task.status === 'completed') {
            console.log('✅ 导入成功完成！', result)
          } else {
            console.log('❌ 导入失败:', task.errorMessage)
          }
          
          return true // 表示轮询已完成
        }
        
        // 根据任务状态调整轮询间隔
        if (task.status === 'processing' && task.progress > 0) {
          // 处理中且有进度，使用较短间隔
          return false
        } else if (task.status === 'pending') {
          // 等待中，使用较长间隔
          return false
        }
      }
    } catch (error) {
      console.error('轮询任务状态失败:', error)
    }
    return false
  }

  // 开始导入
  const handleImport = async () => {
    if (files.length === 0) {
      alert('请先上传文件')
      return
    }

    if (!confirm(`确定要将 ${files.length} 个文件导入到数据库吗？此操作将使用影子表机制，导入成功后才会替换现有数据。`)) {
      return
    }

    setImporting(true)
    setCurrentTask(null)

    try {
      // 创建导入任务
      const response = await fetch('/api/admin/grades-import/create-task', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const taskId = data.taskId
        
        // 触发队列处理
        await fetch('/api/admin/grades-import/trigger-process', {
          method: 'POST',
        })

        // 开始智能轮询任务状态
        let pollCount = 0
        const maxPolls = 60 // 最多轮询60次（约2-5分钟），减少轮询次数
        
        const smartPoll = async () => {
          pollCount++
          const isCompleted = await pollTaskStatus(taskId)
          
          if (isCompleted || pollCount >= maxPolls) {
            if (taskPollingInterval) {
              clearInterval(taskPollingInterval)
              setTaskPollingInterval(null)
            }
            if (pollCount >= maxPolls && !isCompleted) {
              console.log('轮询超时，任务可能仍在ECS后台处理中')
              setImporting(false)
              
              // 显示超时提示弹窗
              const timeoutResult: ImportResult = {
                success: false,
                totalFiles: currentTask?.totalFiles || 0,
                totalRecords: currentTask?.totalRecords || 0,
                importedRecords: currentTask?.importedRecords || 0,
                errorMessage: '轮询超时，但任务可能仍在ECS后台处理中。请稍后刷新页面查看最新状态，或联系管理员确认任务状态。'
              }
              
              setImportResult(timeoutResult)
              setShowResultDialog(true)
            }
            return
          }
          
          // 动态调整轮询间隔，考虑ECS异步处理特点
          let nextInterval = 5000 // 默认5秒
          
          if (currentTask?.status === 'processing' && currentTask.progress > 0) {
            nextInterval = 3000 // 处理中且有进度：3秒
          } else if (currentTask?.status === 'pending') {
            nextInterval = pollCount < 5 ? 3000 : 8000 // 等待中：前5次3秒，之后8秒
          } else if (currentTask?.status === 'processing' && currentTask.progress === 0) {
            nextInterval = 6000 // 处理中但无进度：6秒
          }
          
          // 重新设置定时器
          if (taskPollingInterval) {
            clearInterval(taskPollingInterval)
          }
          const newInterval = setTimeout(smartPoll, nextInterval)
          setTaskPollingInterval(newInterval as any)
        }
        
        // 立即开始轮询
        await smartPoll()
      } else {
        throw new Error(data.message || '创建导入任务失败')
      }
    } catch (error) {
      setImporting(false)
      alert(error instanceof Error ? error.message : '导入失败')
    }
  }

  // 处理结果弹窗关闭
  const handleResultDialogClose = async () => {
    setShowResultDialog(false)
    setImportResult(null)
    // 刷新文件列表
    await loadFileList()
  }

  // 清理轮询
  useEffect(() => {
    return () => {
      if (taskPollingInterval) {
        clearInterval(taskPollingInterval)
      }
    }
  }, [taskPollingInterval])

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // 格式化时间
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('zh-CN')
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">成绩导入管理</h1>
          <p className="text-muted-foreground mt-2">
            上传成绩表格文件，使用影子表机制安全导入到 academic_results 表
          </p>
        </div>

        {/* 文件上传 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              上传成绩文件
            </CardTitle>
            <CardDescription>
              支持上传 Excel 文件（.xlsx, .xls），可以上传多个文件
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="files">选择成绩文件</Label>
              <Input
                ref={fileInputRef}
                id="files"
                type="file"
                accept=".xlsx,.xls"
                multiple
                onChange={handleFileSelect}
                disabled={uploading || importing}
              />
            </div>

            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在上传文件...
              </div>
            )}
          </CardContent>
        </Card>

        {/* 文件列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  待导入文件列表 ({files.length})
                </CardTitle>
                <CardDescription>
                  待导入的文件将按顺序导入到数据库
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshFileList}
                disabled={uploading || importing}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                刷新列表
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">暂无待导入的文件</p>
                <Button
                  variant="outline"
                  onClick={refreshFileList}
                  disabled={uploading || importing}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  检查待导入文件
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} · {formatTime(file.uploadTime)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={importing}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 导入操作 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              导入到数据库
            </CardTitle>
            <CardDescription>
              使用影子表机制：先创建影子表并导入数据，成功后再原子交换，失败则回滚
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleImport}
              disabled={files.length === 0 || importing}
              className="w-full flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              {importing ? '导入中...' : '开始导入到数据库'}
            </Button>

            {/* 导入进度 */}
            {currentTask && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    {currentTask.status === 'pending' && '准备导入...'}
                    {currentTask.status === 'processing' && '正在导入...'}
                    {currentTask.status === 'completed' && '导入完成'}
                    {currentTask.status === 'failed' && '导入失败'}
                  </span>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>文件进度: {currentTask.processedFiles}/{currentTask.totalFiles}</p>
                  {currentTask.totalRecords > 0 && (
                    <p>记录进度: {currentTask.importedRecords}/{currentTask.totalRecords}</p>
                  )}
                </div>
                
                <Progress value={currentTask.progress} className="w-full" />

                {/* 文件详情 */}
                {currentTask.files && currentTask.files.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">文件处理状态:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {currentTask.files.map((file) => (
                        <div key={file.id} className="flex items-center gap-2 text-xs">
                          {file.status === 'pending' && <Loader2 className="w-3 h-3 text-gray-400" />}
                          {file.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                          {file.status === 'completed' && <CheckCircle className="w-3 h-3 text-green-500" />}
                          {file.status === 'failed' && <XCircle className="w-3 h-3 text-red-500" />}
                          <span className="flex-1 truncate">{file.fileName}</span>
                          {file.importedCount > 0 && (
                            <span className="text-gray-500">{file.importedCount}条</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 错误信息 */}
                {currentTask.errorMessage && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription>
                      <p className="font-medium text-red-800">错误信息:</p>
                      <p className="text-red-700 text-sm mt-1">{currentTask.errorMessage}</p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* 成功信息 */}
                {currentTask.status === 'completed' && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertDescription>
                      <p className="font-medium text-green-800">导入成功!</p>
                      <p className="text-green-700 text-sm mt-1">
                        成功导入 {currentTask.importedRecords} 条记录，数据已生效
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium">支持的文件格式：</h4>
              <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                <li>Excel格式(.xlsx, .xls)</li>
                <li>文件应包含与 academic_results 表结构一致的列</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">影子表导入机制（原子交换，无空档期）：</h4>
              <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                <li>创建结构与 academic_results 表一致的影子表</li>
                <li>将文件列表中的表格文件分批导入影子表</li>
                <li>如果导入成功，使用PostgreSQL原子操作交换表（无空档期）</li>
                <li>如果导入失败，自动回滚，不影响现有数据</li>
                <li>原表会自动备份为 academic_results_old</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">首次使用前：</h4>
              <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                <li>需要在Supabase SQL Editor中执行 scripts/create-shadow-table-rpc.sql 脚本</li>
                <li>该脚本会创建影子表和必要的RPC函数</li>
                <li>如果影子表已存在但字段名都是小写，请先执行 fix-shadow-table-columns.sql 修复</li>
                <li>详细说明请查看 app/api/admin/grades-import/README.md</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">注意事项：</h4>
              <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                <li>导入操作会替换整个 academic_results 表的数据</li>
                <li>请确保上传的文件数据完整且正确</li>
                <li>导入过程中请勿关闭页面</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

{/* 导入结果弹窗 */}
<Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        {importResult?.success ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <XCircle className="w-5 h-5 text-red-600" />
        )}
        {importResult?.success ? '导入成功' : '导入失败'}
      </DialogTitle>
      <DialogDescription>
        {importResult?.success 
          ? '成绩数据已成功导入到数据库' 
          : '导入过程中发生错误，请检查文件格式或联系管理员'
        }
      </DialogDescription>
    </DialogHeader>
    
    {importResult && (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">处理文件数：</span>
            <span className="font-medium ml-1">{importResult.totalFiles}</span>
          </div>
          <div>
            <span className="text-muted-foreground">总记录数：</span>
            <span className="font-medium ml-1">{importResult.totalRecords}</span>
          </div>
          <div>
            <span className="text-muted-foreground">成功导入：</span>
            <span className="font-medium ml-1 text-green-600">{importResult.importedRecords}</span>
          </div>
          {importResult.completedAt && (
            <div>
              <span className="text-muted-foreground">完成时间：</span>
              <span className="font-medium ml-1">{formatTime(importResult.completedAt)}</span>
            </div>
          )}
        </div>
        
        {importResult.errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 font-medium">错误详情：</p>
            <p className="text-sm text-red-700 mt-1">{importResult.errorMessage}</p>
          </div>
        )}
      </div>
    )}
    
    <DialogFooter>
      <Button onClick={handleResultDialogClose} className="w-full">
        确定
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </AdminLayout>
  )
}
