"use client"

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, FileText, Upload, RefreshCw, CheckCircle, Download, FileUp } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function PrivacyPolicyAdminPage() {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [checking, setChecking] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [agreementStats, setAgreementStats] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 下载当前隐私条款文件
  const handleDownload = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/admin/privacy-policy/download', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '下载失败')
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = '隐私政策与用户数据使用条款.docx' // Default filename

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1]
        }
      }

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      setSuccess('文件下载成功！')
    } catch (err: any) {
      console.error('下载失败:', err)
      setError(err.message || '下载当前隐私条款文件失败')
    } finally {
      setLoading(false)
    }
  }

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 检查文件类型 - 支持常见文档格式
      const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/pdf', 'text/plain', 'text/html']
      const allowedExtensions = /\.(docx|doc|pdf|txt|html)$/i
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.test(file.name)) {
        setError('仅支持 .docx, .doc, .pdf, .txt, .html 文件格式')
        return
      }

      // 检查文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('文件大小不能超过 10MB')
        return
      }

      setSelectedFile(file)
      setError('')
    }
  }

  // 上传隐私条款文件
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('请先选择文件')
      return
    }

    try {
      setUploading(true)
      setError('')
      setSuccess('')

      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)
      
      const response = await fetch('/api/admin/privacy-policy/replace', {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('隐私条款文件替换成功！所有用户需要重新同意。')
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setError(data.error || '上传失败')
      }
    } catch (error) {
      console.error('上传失败:', error)
      setError('网络错误，请重试')
    } finally {
      setUploading(false)
    }
  }

  // 清除文件选择
  const handleClearFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 检查用户同意记录状态
  const handleCheckAgreements = async () => {
    try {
      setChecking(true)
      setError('')
      
      const response = await fetch('/api/admin/check-privacy-agreements', {
        method: 'GET',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setAgreementStats(data.data)
        setSuccess(`检查完成！当前有 ${data.data.totalCount} 条用户同意记录`)
      } else {
        setError(data.error || '检查失败')
      }
    } catch (error) {
      console.error('检查失败:', error)
      setError('网络错误，请重试')
    } finally {
      setChecking(false)
    }
  }

  // 修复表结构
  const handleFixTable = async () => {
    try {
      setFixing(true)
      setError('')
      
      const response = await fetch('/api/admin/fix-privacy-table', {
        method: 'POST',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(`表结构修复完成！${data.operations.join(', ')}`)
        // 清空统计数据，因为记录已被清空
        setAgreementStats(null)
      } else {
        setError(data.error || '修复失败')
      }
    } catch (error) {
      console.error('修复失败:', error)
      setError('网络错误，请重试')
    } finally {
      setFixing(false)
    }
  }

  return (
    <AdminLayout showBackButton={true}>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              隐私条款管理
            </h1>
            <p className="text-gray-600 mt-1">
              上传新文件直接替换当前隐私条款，所有用户需要重新同意
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleFixTable}
              variant="destructive"
              className="flex items-center gap-2"
              disabled={fixing}
            >
              {fixing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              修复表结构
            </Button>
            <Button
              onClick={handleCheckAgreements}
              variant="outline"
              className="flex items-center gap-2"
              disabled={checking}
            >
              {checking ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              检查同意记录
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              下载当前文件
            </Button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 成功提示 */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* 用户同意记录统计 */}
        {agreementStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                用户同意记录统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="font-semibold text-blue-800">总记录数</p>
                  <p className="text-2xl font-bold text-blue-600">{agreementStats.totalCount}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="font-semibold text-green-800">文件版本数</p>
                  <p className="text-2xl font-bold text-green-600">{agreementStats.uniqueFiles}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="font-semibold text-purple-800">最新同意时间</p>
                  <p className="text-sm text-purple-600">
                    {agreementStats.latestAgreement ? new Date(agreementStats.latestAgreement).toLocaleString('zh-CN') : '无记录'}
                  </p>
                </div>
              </div>
              {agreementStats.fileStats && Object.keys(agreementStats.fileStats).length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold text-gray-700 mb-2">按文件分组统计:</p>
                  <div className="space-y-1">
                    {Object.entries(agreementStats.fileStats).map(([fileName, count]) => (
                      <div key={fileName} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm text-gray-700">{fileName}</span>
                        <span className="text-sm font-semibold text-gray-900">{count as number} 条记录</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 当前文件信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              当前隐私条款文件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-700">
              <p><strong>文件名:</strong> privacy-policy-latest.docx (当前活跃版本)</p>
              <p><strong>位置:</strong> Supabase Storage Bucket: privacy-files</p>
              <p><strong>状态:</strong> <span className="text-green-600">✅ 已部署</span></p>
              <p className="text-amber-600 mt-2">
                <strong>⚠️ 注意:</strong> 上传新文件将直接替换当前文件，所有用户需要重新同意
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 文件上传区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              替换隐私条款文件
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">选择新的隐私条款文件</label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".docx,.doc,.pdf,.txt,.html"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                支持的文件格式: .docx, .doc, .pdf, .txt, .html (最大 10MB)
              </p>
            </div>

            {selectedFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">已选择文件</span>
                  </div>
                  <Button onClick={handleClearFile} variant="outline" size="sm">
                    清除
                  </Button>
                </div>
                <div className="text-sm text-blue-700">
                  <div>文件名: {selectedFile.name}</div>
                  <div>大小: {(selectedFile.size / 1024).toFixed(1)} KB</div>
                  <div>类型: {selectedFile.type || '未知'}</div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex items-center gap-2"
              >
                {uploading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? '替换中...' : '立即替换'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 简化的使用说明 */}
        <Card>
          <CardContent className="pt-6">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
              <p className="text-yellow-800 text-sm">
                <strong>操作说明：</strong> 选择新的隐私条款文件并点击"立即替换"，系统将直接替换现有文件。
                替换后，所有用户在下次访问时都需要重新同意新的隐私条款才能继续使用系统。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
