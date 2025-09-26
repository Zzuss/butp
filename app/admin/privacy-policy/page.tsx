"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, Trash2, FileText, Users, Clock, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import AdminLayout from '@/components/admin/AdminLayout'
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PrivacyStats {
  totalAgreements: number
  recentAgreements: Array<{
    SNH: string
    created_at: string
  }>
  queriedAt: string
}

export default function PrivacyPolicyAdminPage() {
  const [stats, setStats] = useState<PrivacyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 加载隐私条款统计数据
  const loadStats = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/admin/privacy-policy', {
        method: 'GET',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setStats(data)
      } else {
        setError(data.error || '加载统计数据失败')
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 清空所有隐私条款同意记录
  const handleClearAll = async () => {
    if (!confirm('⚠️ 确认要清空所有用户的隐私条款同意记录吗？\n\n这将导致所有用户在下次登录时需要重新阅读并同意隐私条款。\n\n此操作无法撤销！')) {
      return
    }

    if (!confirm('🔴 最后确认：您真的要清空所有隐私条款记录吗？\n\n这将影响所有用户的使用体验。')) {
      return
    }

    try {
      setClearing(true)
      setError('')
      setSuccess('')
      
      const response = await fetch('/api/admin/privacy-policy', {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(`✅ 清空成功！所有用户的隐私条款同意记录已清空。操作时间：${new Date(data.clearedAt).toLocaleString()}`)
        // 重新加载统计数据
        await loadStats()
      } else {
        setError(data.error || '清空操作失败')
      }
    } catch (error) {
      console.error('清空操作失败:', error)
      setError('网络错误，请重试')
    } finally {
      setClearing(false)
    }
  }

  // 格式化时间
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('zh-CN')
  }

  // 组件加载时获取数据
  useEffect(() => {
    loadStats()
  }, [])

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
              管理用户隐私条款同意记录，可强制所有用户重新阅读隐私条款
            </p>
          </div>
          <Button
            onClick={loadStats}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
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

        {/* 统计数据卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 总体统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                隐私条款同意统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">正在加载统计数据...</p>
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">
                      {stats.totalAgreements}
                    </div>
                    <p className="text-gray-600">用户已同意隐私条款</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    <Clock className="h-4 w-4 inline mr-1" />
                    统计时间：{formatTime(stats.queriedAt)}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  无法加载统计数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 操作面板 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                危险操作区域
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">清空所有隐私条款记录</h3>
                  <p className="text-sm text-red-700 mb-4">
                    此操作将清空所有用户的隐私条款同意记录，所有用户在下次登录时需要重新阅读并同意隐私条款。
                  </p>
                  <p className="text-xs text-red-600 mb-4">
                    ⚠️ 此操作无法撤销，请谨慎使用！
                  </p>
                  <Button
                    onClick={handleClearAll}
                    disabled={clearing || loading}
                    variant="destructive"
                    className="w-full"
                  >
                    {clearing ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        正在清空...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        清空所有隐私条款记录
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 最近同意记录 */}
        {stats && stats.recentAgreements && stats.recentAgreements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                最近同意记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.recentAgreements.map((record, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded"
                  >
                    <span className="text-sm font-mono text-gray-700">
                      用户哈希: {record.SNH.substring(0, 12)}...
                    </span>
                    <span className="text-sm text-gray-500">
                      已同意
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              功能说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  <strong>隐私条款同意统计：</strong> 显示当前已同意隐私条款的用户数量
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  <strong>清空所有记录：</strong> 清空所有用户的隐私条款同意状态，强制所有用户重新同意
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  <strong>最近同意记录：</strong> 显示最近10条用户同意隐私条款的记录
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mt-4">
                <p className="text-yellow-800">
                  <strong>⚠️ 注意：</strong> 清空隐私条款记录后，所有用户（包括已登录用户）在下次访问受保护页面时都需要重新阅读并同意隐私条款。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
