'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle, FileText, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
// FileContent interface now defined locally
interface FileContent {
  title: string
  content: string
  lastUpdated: string
  fileType: string
}

export default function PrivacyPolicyPage() {
  const [privacyContent, setPrivacyContent] = useState<FileContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 加载隐私条款
  const loadPrivacyContent = async () => {
    try {
      setLoading(true)
      setError('')
      
      // 从Supabase Storage读取隐私条款内容
      const response = await fetch('/api/privacy-content', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setPrivacyContent(data.data)
      } else {
        setError(data.error || '加载隐私条款失败')
      }
      
    } catch (error) {
      console.error('加载隐私条款失败:', error)
      setError('加载隐私条款失败，请刷新页面重试')
    } finally {
      setLoading(false)
    }
  }

  // 格式化时间
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  // 组件加载时获取数据
  useEffect(() => {
    loadPrivacyContent()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">正在加载隐私条款...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <button
                onClick={loadPrivacyContent}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                重新加载
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!privacyContent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">暂无隐私条款内容</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {privacyContent.title}
            </h1>
            <div className="text-sm text-gray-500">
              <span>最后更新: {privacyContent.lastUpdated}</span>
            </div>
          </div>
          
          <div className="prose prose-lg max-w-none">
            <div className="whitespace-pre-line text-gray-700 leading-relaxed">
              {privacyContent.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
