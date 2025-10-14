'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Upload, FileSpreadsheet, Download, Brain, Clock, FileText, Database, Trash2, FolderPlus, Play, Pause, SkipForward } from 'lucide-react'

interface PredictionResult {
  success: boolean
  message: string
  year: string
  processedStudents: number
  outputFiles: string[]
  errors: string[]
  downloadUrls?: string[]
  batchId?: string
}

interface ProcessingStatus {
  phase: string
  message: string
  progress: number
}

interface BatchFileInfo {
  id: string
  file: File
  year: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  result?: PredictionResult
  error?: string
  processingStatus?: ProcessingStatus
}

interface BatchProcessingResult {
  totalFiles: number
  completedFiles: number
  successfulFiles: number
  failedFiles: number
  results: { [fileId: string]: PredictionResult }
  errors: { [fileId: string]: string }
  batchId?: string
}

export default function PredictionAdminPage() {
  // 单文件上传状态
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [detectedYear, setDetectedYear] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null)
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null)
  const [academicRecordsCount, setAcademicRecordsCount] = useState<number | null>(null)
  const [managingDatabase, setManagingDatabase] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 批量上传状态
  const [batchFiles, setBatchFiles] = useState<BatchFileInfo[]>([])
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchResult, setBatchResult] = useState<BatchProcessingResult | null>(null)
  const [maxConcurrentProcessing, setMaxConcurrentProcessing] = useState(2)
  const [processingQueue, setProcessingQueue] = useState<string[]>([])
  const [activeProcessing, setActiveProcessing] = useState<Set<string>>(new Set())
  const batchFileInputRef = useRef<HTMLInputElement>(null)

  const availableYears = ['2021', '2022', '2023', '2024']

  // 从文件名检测年级
  const detectYearFromFilename = (filename: string): string | null => {
    const yearMatch = filename.match(/cohort(\d{4})|(\d{4})级/i)
    if (yearMatch) {
      const year = yearMatch[1] || yearMatch[2]
      if (availableYears.includes(year)) {
        return year
      }
    }
    return null
  }

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPredictionResult(null)
      
      // 自动检测年级
      const year = detectYearFromFilename(selectedFile.name)
      setDetectedYear(year)
      if (year) {
        setSelectedYear(year)
      }
    }
  }

  // 上传并运行预测
  const handlePrediction = async () => {
    if (!file || !selectedYear) return

    setProcessing(true)
    setUploadProgress(0)
    setPredictionResult(null)
    setProcessingStatus({ phase: '上传文件', message: '正在上传成绩文件...', progress: 10 })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('year', selectedYear)

    try {
      // 使用EventSource来接收实时进度更新
      const response = await fetch('/api/admin/prediction/run', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          setPredictionResult({
            success: true,
            message: result.message,
            year: selectedYear,
            processedStudents: result.processedStudents,
            outputFiles: result.outputFiles,
            errors: result.errors || [],
            downloadUrls: result.downloadUrls
          })
          setProcessingStatus({ phase: '完成', message: '预测完成！', progress: 100 })
          
          // 清空文件选择
          setFile(null)
          setSelectedYear('')
          setDetectedYear(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        } else {
          setPredictionResult({
            success: false,
            message: result.error || '预测失败',
            year: selectedYear,
            processedStudents: 0,
            outputFiles: [],
            errors: result.errors || []
          })
          setProcessingStatus(null)
        }
      } else {
        const error = await response.json()
        
        // 构建详细的错误信息
        let errorMessage = error.error || '预测失败'
        if (error.details) {
          errorMessage += `\n详细信息: ${error.details}`
        }
        if (error.failedMajor) {
          errorMessage += `\n失败专业: ${error.failedMajor}`
        }
        if (error.instructions) {
          errorMessage += `\n处理建议: ${error.instructions}`
        }
        
        setPredictionResult({
          success: false,
          message: errorMessage,
          year: selectedYear,
          processedStudents: error.processedStudents || 0,
          outputFiles: error.outputFiles || [],
          errors: error.errors || [error.details || errorMessage]
        })
        setProcessingStatus(null)
      }
    } catch (error) {
      setPredictionResult({
        success: false,
        message: '网络错误，请重试',
        year: selectedYear,
        processedStudents: 0,
        outputFiles: [],
        errors: [error instanceof Error ? error.message : '未知错误']
      })
      setProcessingStatus(null)
    }

    setProcessing(false)
    setUploadProgress(100)
  }

  // 下载预测结果文件
  const handleDownload = async (filename: string) => {
    try {
      const response = await fetch(`/api/admin/prediction/download?file=${encodeURIComponent(filename)}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
      } else {
        alert('下载失败')
      }
    } catch (error) {
      alert('下载失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 批量下载预测结果文件
  const handleBatchDownload = async (filename: string, batchId?: string) => {
    try {
      // 构建下载URL，如果是批量处理的文件，需要特殊处理路径
      let downloadUrl = `/api/admin/prediction/download?file=${encodeURIComponent(filename)}`
      if (batchId) {
        downloadUrl += `&batchId=${encodeURIComponent(batchId)}`
      }
      
      const response = await fetch(downloadUrl)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        // 清理文件名，移除批次ID前缀
        const cleanFilename = filename.replace(/^[^_]+_/, '')
        link.download = cleanFilename
        link.click()
        URL.revokeObjectURL(url)
      } else {
        alert('下载失败')
      }
    } catch (error) {
      alert('下载失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 检查成绩表记录数
  const handleCheckAcademicRecords = async () => {
    setManagingDatabase(true)
    try {
      const response = await fetch('/api/admin/academic-records/count')
      if (response.ok) {
        const result = await response.json()
        setAcademicRecordsCount(result.count)
      } else {
        const error = await response.json()
        alert('检查失败: ' + (error.error || '未知错误'))
      }
    } catch (error) {
      alert('检查失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
    setManagingDatabase(false)
  }

  // 删除成绩表数据
  const handleDeleteAcademicRecords = async () => {
    if (!confirm('确定要删除成绩表的所有数据吗？此操作不可恢复！')) {
      return
    }

    setManagingDatabase(true)
    try {
      const response = await fetch('/api/admin/academic-records/clear', {
        method: 'DELETE'
      })
      if (response.ok) {
        const result = await response.json()
        setAcademicRecordsCount(0)
        alert('成绩表数据已清空！删除了 ' + result.deletedCount + ' 条记录。')
      } else {
        const error = await response.json()
        alert('删除失败: ' + (error.error || '未知错误'))
      }
    } catch (error) {
      alert('删除失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
    setManagingDatabase(false)
  }

  // 批量文件选择处理
  const handleBatchFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    
    if (selectedFiles.length === 0) return

    const newBatchFiles: BatchFileInfo[] = selectedFiles.map((file, index) => {
      const detectedYear = detectYearFromFilename(file.name)
      return {
        id: `batch_${Date.now()}_${index}`,
        file,
        year: detectedYear || '2024', // 默认年级
        status: 'pending',
        progress: 0
      }
    })

    setBatchFiles(prev => [...prev, ...newBatchFiles])
    setBatchResult(null)
  }

  // 更新批量文件的年级
  const updateBatchFileYear = (fileId: string, year: string) => {
    setBatchFiles(prev => 
      prev.map(file => 
        file.id === fileId ? { ...file, year } : file
      )
    )
  }

  // 删除批量文件
  const removeBatchFile = (fileId: string) => {
    setBatchFiles(prev => prev.filter(file => file.id !== fileId))
  }

  // 清空批量文件列表
  const clearBatchFiles = () => {
    setBatchFiles([])
    setBatchResult(null)
    if (batchFileInputRef.current) {
      batchFileInputRef.current.value = ''
    }
  }

  // 开始批量处理（使用新的批量API）
  const handleBatchProcessing = async () => {
    if (batchFiles.length === 0) return

    setBatchProcessing(true)
    setBatchProgress(0)
    setBatchResult(null)

    // 重置所有文件状态为处理中
    setBatchFiles(prev => 
      prev.map(file => ({ 
        ...file, 
        status: 'processing', 
        progress: 10, 
        result: undefined, 
        error: undefined,
        processingStatus: { phase: '准备中', message: '准备批量处理...', progress: 10 }
      }))
    )

    try {
      const formData = new FormData()
      
      // 添加所有文件
      batchFiles.forEach(fileInfo => {
        formData.append('files', fileInfo.file)
        formData.append('years', fileInfo.year)
      })
      
      // 添加并发配置
      formData.append('maxConcurrent', maxConcurrentProcessing.toString())

      console.log(`开始批量处理 ${batchFiles.length} 个文件，并发数: ${maxConcurrentProcessing}`)

      // 更新状态为上传中
      setBatchFiles(prev => 
        prev.map(file => ({ 
          ...file, 
          progress: 20,
          processingStatus: { phase: '上传中', message: '正在上传文件到服务器...', progress: 20 }
        }))
      )

      const response = await fetch('/api/admin/prediction/batch', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        console.log('批量处理结果:', result)
        
        if (result.success) {
          // 根据API返回的结果更新文件状态
          setBatchFiles(prev => 
            prev.map((file, index) => {
              // API中使用的fileId格式
              const apiFileId = `file_${index}_${Math.floor(Date.now() / 1000)}`
              const hasResult = result.batchResult.results[apiFileId]
              const hasError = result.batchResult.errors[apiFileId]
              
              let status: 'completed' | 'error' = 'completed'
              let resultData: PredictionResult | undefined = undefined
              let errorMsg: string | undefined = undefined
              
              if (hasError) {
                status = 'error'
                errorMsg = hasError
              } else if (hasResult) {
                status = 'completed'
                // 构建预测结果对象
                resultData = {
                  success: true,
                  message: '预测完成',
                  year: file.year,
                  processedStudents: hasResult.processedStudents || 0,
                  outputFiles: hasResult.outputFiles || [],
                  errors: []
                }
              } else {
                // 检查是否在汇总结果中
                const foundInResults = Object.keys(result.batchResult.results).length > 0
                const foundInErrors = Object.keys(result.batchResult.errors).length > 0
                
                if (foundInResults && !foundInErrors) {
                  status = 'completed'
                  resultData = {
                    success: true,
                    message: '预测完成',
                    year: file.year,
                    processedStudents: 0,
                    outputFiles: result.summary?.allOutputFiles?.filter((f: string) => f.includes(file.year)) || [],
                    errors: []
                  }
                } else {
                  status = 'error'
                  errorMsg = '未找到处理结果'
                }
              }
              
              return {
                ...file,
                status,
                progress: 100,
                result: resultData,
                error: errorMsg,
                processingStatus: { 
                  phase: status === 'completed' ? '完成' : '错误', 
                  message: status === 'completed' ? '批量处理完成！' : (errorMsg || '处理失败'), 
                  progress: 100 
                }
              }
            })
          )

          // 生成批量处理结果
          const successfulFiles = Object.keys(result.batchResult.results).length
          const failedFiles = Object.keys(result.batchResult.errors).length
          const results: { [fileId: string]: PredictionResult } = {}
          const errors: { [fileId: string]: string } = result.batchResult.errors
          
          // 转换结果格式
          Object.entries(result.batchResult.results).forEach(([fileId, apiResult]: [string, any]) => {
            results[fileId] = {
              success: true,
              message: '预测完成',
              year: batchFiles[0]?.year || '',
              processedStudents: 0, // 可以从API结果中提取
              outputFiles: apiResult.outputFiles || [],
              errors: [],
              batchId: result.batchResult.batchId // 添加batchId用于下载
            }
          })

          setBatchResult({
            totalFiles: batchFiles.length,
            completedFiles: successfulFiles + failedFiles,
            successfulFiles,
            failedFiles,
            results,
            errors,
            batchId: result.batchResult.batchId // 保存batchId
          })

          setBatchProgress(100)
        } else {
          // 构建详细错误信息
          let errorMessage = result.error || '批量处理失败'
          if (result.details) {
            errorMessage += `\n详细信息: ${result.details}`
          }
          if (result.failedMajor) {
            errorMessage += `\n失败专业: ${result.failedMajor}`
          }
          if (result.instructions) {
            errorMessage += `\n处理建议: ${result.instructions}`
          }
          throw new Error(errorMessage)
        }
      } else {
        const error = await response.json()
        // 构建详细错误信息  
        let errorMessage = error.error || '批量处理失败'
        if (error.details) {
          errorMessage += `\n详细信息: ${error.details}`
        }
        if (error.failedMajor) {
          errorMessage += `\n失败专业: ${error.failedMajor}`
        }
        if (error.instructions) {
          errorMessage += `\n处理建议: ${error.instructions}`
        }
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('批量处理失败:', error)
      
      // 更新所有文件状态为错误
      setBatchFiles(prev => 
        prev.map(file => ({
          ...file,
          status: 'error',
          progress: 100,
          error: error instanceof Error ? error.message : '批量处理失败',
          processingStatus: { phase: '错误', message: '批量处理失败', progress: 100 }
        }))
      )

      // 设置错误结果
      const errors: { [fileId: string]: string } = {}
      batchFiles.forEach(file => {
        errors[file.id] = error instanceof Error ? error.message : '批量处理失败'
      })

      setBatchResult({
        totalFiles: batchFiles.length,
        completedFiles: batchFiles.length,
        successfulFiles: 0,
        failedFiles: batchFiles.length,
        results: {},
        errors
      })

      setBatchProgress(100)
    }

    setBatchProcessing(false)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">学生去向预测系统</h1>
        <p className="text-muted-foreground mt-2">
          上传成绩表文件，自动生成学生去向预测结果
        </p>
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            单文件处理
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4" />
            批量处理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">

      {/* 成绩表管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            成绩表管理
          </CardTitle>
          <CardDescription>
            管理 academic_results 表的数据，查看记录数和清空数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCheckAcademicRecords}
              disabled={managingDatabase}
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              {managingDatabase ? '检查中...' : '检查成绩表'}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDeleteAcademicRecords}
              disabled={managingDatabase}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {managingDatabase ? '删除中...' : '清空成绩表'}
            </Button>
          </div>

          {academicRecordsCount !== null && (
            <Alert>
              <Database className="w-4 h-4" />
              <AlertDescription>
                成绩表当前记录数：<strong>{academicRecordsCount}</strong> 条
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 文件上传和预测配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            上传成绩文件并运行预测
          </CardTitle>
          <CardDescription>
            支持上传Excel(.xlsx)文件，文件名应包含年级信息（如：Cohort2022_NoPre20SN_masked Aug25.xlsx）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">选择成绩文件</Label>
            <Input
              ref={fileInputRef}
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={processing}
            />
          </div>

          {file && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                <span className="text-sm">{file.name}</span>
              </div>

              {/* 年级选择 */}
              <div className="space-y-2">
                <Label htmlFor="year">选择年级</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear} disabled={processing}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择年级" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year}>
                        {year}级
                        {detectedYear === year && (
                          <span className="ml-2 text-xs text-green-600">(自动检测)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handlePrediction}
                disabled={processing || !selectedYear}
                className="w-full flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                {processing ? '预测中...' : '开始预测'}
              </Button>
            </div>
          )}

          {/* 处理进度 */}
          {processingStatus && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">{processingStatus.phase}</span>
              </div>
              <p className="text-sm text-muted-foreground">{processingStatus.message}</p>
              <Progress value={processingStatus.progress} className="w-full" />
            </div>
          )}

          {/* 预测结果 */}
          {predictionResult && (
            <Alert className={predictionResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {predictionResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-medium">{predictionResult.message}</p>
                    
                    {predictionResult.success && (
                      <>
                        <div className="text-sm space-y-1">
                          <p>处理年级：{predictionResult.year}级</p>
                          <p>处理学生数量：{predictionResult.processedStudents}人</p>
                          <p>生成文件数量：{predictionResult.outputFiles.length}个</p>
                        </div>

                        {predictionResult.outputFiles.length > 0 && (
                          <div className="space-y-2">
                            <p className="font-medium text-sm">下载预测结果：</p>
                            <div className="space-y-2">
                              {predictionResult.outputFiles.map((filename, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-md">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm">{filename}</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDownload(filename)}
                                    className="flex items-center gap-1"
                                  >
                                    <Download className="w-3 h-3" />
                                    下载
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {predictionResult.errors.length > 0 && (
                      <div>
                        <p className="font-semibold text-sm">错误信息：</p>
                        <pre className="mt-2 h-32 p-3 text-xs bg-gray-100 rounded-md overflow-auto border">
                          {predictionResult.errors.join('\n')}
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

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium">文件格式要求：</h4>
            <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
              <li>支持Excel格式(.xlsx, .xls)</li>
              <li>文件名建议包含年级信息，如：Cohort2022_***.xlsx</li>
              <li>文件应包含学生成绩数据，包括课程名称、成绩等信息</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium">预测流程：</h4>
            <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
              <li>系统会根据文件名自动识别年级，也可手动选择</li>
              <li><strong>步骤1:</strong> 自动将成绩数据导入到 academic_results 表</li>
              <li><strong>步骤2:</strong> 调用机器学习模型分析成绩数据</li>
              <li>生成学生去向预测结果（保研、出国、就业等）</li>
              <li>提供Excel格式的预测结果文件下载</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium">成绩表管理：</h4>
            <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
              <li><strong>检查成绩表:</strong> 查看 academic_results 表的当前记录数</li>
              <li><strong>清空成绩表:</strong> 删除 academic_results 表的所有数据</li>
              <li>每次运行预测时，会自动删除对应年级的旧成绩数据并导入新数据</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium">支持的年级：</h4>
            <p className="ml-4 text-muted-foreground">
              {availableYears.map(year => `${year}级`).join('、')}
            </p>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-6">
          {/* 批量上传配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5" />
                批量文件上传
              </CardTitle>
              <CardDescription>
                选择多个成绩表文件，系统将并行处理这些文件的预测任务
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batch-files">选择多个成绩文件</Label>
                <Input
                  ref={batchFileInputRef}
                  id="batch-files"
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  onChange={handleBatchFileSelect}
                  disabled={batchProcessing}
                />
              </div>

              {/* 并发设置 */}
              <div className="space-y-2">
                <Label htmlFor="concurrent">并发处理数量</Label>
                <Select 
                  value={maxConcurrentProcessing.toString()} 
                  onValueChange={(value) => setMaxConcurrentProcessing(parseInt(value))}
                  disabled={batchProcessing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择并发数量" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 个文件（顺序处理）</SelectItem>
                    <SelectItem value="2">2 个文件（推荐）</SelectItem>
                    <SelectItem value="3">3 个文件</SelectItem>
                    <SelectItem value="4">4 个文件（高负载）</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  并发数量越高处理越快，但会消耗更多系统资源
                </p>
              </div>

              {/* 文件列表 */}
              {batchFiles.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">已选择的文件 ({batchFiles.length}个)</h4>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearBatchFiles}
                        disabled={batchProcessing}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        清空
                      </Button>
                      <Button
                        onClick={handleBatchProcessing}
                        disabled={batchProcessing || batchFiles.length === 0}
                        className="flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        {batchProcessing ? '处理中...' : '开始批量处理'}
                      </Button>
                    </div>
                  </div>

                  {/* 整体进度 */}
                  {batchProcessing && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">
                          整体进度: {Math.round(batchProgress)}%
                        </span>
                      </div>
                      <Progress value={batchProgress} className="w-full" />
                    </div>
                  )}

                  {/* 文件列表显示 */}
                  <div className="space-y-3 max-h-96 overflow-y-auto border rounded-md p-3">
                    {batchFiles.map((fileInfo) => (
                      <div 
                        key={fileInfo.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileSpreadsheet className={`w-5 h-5 ${
                            fileInfo.status === 'completed' ? 'text-green-500' :
                            fileInfo.status === 'processing' ? 'text-blue-500' :
                            fileInfo.status === 'error' ? 'text-red-500' :
                            'text-gray-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium truncate max-w-xs">
                              {fileInfo.file.name}
                            </p>
                            <div className="flex items-center gap-4 mt-1">
                              <Select 
                                value={fileInfo.year} 
                                onValueChange={(year) => updateBatchFileYear(fileInfo.id, year)}
                                disabled={batchProcessing || fileInfo.status !== 'pending'}
                              >
                                <SelectTrigger className="w-20 h-6 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableYears.map(year => (
                                    <SelectItem key={year} value={year} className="text-xs">
                                      {year}级
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              {fileInfo.processingStatus && (
                                <span className="text-xs text-muted-foreground">
                                  {fileInfo.processingStatus.message}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* 状态显示 */}
                          <div className="flex items-center gap-2">
                            {fileInfo.status === 'completed' && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {fileInfo.status === 'processing' && (
                              <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                            )}
                            {fileInfo.status === 'error' && (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            {fileInfo.status === 'pending' && (
                              <Clock className="w-4 h-4 text-gray-400" />
                            )}
                          </div>

                          {/* 进度条 */}
                          {fileInfo.status === 'processing' && (
                            <div className="w-16">
                              <Progress value={fileInfo.progress} className="h-2" />
                            </div>
                          )}

                          {/* 删除按钮 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBatchFile(fileInfo.id)}
                            disabled={batchProcessing}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 批量处理结果 */}
          {batchResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  批量处理结果
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-md">
                    <div className="text-2xl font-bold text-blue-600">{batchResult.totalFiles}</div>
                    <div className="text-sm text-muted-foreground">总文件数</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-md">
                    <div className="text-2xl font-bold text-green-600">{batchResult.successfulFiles}</div>
                    <div className="text-sm text-muted-foreground">成功处理</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-md">
                    <div className="text-2xl font-bold text-red-600">{batchResult.failedFiles}</div>
                    <div className="text-sm text-muted-foreground">处理失败</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="text-2xl font-bold text-gray-600">{batchResult.completedFiles}</div>
                    <div className="text-sm text-muted-foreground">已完成</div>
                  </div>
                </div>

                {/* 成功的文件结果 */}
                {Object.keys(batchResult.results).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-600">成功处理的文件:</h4>
                    <div className="space-y-2">
                      {Object.entries(batchResult.results).map(([fileId, result]) => {
                        const fileInfo = batchFiles.find(f => f.id === fileId)
                        return (
                          <div key={fileId} className="p-3 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{fileInfo?.file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {result.year}级 · {result.processedStudents}名学生 · {result.outputFiles.length}个输出文件
                                </p>
                              </div>
                              {result.outputFiles.length > 0 && (
                                <div className="space-x-1">
                                  {result.outputFiles.map((filename, index) => (
                                    <Button
                                      key={index}
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleBatchDownload(filename, batchResult?.batchId)}
                                      className="text-xs"
                                    >
                                      <Download className="w-3 h-3 mr-1" />
                                      {filename.includes('_All.') ? '汇总' : filename.split('_').pop()?.split('.')[0]}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 失败的文件错误信息 */}
                {Object.keys(batchResult.errors).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600">处理失败的文件:</h4>
                    <div className="space-y-2">
                      {Object.entries(batchResult.errors).map(([fileId, error]) => {
                        const fileInfo = batchFiles.find(f => f.id === fileId)
                        return (
                          <div key={fileId} className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="font-medium text-sm">{fileInfo?.file.name}</p>
                            <p className="text-xs text-red-600 mt-1">{error}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 批量处理管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SkipForward className="w-5 h-5" />
                批量处理管理
              </CardTitle>
              <CardDescription>
                管理批量处理任务和临时文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    fetch('/api/admin/prediction/cleanup', { method: 'POST' })
                      .then(response => response.json())
                      .then(result => {
                        if (result.success) {
                          alert(`清理完成！删除了 ${result.deletedDirs} 个临时目录`)
                        } else {
                          alert('清理失败: ' + (result.error || '未知错误'))
                        }
                      })
                      .catch(error => {
                        alert('清理失败: ' + error.message)
                      })
                  }}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  清理临时文件
                </Button>
                
                {batchResult && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBatchResult(null)
                      setBatchFiles([])
                      setBatchProgress(0)
                    }}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    清除批量结果
                  </Button>
                )}
              </div>
              
              {batchResult && (
                <Alert>
                  <Database className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>当前批量处理任务ID: <code className="text-xs bg-gray-100 px-1 rounded">{batchResult.batchId}</code></p>
                      <p className="text-xs text-muted-foreground">
                        任务完成时间: {new Date().toLocaleString()}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* 批量处理使用说明 */}
          <Card>
            <CardHeader>
              <CardTitle>批量处理说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium">功能特点：</h4>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>支持同时上传多个Excel文件进行批量处理</li>
                  <li>可配置并发处理数量，最多支持4个文件同时处理</li>
                  <li>自动检测文件名中的年级信息，也可手动调整</li>
                  <li>实时显示每个文件的处理进度和状态</li>
                  <li>处理完成后可批量下载所有预测结果</li>
                  <li>智能错误恢复，单个文件失败不影响其他文件</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">并发处理建议：</h4>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li><strong>1个文件：</strong> 适合服务器资源有限的情况</li>
                  <li><strong>2个文件：</strong> 推荐设置，平衡处理速度和稳定性</li>
                  <li><strong>3-4个文件：</strong> 适合高性能服务器，处理速度最快</li>
                  <li>处理时间与文件大小和学生数量相关，通常5-20分钟</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">错误处理：</h4>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>如果某个文件处理失败，其他文件会继续正常处理</li>
                  <li>失败的文件会显示具体的错误信息</li>
                  <li>可以重新上传失败的文件单独处理</li>
                  <li>系统会自动清理过期的临时文件</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">注意事项：</h4>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>批量处理采用优化的数据导入策略，避免并发冲突</li>
                  <li>建议在服务器负载较低时进行批量处理</li>
                  <li>处理过程中请不要关闭浏览器页面</li>
                  <li>定期清理临时文件以释放存储空间</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
