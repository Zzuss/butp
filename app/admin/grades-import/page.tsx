'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, FileSpreadsheet, Trash2, Database, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  createGradeImportEventSource,
  deleteGradeImportFile,
  getGradeImportTask,
  listGradeImportFiles,
  startGradeImport,
  updateGradeImportFileYear,
  uploadGradeImportFile,
  type GradeImportFile as FileInfo,
  type GradeImportTask as ImportTask
} from '@/lib/grades-import-ecs-client'

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
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importing, setImporting] = useState(false)
  const [currentTask, setCurrentTask] = useState<ImportTask | null>(null)
  const [streamConnected, setStreamConnected] = useState(false)
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [savingYearFileId, setSavingYearFileId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeTaskIdRef = useRef<string | null>(null)

  const terminalTaskRef = useRef<string | null>(null)

  const detectDuplicateFiles = useCallback((fileList: FileInfo[]) => {
    const nameCount: { [key: string]: number } = {}
    fileList.forEach(file => {
      const fileName = file.originalName || file.name
      nameCount[fileName] = (nameCount[fileName] || 0) + 1
    })

    return fileList.map(file => ({
      ...file,
      isDuplicate: nameCount[file.originalName || file.name] > 1
    }))
  }, [])

  const loadFileList = useCallback(async () => {
    try {
      const fileList = await listGradeImportFiles()
      setFiles(detectDuplicateFiles(fileList))
    } catch (error) {
      console.error('加载文件列表失败:', error)
    }
  }, [detectDuplicateFiles])

  const refreshFileList = async () => {
    try {
      const fileList = await listGradeImportFiles()
      const checkedFiles = detectDuplicateFiles(fileList)
      setFiles(checkedFiles)
      const duplicateCount = checkedFiles.filter(file => file.isDuplicate).length
      if (fileList.length > 0) {
        const warning = duplicateCount > 0 ? `\n⚠️ 其中有 ${duplicateCount} 个同名文件` : ''
        alert(`发现 ${fileList.length} 个可导入的文件${warning}`)
      } else {
        alert('没有找到可导入的文件，请先上传 Excel 文件')
      }
    } catch (error) {
      console.error('刷新文件列表失败:', error)
      alert(error instanceof Error ? error.message : '刷新失败')
    }
  }

  const applyTaskUpdate = useCallback((task: ImportTask) => {
    setCurrentTask(task)
    const terminal = task.status === 'completed' || task.status === 'failed'
    setImporting(!terminal)

    if (!terminal) return

    activeTaskIdRef.current = null
    localStorage.removeItem('gradeImportTaskId')
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setStreamConnected(false)

    if (terminalTaskRef.current === task.id) return
    terminalTaskRef.current = task.id
    setImportResult({
      success: task.status === 'completed',
      totalFiles: task.totalFiles,
      totalRecords: task.totalRecords,
      importedRecords: task.importedRecords,
      errorMessage: task.errorMessage,
      completedAt: task.completedAt
    })
    setShowResultDialog(true)
  }, [])

  const openTaskStream = useCallback(async function connect(taskId: string, forceRefresh = false) {
    if (activeTaskIdRef.current !== taskId) return

    eventSourceRef.current?.close()
    const source = await createGradeImportEventSource(taskId, forceRefresh)
    eventSourceRef.current = source

    source.onopen = () => setStreamConnected(true)
    const receiveTask = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.task) applyTaskUpdate(data.task)
      } catch (error) {
        console.error('无法解析导入进度:', error)
      }
    }

    ;['snapshot', 'progress', 'completed', 'failed'].forEach(eventName => {
      source.addEventListener(eventName, receiveTask as EventListener)
    })

    source.onerror = () => {
      setStreamConnected(false)
      source.close()
      if (activeTaskIdRef.current !== taskId) return
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = setTimeout(async () => {
        try {
          const task = await getGradeImportTask(taskId)
          applyTaskUpdate(task)
          if (task.status !== 'completed' && task.status !== 'failed') {
            void connect(taskId, true)
          }
        } catch (error) {
          console.error('SSE 重连失败:', error)
          void connect(taskId, true)
        }
      }, 3000)
    }
  }, [applyTaskUpdate])

  useEffect(() => {
    void loadFileList()
    const savedTaskId = localStorage.getItem('gradeImportTaskId')
    if (!savedTaskId) return

    activeTaskIdRef.current = savedTaskId
    setImporting(true)
    void getGradeImportTask(savedTaskId)
      .then(task => {
        applyTaskUpdate(task)
        if (task.status !== 'completed' && task.status !== 'failed') {
          void openTaskStream(savedTaskId)
        }
      })
      .catch(error => {
        console.error('恢复导入任务失败:', error)
        setImporting(false)
      })

    return () => {
      activeTaskIdRef.current = null
      eventSourceRef.current?.close()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [applyTaskUpdate, loadFileList, openTaskStream])

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
    setUploadProgress(0)
    setCurrentTask(null)

    try {
      for (let index = 0; index < selectedFiles.length; index++) {
        await uploadGradeImportFile(selectedFiles[index], percent => {
          setUploadProgress(Math.round(((index + percent / 100) / selectedFiles.length) * 100))
        })
      }
      await loadFileList()
    } catch (error) {
      alert(error instanceof Error ? error.message : '上传失败')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 删除文件
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('确定要删除这个文件吗？')) return

    try {
      await deleteGradeImportFile(fileId)
      await loadFileList()
    } catch (error) {
      console.error('删除文件异常:', error)
      alert(error instanceof Error ? error.message : '删除失败')
    }
  }

  const handleYearInput = (fileId: string, value: string) => {
    const parsed = value === '' ? null : Number(value)
    setFiles(current => current.map(file => (
      file.id === fileId ? { ...file, year: parsed !== null && Number.isInteger(parsed) ? parsed : null } : file
    )))
  }

  const handleYearSave = async (fileId: string, year: number | null) => {
    if (year === null || !Number.isInteger(year) || year < 1900 || year > 2099) {
      alert('请填写 1900 到 2099 之间的有效年份')
      await loadFileList()
      return
    }

    setSavingYearFileId(fileId)
    try {
      await updateGradeImportFileYear(fileId, year)
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存年份失败')
      await loadFileList()
    } finally {
      setSavingYearFileId(null)
    }
  }

  const handleImport = async () => {
    if (files.length === 0) {
      alert('请先上传文件')
      return
    }

    const invalidYearFile = files.find(file => (
      file.year === null || !Number.isInteger(file.year) || file.year < 1900 || file.year > 2099
    ))
    if (invalidYearFile) {
      alert(`请先确认文件“${invalidYearFile.originalName || invalidYearFile.name}”的年份`)
      return
    }

    if (!confirm(`确定要将 ${files.length} 个文件导入到数据库吗？此操作将使用影子表机制，导入成功后才会替换现有数据。`)) {
      return
    }

    setImporting(true)
    setCurrentTask(null)
    terminalTaskRef.current = null

    try {
      await Promise.all(files.map(file => updateGradeImportFileYear(file.id, file.year as number)))
      const { taskId } = await startGradeImport(files.map(file => file.id))
      activeTaskIdRef.current = taskId
      localStorage.setItem('gradeImportTaskId', taskId)
      const task = await getGradeImportTask(taskId)
      applyTaskUpdate(task)
      void openTaskStream(taskId)
    } catch (error) {
      setImporting(false)
      alert(error instanceof Error ? error.message : '导入失败')
    }
  }

  const checkLastTaskStatus = async () => {
    if (!currentTask?.id) return

    try {
      const task = await getGradeImportTask(currentTask.id)
      applyTaskUpdate(task)
    } catch (error) {
      console.error('检查任务状态失败:', error)
      alert(error instanceof Error ? error.message : '检查任务状态失败')
    }
  }

  // 处理结果弹窗关闭
  const handleResultDialogClose = async () => {
    setShowResultDialog(false)
    setImportResult(null)
    await loadFileList()
  }

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

  const hasInvalidYears = files.some(file => (
    file.year === null || !Number.isInteger(file.year) || file.year < 1900 || file.year > 2099
  ))

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
              支持上传多个 Excel 文件；系统会从文件名识别年份，上传后请逐个确认
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
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在直接上传到成绩导入服务器… {uploadProgress}%
                </div>
                <Progress value={uploadProgress} className="w-full" />
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
                  {files.filter(f => f.isDuplicate).length > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {files.filter(f => f.isDuplicate).length} 个同名
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  待导入的文件将按顺序导入到数据库
                  {files.filter(f => f.isDuplicate).length > 0 && (
                    <span className="text-red-600 ml-2">
                      ⚠️ 检测到同名文件，可能导致数据重复
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
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
                
                {currentTask && !importing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkLastTaskStatus}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    检查任务状态
                  </Button>
                )}
              </div>
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
                    className={`flex items-center justify-between p-3 rounded-md transition-colors ${
                      file.isDuplicate 
                        ? 'bg-red-50 border border-red-200 hover:bg-red-100' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileSpreadsheet className={`w-4 h-4 ${file.isDuplicate ? 'text-red-500' : 'text-blue-500'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${file.isDuplicate ? 'text-red-700' : ''}`}>
                            {file.originalName || file.name}
                          </p>
                          {file.isDuplicate && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              同名文件
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${file.isDuplicate ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {formatFileSize(file.size)} · {formatTime(file.uploadTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`year-${file.id}`} className="text-xs whitespace-nowrap">
                        年份
                      </Label>
                      <Input
                        id={`year-${file.id}`}
                        type="number"
                        min={1900}
                        max={2099}
                        step={1}
                        value={file.year ?? ''}
                        placeholder="必填"
                        onChange={event => handleYearInput(file.id, event.target.value)}
                        onBlur={() => void handleYearSave(file.id, file.year)}
                        disabled={importing || savingYearFileId === file.id}
                        className={`w-24 h-8 ${file.year === null ? 'border-red-500' : ''}`}
                      />
                      {savingYearFileId === file.id && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={importing}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
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
              disabled={files.length === 0 || importing || hasInvalidYears || savingYearFileId !== null}
              className="w-full flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              {importing ? '导入中...' : '开始导入到数据库'}
            </Button>
            {hasInvalidYears && (
              <p className="text-sm text-red-600">请先为所有文件确认有效年份，再开始导入。</p>
            )}

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
                  {importing && (
                    <span className={`text-xs ${streamConnected ? 'text-green-600' : 'text-amber-600'}`}>
                      {streamConnected ? '实时进度已连接' : '正在连接实时进度…'}
                    </span>
                  )}
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
