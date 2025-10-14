'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, Upload, FileSpreadsheet, Database, Trash2, FileText } from 'lucide-react'

interface ImportResult {
  success: boolean
  message: string
  year: string
  major: string
  importedCount: number
  totalCount: number
  errors: string[]
  tableName: string
}

interface ImportStatus {
  phase: string
  message: string
  progress: number
}

// 专业代码映射
const MAJOR_CODE_MAP: { [key: string]: string } = {
  '智能科学与技术': 'ai',
  '电子信息工程': 'ee', 
  '物联网工程': 'iot',
  '电信工程及管理': 'tewm'
}

// 年级配置
const YEAR_CONFIGS: { [key: string]: any } = {
  '2021': {
    majors: ['物联网工程', '电信工程及管理', '电子商务及法律']
  },
  '2022': {
    majors: ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程']
  },
  '2023': {
    majors: ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程']
  },
  '2024': {
    majors: ['智能科学与技术', '物联网工程', '电信工程及管理', '电子信息工程']
  }
}

export default function PredictionImportPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [selectedMajor, setSelectedMajor] = useState<string>('')
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const availableYears = ['2021', '2022', '2023', '2024']
  const availableMajors = selectedYear ? YEAR_CONFIGS[selectedYear]?.majors || [] : []

  // 检测文件名中的年级和专业信息
  const detectFileInfo = (filename: string) => {
    // 检测年级 (如 Cohort2022, 2022级)
    const yearMatch = filename.match(/cohort(\d{4})|(\d{4})级/i)
    let detectedYear = null
    if (yearMatch) {
      const year = yearMatch[1] || yearMatch[2]
      if (availableYears.includes(year)) {
        detectedYear = year
      }
    }

    // 检测专业代码 (如 _ai, _iot, _ee, _tewm)
    let detectedMajor = null
    for (const [majorName, majorCode] of Object.entries(MAJOR_CODE_MAP)) {
      if (filename.toLowerCase().includes(`_${majorCode}.xlsx`) || 
          filename.toLowerCase().includes(`_${majorCode}_`)) {
        detectedMajor = majorName
        break
      }
    }

    return { detectedYear, detectedMajor }
  }

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles)
      setImportResults([])
      
      // 如果只有一个文件，尝试自动检测年级和专业
      if (selectedFiles.length === 1) {
        const { detectedYear, detectedMajor } = detectFileInfo(selectedFiles[0].name)
        if (detectedYear) {
          setSelectedYear(detectedYear)
        }
        if (detectedMajor) {
          setSelectedMajor(detectedMajor)
        }
      }
    }
  }

  // 清空已选文件
  const handleClearFiles = () => {
    setFiles([])
    setSelectedYear('')
    setSelectedMajor('')
    setImportResults([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 导入预测表
  const handleImport = async () => {
    if (files.length === 0 || !selectedYear) return

    setProcessing(true)
    setImportResults([])
    setImportStatus({ phase: '准备导入', message: '正在准备导入预测数据...', progress: 10 })

    const results: ImportResult[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const progress = Math.round((i / files.length) * 80) + 10

      setImportStatus({ 
        phase: `导入文件 ${i + 1}/${files.length}`, 
        message: `正在导入 ${file.name}...`, 
        progress: progress 
      })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('year', selectedYear)
      
      // 如果是单文件模式且选择了专业，传递专业信息
      if (files.length === 1 && selectedMajor) {
        formData.append('major', selectedMajor)
      }

      try {
        const response = await fetch('/api/admin/prediction-import', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const result = await response.json()
          results.push(result)
        } else {
          const error = await response.json()
          results.push({
            success: false,
            message: error.error || '导入失败',
            year: selectedYear,
            major: '未知',
            importedCount: 0,
            totalCount: 0,
            errors: error.errors || [],
            tableName: ''
          })
        }
      } catch (error) {
        results.push({
          success: false,
          message: '网络错误，请重试',
          year: selectedYear,
          major: '未知',
          importedCount: 0,
          totalCount: 0,
          errors: [error instanceof Error ? error.message : '未知错误'],
          tableName: ''
        })
      }

      // 短暂延迟，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setImportResults(results)
    setImportStatus({ phase: '完成', message: '导入完成！', progress: 100 })
    setProcessing(false)

    // 清空文件选择
    handleClearFiles()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">预测表导入工具</h1>
        <p className="text-muted-foreground mt-2">
          独立的预测表导入功能，用于测试和单独导入各专业的预测文件到数据库
        </p>
      </div>

      {/* 文件上传和配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            上传预测文件
          </CardTitle>
          <CardDescription>
            上传预测Excel文件（如：Cohort2022_Predictions_ai.xlsx），支持多文件批量导入
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="files">选择预测文件</Label>
            <Input
              ref={fileInputRef}
              id="files"
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={handleFileSelect}
              disabled={processing}
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">已选文件：{files.length} 个</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClearFiles}
                  disabled={processing}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  清空
                </Button>
              </div>

              {/* 显示选中的文件 */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => {
                  const { detectedYear, detectedMajor } = detectFileInfo(file.name)
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                      <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                      <span className="text-sm flex-1">{file.name}</span>
                      {detectedYear && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          {detectedYear}级
                        </span>
                      )}
                      {detectedMajor && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          {detectedMajor}
                        </span>
                      )}
                    </div>
                  )
                })}
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
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 单文件时的专业选择 */}
              {files.length === 1 && selectedYear && (
                <div className="space-y-2">
                  <Label htmlFor="major">选择专业 (单文件模式)</Label>
                  <Select value={selectedMajor} onValueChange={setSelectedMajor} disabled={processing}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择专业" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMajors.map((major: string) => (
                        <SelectItem key={major} value={major}>
                          {major}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={processing || !selectedYear}
                className="w-full flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                {processing ? '导入中...' : '开始导入预测表'}
              </Button>
            </div>
          )}

          {/* 导入进度 */}
          {importStatus && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">{importStatus.phase}</span>
              </div>
              <p className="text-sm text-muted-foreground">{importStatus.message}</p>
              <Progress value={importStatus.progress} className="w-full" />
            </div>
          )}

          {/* 导入结果 */}
          {importResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">导入结果：</h4>
              {importResults.map((result, index) => (
                <Alert 
                  key={index} 
                  className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}
                >
                  <div className="flex items-start gap-2">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    )}
                    <AlertDescription className="flex-1">
                      <div className="space-y-2">
                        <p className="font-medium">{result.message}</p>
                        
                        {result.success && (
                          <div className="text-sm space-y-1">
                            <p>年级：{result.year}级</p>
                            <p>专业：{result.major}</p>
                            <p>表名：{result.tableName}</p>
                            <p>导入记录数：{result.importedCount}/{result.totalCount} 条</p>
                          </div>
                        )}

                        {result.errors.length > 0 && (
                          <div>
                            <p className="font-semibold text-sm">错误信息：</p>
                            <div className="mt-1 max-h-24 overflow-y-auto">
                              {result.errors.map((error, errorIndex) => (
                                <p key={errorIndex} className="text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1">
                                  {error}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                </Alert>
              ))}
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
              <li>文件名应包含专业代码，如：Cohort2022_Predictions_ai.xlsx</li>
              <li>文件内应有 'Predictions' 工作表</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium">专业代码对应：</h4>
            <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
              <li>ai - 智能科学与技术</li>
              <li>ee - 电子信息工程</li>
              <li>iot - 物联网工程</li>
              <li>tewm - 电信工程及管理</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium">导入规则：</h4>
            <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
              <li>系统会自动检测文件名中的年级和专业信息</li>
              <li>导入前会清空对应表中的现有数据</li>
              <li>数据会直接导入到 Cohort[年级]_Predictions_[专业代码] 表</li>
              <li>支持批量导入多个专业的预测文件</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium">数据库表：</h4>
            <p className="ml-4 text-muted-foreground">
              预测数据表：Cohort2022_Predictions_ai、Cohort2022_Predictions_ee 等<br/>
              概率数据表：cohort_probability（汇总各专业的概率数据）
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
