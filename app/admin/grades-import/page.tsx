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

interface FileInfo {
  id: string
  name: string
  size: number
  uploadTime: string
}

interface ImportStatus {
  phase: string
  message: string
  progress: number
}

interface ImportResult {
  success: boolean
  message: string
  importedCount: number
  totalCount: number
  errors: string[]
}

export default function GradesImportPage() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null)
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

  useEffect(() => {
    loadFileList()
  }, [])

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length === 0) return

    setUploading(true)
    setImportResult(null)

    try {
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/admin/grades-import/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '上传失败')
        }
      }

      // 重新加载文件列表
      await loadFileList()
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

  // 导入到数据库
  const handleImport = async () => {
    // 导入前先刷新文件列表，确保同步
    // 直接从API获取最新文件列表，不依赖状态
    let currentFiles: FileInfo[] = []
    try {
      const response = await fetch('/api/admin/grades-import/files')
      if (response.ok) {
        const data = await response.json()
        currentFiles = data.files || []
        // 更新状态
        setFiles(currentFiles)
      }
    } catch (error) {
      console.error('获取文件列表失败:', error)
    }
    
    if (currentFiles.length === 0) {
      alert('请先上传文件')
      return
    }

    if (!confirm(`确定要将 ${currentFiles.length} 个文件导入到数据库吗？此操作将使用影子表机制，导入成功后才会替换现有数据。`)) {
      return
    }

    setImporting(true)
    setImportStatus({ phase: '准备导入', message: '正在准备导入数据...', progress: 10 })
    setImportResult(null)

    try {
      const response = await fetch('/api/admin/grades-import/import', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setImportResult({
          success: true,
          message: data.message || '导入成功',
          importedCount: data.importedCount || 0,
          totalCount: data.totalCount || 0,
          errors: data.errors || [],
        })
        // 导入成功后清空文件列表
        await loadFileList()
      } else {
        setImportResult({
          success: false,
          message: data.message || '导入失败',
          importedCount: data.importedCount || 0,
          totalCount: data.totalCount || 0,
          errors: data.errors || [],
        })
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: '网络错误，请重试',
        importedCount: 0,
        totalCount: 0,
        errors: [error instanceof Error ? error.message : '未知错误'],
      })
    } finally {
      setImporting(false)
      setImportStatus(null)
    }
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
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              已上传文件列表 ({files.length})
            </CardTitle>
            <CardDescription>
              已上传的文件将按顺序导入到数据库
            </CardDescription>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无上传的文件</p>
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
            {importResult && (
              <Alert
                className={
                  importResult.success
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }
              >
                <div className="flex items-start gap-2">
                  {importResult.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  )}
                  <AlertDescription className="flex-1">
                    <div className="space-y-2">
                      <p className="font-medium">{importResult.message}</p>
                      {importResult.success && (
                        <div className="text-sm space-y-1">
                          <p>导入记录数：{importResult.importedCount}/{importResult.totalCount} 条</p>
                        </div>
                      )}
                      {importResult.errors.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm">错误信息：</p>
                          <div className="mt-1 max-h-24 overflow-y-auto">
                            {importResult.errors.map((error, index) => (
                              <p
                                key={index}
                                className="text-xs text-gray-600 bg-gray-100 p-2 rounded mt-1"
                              >
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
    </AdminLayout>
  )
}

