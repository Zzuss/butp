'use client'

import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { AlertCircle, FileText, RefreshCw, CheckCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PrivacyPolicy {
  id: number
  title: string
  content: string
  version: string
  effective_date: string
}

interface PrivacyAgreementModalProps {
  userId: string
  isOpen: boolean
  onAgree: () => void
  onClose?: () => void
}

export default function PrivacyAgreementModal({ 
  userId, 
  isOpen, 
  onAgree, 
  onClose 
}: PrivacyAgreementModalProps) {
  const [privacyPolicy, setPrivacyPolicy] = useState<PrivacyPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [agreeing, setAgreeing] = useState(false)
  const [hasRead, setHasRead] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 加载隐私条款
  const loadPrivacyPolicy = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/privacy-policy', {
        method: 'GET'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setPrivacyPolicy(data.data)
      } else {
        setError(data.error || '加载隐私条款失败')
      }
    } catch (error) {
      console.error('加载隐私条款失败:', error)
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 同意隐私条款
  const handleAgree = async () => {
    if (!hasRead) {
      setError('请先仔细阅读隐私条款并勾选同意选项')
      return
    }

    if (!privacyPolicy) {
      setError('隐私条款加载失败，请重试')
      return
    }

    try {
      setAgreeing(true)
      setError('')
      
      const response = await fetch('/api/privacy-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          privacyPolicyId: privacyPolicy.id
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('隐私条款同意成功！')
        setTimeout(() => {
          onAgree()
        }, 1000)
      } else {
        setError(data.error || '同意失败，请重试')
      }
    } catch (error) {
      console.error('同意隐私条款失败:', error)
      setError('网络错误，请重试')
    } finally {
      setAgreeing(false)
    }
  }

  // 格式化时间
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  // 组件加载时获取数据
  useEffect(() => {
    if (isOpen) {
      loadPrivacyPolicy()
      setHasRead(false)
      setError('')
      setSuccess('')
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              隐私条款更新 - 需要您的同意
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              我们已更新隐私条款，请仔细阅读并同意后继续使用
            </p>
          </div>
          {onClose && (
            <Button onClick={onClose} variant="outline" size="sm">
              取消
            </Button>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mx-6 mt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* 成功提示 */}
        {success && (
          <div className="mx-6 mt-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">正在加载隐私条款...</p>
            </div>
          ) : privacyPolicy ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {privacyPolicy.title}
                </h3>
                <div className="text-sm text-gray-500 space-x-4">
                  <span>版本: {privacyPolicy.version}</span>
                  <span>生效日期: {formatDate(privacyPolicy.effective_date)}</span>
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                <ReactMarkdown>{privacyPolicy.content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">加载隐私条款失败</p>
              <Button onClick={loadPrivacyPolicy} className="mt-4">
                重新加载
              </Button>
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        {privacyPolicy && !loading && (
          <div className="border-t p-6 space-y-4">
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="privacy-agreement"
                checked={hasRead}
                onChange={(e) => setHasRead(e.target.checked)}
                disabled={agreeing}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="privacy-agreement"
                className="text-sm text-gray-700 cursor-pointer"
              >
                我已仔细阅读并完全理解上述隐私条款，同意按照该条款处理我的个人信息。
                我了解可以随时撤销此同意，但这可能会影响相关服务的使用。
              </label>
            </div>
            
            <div className="flex justify-end space-x-3">
              {onClose && (
                <Button onClick={onClose} variant="outline" disabled={agreeing}>
                  拒绝并退出
                </Button>
              )}
              <Button
                onClick={handleAgree}
                disabled={!hasRead || agreeing}
                className="min-w-[100px]"
              >
                {agreeing ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    处理中...
                  </div>
                ) : (
                  '同意并继续'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
