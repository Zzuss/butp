'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Upload, FileSpreadsheet, Clock, Brain, RefreshCw, Download, Eye, Trash2, Database, Eraser } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'

// 异步任务状态类型
interface AsyncTask {
  taskId: string
  year: string
  fileName: string
  fileSize: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message: string
  startedAt: string
  updatedAt?: string
  resultFiles?: string[]
  error?: string
  statusDescription?: string
  canDownload?: boolean
  // 成绩数据导入状态
  academicImportSuccess?: boolean
  academicRecordCount?: number
  academicTotalRecords?: number
  academicImportErrors?: string[]
  criticalImportError?: boolean
  warnings?: string[]
  // 本地状态
  isProcessing?: boolean
  processResult?: any
}

export default function AsyncPredictionPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [tasks, setTasks] = useState<AsyncTask[]>([])
  const [alerts, setAlerts] = useState<{ id: string, type: 'success' | 'error' | 'info', message: string }[]>([])
  const [isCheckingGrades, setIsCheckingGrades] = useState(false)
  const [isClearingGrades, setIsClearingGrades] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingIntervals = useRef<{ [taskId: string]: NodeJS.Timeout }>({})

  // 添加提示消息
  const addAlert = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString()
    setAlerts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id))
    }, 5000)
  }, [])

  // 文件选择处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 验证文件类型
      const allowedTypes = ['.xlsx', '.xls']
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      
      if (!allowedTypes.includes(fileExtension)) {
        addAlert('error', '请上传Excel文件(.xlsx或.xls格式)')
        return
      }
      
      // 验证文件大小（最大50MB）
      const maxSize = 50 * 1024 * 1024
      if (file.size > maxSize) {
        addAlert('error', '文件大小不能超过50MB')
        return
      }
      
      setSelectedFile(file)
      addAlert('info', `已选择文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
    }
  }

  // 启动异步预测任务
  const startAsyncPrediction = async () => {
    if (!selectedFile || !selectedYear) {
      addAlert('error', '请选择文件和年级')
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('year', selectedYear)

      console.log(`🚀 启动异步预测: ${selectedFile.name}, ${selectedYear}年级`)

      const response = await fetch('/api/admin/prediction/async-start', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        const newTask: AsyncTask = {
          taskId: result.data.taskId,
          year: result.data.year,
          fileName: result.data.fileName,
          fileSize: result.data.fileSize,
          status: 'pending',
          progress: 0,
          message: '任务已启动',
          startedAt: result.data.startedAt,
          statusDescription: '⏳ 等待开始',
          academicImportSuccess: result.data.academicImportSuccess,
          academicRecordCount: result.data.academicRecordCount,
          academicTotalRecords: result.data.academicTotalRecords,
          academicImportErrors: result.data.academicImportErrors,
          criticalImportError: result.data.criticalImportError,
          warnings: result.warnings
        }

        setTasks(prev => [newTask, ...prev])
        
        // 根据成绩数据导入状态显示不同的消息
        if (result.data.criticalImportError) {
          addAlert('error', `⚠️ 预测任务已启动，但成绩数据导入完全失败！任务ID: ${result.data.taskId}`)
        } else if (!result.data.academicImportSuccess || result.warnings?.length > 0) {
          addAlert('info', `⚠️ 预测任务已启动，但成绩数据导入有问题。任务ID: ${result.data.taskId}`)
        } else {
          addAlert('success', `✅ 预测任务已启动，成绩数据导入成功。任务ID: ${result.data.taskId}`)
        }
        
        // 清空表单
        setSelectedFile(null)
        setSelectedYear('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        // 开始轮询任务状态
        startPolling(newTask.taskId)
        
      } else {
        addAlert('error', `启动任务失败: ${result.error}`)
      }

    } catch (error) {
      console.error('启动任务失败:', error)
      addAlert('error', '启动任务失败，请检查网络连接')
    } finally {
      setIsUploading(false)
    }
  }

  // 轮询任务状态
  const startPolling = (taskId: string) => {
    // 清除现有轮询
    if (pollingIntervals.current[taskId]) {
      clearInterval(pollingIntervals.current[taskId])
    }

      // 开始新轮询 (每15秒查询一次，大幅减少网络请求)
      pollingIntervals.current[taskId] = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/prediction/async-status?taskId=${taskId}`)
        const result = await response.json()

        if (result.success) {
          setTasks(prev => prev.map(task => 
            task.taskId === taskId 
              ? { 
                  ...task, 
                  status: result.data.status,
                  progress: result.data.progress,
                  message: result.data.message,
                  updatedAt: result.data.updatedAt,
                  resultFiles: result.data.resultFiles,
                  error: result.data.error,
                  statusDescription: result.data.statusDescription,
                  canDownload: result.data.canDownload
                }
              : task
          ))

          // 如果任务完成或失败，停止轮询
          if (result.data.status === 'completed' || result.data.status === 'failed') {
            clearInterval(pollingIntervals.current[taskId])
            delete pollingIntervals.current[taskId]

            if (result.data.status === 'completed') {
              addAlert('success', `任务完成: ${taskId}`)
            } else {
              addAlert('error', `任务失败: ${taskId}`)
            }
          }
        }
      } catch (error) {
        console.error(`轮询任务状态失败 ${taskId}:`, error)
      }
    }, 15000)
  }

  // 手动刷新任务状态
  const refreshTaskStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/admin/prediction/async-status?taskId=${taskId}`)
      const result = await response.json()

      if (result.success) {
        setTasks(prev => prev.map(task => 
          task.taskId === taskId 
            ? { 
                ...task, 
                status: result.data.status,
                progress: result.data.progress,
                message: result.data.message,
                updatedAt: result.data.updatedAt,
                resultFiles: result.data.resultFiles,
                error: result.data.error,
                statusDescription: result.data.statusDescription,
                canDownload: result.data.canDownload
              }
            : task
        ))
        addAlert('info', '任务状态已刷新')
      } else {
        addAlert('error', '刷新状态失败')
      }
    } catch (error) {
      console.error('刷新状态失败:', error)
      addAlert('error', '刷新状态失败')
    }
  }

  // 处理完成的任务（下载并导入数据库）
  const processCompletedTask = async (task: AsyncTask) => {
    if (task.status !== 'completed' || !task.canDownload) {
      addAlert('error', '任务尚未完成或无法下载结果')
      return
    }

    setTasks(prev => prev.map(t => 
      t.taskId === task.taskId ? { ...t, isProcessing: true } : t
    ))

    try {
      const response = await fetch('/api/admin/prediction/async-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: task.taskId,
          year: task.year
        })
      })

      const result = await response.json()

      setTasks(prev => prev.map(t => 
        t.taskId === task.taskId 
          ? { ...t, isProcessing: false, processResult: result }
          : t
      ))

      if (result.success) {
        addAlert('success', `任务处理完成: ${result.data.successCount}/${result.data.totalFiles} 个文件导入成功`)
      } else {
        addAlert('error', `任务处理失败: ${result.error}`)
      }

    } catch (error) {
      console.error('处理任务失败:', error)
      addAlert('error', '处理任务失败')
      setTasks(prev => prev.map(t => 
        t.taskId === task.taskId ? { ...t, isProcessing: false } : t
      ))
    }
  }

  // 删除任务
  const removeTask = (taskId: string) => {
    // 停止轮询
    if (pollingIntervals.current[taskId]) {
      clearInterval(pollingIntervals.current[taskId])
      delete pollingIntervals.current[taskId]
    }
    
    setTasks(prev => prev.filter(task => task.taskId !== taskId))
    addAlert('info', '任务已删除')
  }

  // 检查成绩表
  const checkGradeTable = async () => {
    setIsCheckingGrades(true)
    try {
      const response = await fetch('/api/admin/prediction/check-grades')
      const result = await response.json()
      
      if (result.success) {
        addAlert('success', `成绩表检查完成: 共${result.data.totalRecords}条记录`)
      } else {
        addAlert('error', `检查失败: ${result.error}`)
      }
    } catch (error) {
      addAlert('error', '检查成绩表失败，请检查网络连接')
    } finally {
      setIsCheckingGrades(false)
    }
  }

  // 清除成绩表
  const clearGradeTable = async () => {
    if (!confirm('确定要清除所有成绩表数据吗？此操作无法撤销！')) {
      return
    }
    
    setIsClearingGrades(true)
    try {
      const response = await fetch('/api/admin/prediction/clear-grades', {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.success) {
        addAlert('success', `成绩表已清除: 删除了${result.data.deletedRecords}条记录`)
      } else {
        addAlert('error', `清除失败: ${result.error}`)
      }
    } catch (error) {
      addAlert('error', '清除成绩表失败，请检查网络连接')
    } finally {
      setIsClearingGrades(false)
    }
  }


  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      Object.values(pollingIntervals.current).forEach(interval => {
        clearInterval(interval)
      })
    }
  }, [])

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'running': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <AdminLayout showBackButton={true}>
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">异步预测系统</h1>
          <p className="text-gray-600">
            上传成绩文件并启动后台预测任务。任务将在阿里云服务器上异步执行，您可以实时查看进度。
          </p>
        </div>

        {/* 提示消息 */}
        {alerts.map(alert => (
          <Alert key={alert.id} className={`mb-4 ${
            alert.type === 'success' ? 'bg-green-50 border-green-200' :
            alert.type === 'error' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <AlertDescription className={
              alert.type === 'success' ? 'text-green-800' :
              alert.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }>
              {alert.message}
            </AlertDescription>
          </Alert>
        ))}

        {/* 成绩表管理 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                成绩表管理
              </CardTitle>
              <CardDescription>
                检查或清除数据库中的成绩数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={checkGradeTable}
                disabled={isCheckingGrades}
                variant="outline"
                className="w-full"
              >
                {isCheckingGrades ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    检查中...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    检查成绩表
                  </>
                )}
              </Button>
              <Button
                onClick={clearGradeTable}
                disabled={isClearingGrades}
                variant="destructive"
                className="w-full"
              >
                {isClearingGrades ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    清除中...
                  </>
                ) : (
                  <>
                    <Eraser className="mr-2 h-4 w-4" />
                    清除成绩表
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 新建预测任务 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              启动新的预测任务
            </CardTitle>
            <CardDescription>
              选择Excel成绩文件和对应年级，系统将异步执行预测算法
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file">成绩文件 (Excel格式)</Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              {selectedFile && (
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">年级</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="选择年级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2022">2022级</SelectItem>
                  <SelectItem value="2023">2023级</SelectItem>
                  <SelectItem value="2024">2024级</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={startAsyncPrediction}
              disabled={!selectedFile || !selectedYear || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  启动中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  启动预测任务
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 任务列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                任务列表 ({tasks.length})
              </span>
            </CardTitle>
            <CardDescription>
              实时查看预测任务的执行状态和进度
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                还没有预测任务
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map(task => (
                  <div key={task.taskId} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getStatusColor(task.status)}>
                            {task.statusDescription || task.status}
                          </Badge>
                          <span className="font-medium">{task.fileName}</span>
                          <span className="text-sm text-gray-500">{task.year}级</span>
                          
                          {/* 成绩数据导入状态指示器 */}
                          {task.criticalImportError ? (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              ❌ 成绩导入失败
                            </Badge>
                          ) : task.academicImportSuccess === false ? (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                              ⚠️ 成绩部分导入
                            </Badge>
                          ) : task.academicImportSuccess === true ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              ✅ 成绩导入成功
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-sm text-gray-600">
                          任务ID: {task.taskId}
                        </div>
                        <div className="text-sm text-gray-600">
                          开始时间: {new Date(task.startedAt).toLocaleString()}
                        </div>
                        
                        {/* 成绩数据导入详情 */}
                        {typeof task.academicRecordCount !== 'undefined' && (
                          <div className="text-sm text-gray-600">
                            成绩数据: {task.academicRecordCount}/{task.academicTotalRecords || '未知'} 条记录导入成功
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => refreshTaskStatus(task.taskId)}
                          disabled={task.status === 'completed' || task.status === 'failed'}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeTask(task.taskId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{task.message}</span>
                        <span>{task.progress}%</span>
                      </div>
                      <Progress value={task.progress} className="w-full" />
                    </div>

                    {/* 成绩数据导入警告 */}
                    {task.warnings && task.warnings.length > 0 && (
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs">!</div>
                        <AlertDescription className="text-yellow-800">
                          <div className="space-y-1">
                            <p className="font-medium">成绩数据导入警告:</p>
                            {task.warnings.map((warning, index) => (
                              <p key={index} className="text-sm">• {warning}</p>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* 成绩数据导入错误详情 */}
                    {task.academicImportErrors && task.academicImportErrors.length > 0 && (
                      <Alert className="bg-red-50 border-red-200">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription className="text-red-800">
                          <div className="space-y-1">
                            <p className="font-medium">成绩数据导入错误:</p>
                            <div className="max-h-32 overflow-auto text-sm">
                              {task.academicImportErrors.map((error, index) => (
                                <p key={index}>• {error}</p>
                              ))}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* 预测任务错误信息 */}
                    {task.error && (
                      <Alert className="bg-red-50 border-red-200">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription className="text-red-800">
                          <p className="font-medium">预测任务错误:</p>
                          <p>{task.error}</p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* 任务完成操作 */}
                    {task.status === 'completed' && task.canDownload && (
                      <div className="flex items-center justify-between bg-green-50 p-3 rounded">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-800 font-medium">
                            预测完成，生成 {task.resultFiles?.length || 0} 个结果文件
                          </span>
                        </div>
                        <Button
                          onClick={() => processCompletedTask(task)}
                          disabled={task.isProcessing}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {task.isProcessing ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              处理中...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4" />
                              导入数据库
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* 处理结果 */}
                    {task.processResult && (
                      <Alert className={task.processResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                        <AlertDescription className={task.processResult.success ? "text-green-800" : "text-red-800"}>
                          {task.processResult.message}
                          {task.processResult.data && (
                            <div className="mt-2 text-sm">
                              成功导入: {task.processResult.data.successMajors?.join(', ') || '无'}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}