"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'

interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  proxy: string
  campusService?: {
    status: number
    data: any
  }
  error?: string
}

export function ProxyHealthCheck() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkHealth = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/pdf/health', {
        method: 'GET'
      })
      
      const data = await response.json() as HealthStatus
      setHealthStatus(data)
      setLastCheck(new Date())
      
      console.log('🏥 代理健康检查结果:', data)
    } catch (error) {
      console.error('❌ 健康检查失败:', error)
      setHealthStatus({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        proxy: 'butp-pdf-proxy',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 组件加载时自动检查一次
  useEffect(() => {
    checkHealth()
  }, [])

  const getStatusColor = () => {
    if (!healthStatus) return 'text-gray-500'
    return healthStatus.status === 'healthy' ? 'text-green-600' : 'text-red-600'
  }

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
    if (!healthStatus) return <Activity className="h-5 w-5 text-gray-500" />
    return healthStatus.status === 'healthy' ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> :
      <AlertTriangle className="h-5 w-5 text-red-500" />
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          PDF代理服务状态
        </CardTitle>
        <CardDescription>
          检查API代理到校内PDF服务的连接状态（类似CAS认证代理）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={checkHealth}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? '检查中...' : '刷新状态检查'}
        </Button>

        {healthStatus && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">代理状态:</span>
                <span className={`ml-2 ${getStatusColor()}`}>
                  {healthStatus.status === 'healthy' ? '✅ 正常' : '❌ 异常'}
                </span>
              </div>
              <div>
                <span className="font-medium">检查时间:</span>
                <span className="ml-2 text-muted-foreground">
                  {lastCheck?.toLocaleTimeString() || '未知'}
                </span>
              </div>
            </div>

            {healthStatus.campusService && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">校内服务状态:</h4>
                <div className="text-sm text-blue-800">
                  <div>HTTP状态码: <code>{healthStatus.campusService.status}</code></div>
                  {healthStatus.campusService.data && (
                    <div className="mt-2">
                      服务信息: <code className="bg-white px-1 rounded">
                        {JSON.stringify(healthStatus.campusService.data, null, 2)}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            )}

            {healthStatus.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">错误信息:</h4>
                <div className="text-sm text-red-800 break-all">
                  {healthStatus.error}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">代理架构优势:</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• <strong>无Mixed Content问题</strong> - 浏览器只与HTTPS API通信</li>
            <li>• <strong>与CAS认证一致</strong> - 使用相同的服务器端代理模式</li>
            <li>• <strong>统一的错误处理</strong> - API层统一处理校内服务异常</li>
            <li>• <strong>更好的安全性</strong> - 校内服务信息不暴露给浏览器</li>
          </ul>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div><strong>架构对比:</strong></div>
          <div>❌ 直连: <code>https://butp.tech → http://10.3.58.3</code> (Mixed Content)</div>
          <div>✅ 代理: <code>https://butp.tech → /api/campus-pdf → http://10.3.58.3</code></div>
        </div>
      </CardContent>
    </Card>
  )
}
