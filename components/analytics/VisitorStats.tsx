'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Database, TestTube, Wifi, WifiOff, Clock, TrendingUp } from 'lucide-react'
import { getVisitorStats } from '@/lib/umami-api'

interface PeriodStats {
  period: string
  days: number
  pageviews: number
  visitors: number
  visits: number
  bounces: number
  totaltime: number
  bounceRate: number
  avgVisitDuration: number
  error?: string
}

interface VisitorStats {
  daily: PeriodStats
  weekly: PeriodStats
  monthly: PeriodStats
  halfYearly: PeriodStats
  meta?: {
    lastUpdated: string
    processingTime: number
    successRate: string
    cacheExpires: string
    dataSource?: string // 新增：用于标识数据源
    usingFallback?: boolean // 新增：用于标识是否使用降级数据
    note?: string // 新增：用于提供额外的提示信息
  }
}

// 演示数据
const DEMO_DATA: VisitorStats = {
  daily: {
    period: 'daily',
    days: 1,
    pageviews: 45,
    visitors: 32,
    visits: 38,
    bounces: 12,
    totaltime: 4320,
    bounceRate: 31.6,
    avgVisitDuration: 113.7
  },
  weekly: {
    period: 'weekly',
    days: 7,
    pageviews: 312,
    visitors: 198,
    visits: 234,
    bounces: 89,
    totaltime: 28440,
    bounceRate: 38.0,
    avgVisitDuration: 121.5
  },
  monthly: {
    period: 'monthly',
    days: 30,
    pageviews: 1247,
    visitors: 756,
    visits: 892,
    bounces: 312,
    totaltime: 118720,
    bounceRate: 35.0,
    avgVisitDuration: 133.1
  },
  halfYearly: {
    period: 'halfYearly',
    days: 183,
    pageviews: 7832,
    visitors: 4231,
    visits: 5124,
    bounces: 1789,
    totaltime: 702840,
    bounceRate: 34.9,
    avgVisitDuration: 137.2
  },
  meta: {
    lastUpdated: new Date().toISOString(),
    processingTime: 0,
    successRate: '4/4',
    cacheExpires: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    dataSource: 'demo', // 默认演示数据
    usingFallback: false,
    note: '演示数据仅供参考'
  }
}

export default function VisitorStats() {
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'real' | 'demo'>('real')
  const [attemptedReal, setAttemptedReal] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')

  // 增强的数据获取函数
  const fetchRealStats = useCallback(async (isRetry = false) => {
    try {
      setLoading(true)
      setError(null)
      setConnectionStatus('checking')
      
      if (isRetry) {
        setRetryCount(prev => prev + 1)
        console.log(`🔄 手动重试获取数据 (第${retryCount + 1}次)...`)
      } else {
        console.log('🔄 尝试获取真实统计数据...')
        setRetryCount(0)
      }
      
      const data = await getVisitorStats()
      
      if (data) {
        setStats(data)
        setDataSource('real')
        setAttemptedReal(true)
        setConnectionStatus('connected')
        setLastUpdateTime(new Date().toLocaleString('zh-CN'))
        setRetryCount(0) // 成功后重置重试计数
        console.log('✅ 成功获取真实数据')
      } else {
        throw new Error('API返回空数据')
      }
    } catch (err) {
      console.error('❌ 获取真实数据失败:', err)
      setConnectionStatus('disconnected')
      
      // 根据错误类型提供不同的错误信息
      let errorMessage = '无法连接到Umami API'
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          errorMessage = '连接超时，请检查网络连接'
        } else if (err.message.includes('401')) {
          errorMessage = 'API认证失败，请检查配置'
        } else if (err.message.includes('500')) {
          errorMessage = '服务器内部错误'
        } else if (err.message.includes('failed')) {
          errorMessage = '网络连接失败'
        }
      }
      
      setError(errorMessage)
      
      // 只在第一次失败时自动切换到演示数据，不再自动重试
      if (!isRetry) {
        setStats(DEMO_DATA)
        setDataSource('demo')
        setLastUpdateTime(new Date().toLocaleString('zh-CN') + ' (演示数据)')
      }
      setAttemptedReal(true)
    } finally {
      setLoading(false)
    }
  }, [retryCount])

  // 禁用自动重试机制 - 移除原有的自动重试函数
  // const handleAutoRetry = useCallback(async () => {
  //   // 自动重试功能已禁用
  // }, [])

  // 手动刷新
  const handleRefresh = useCallback(async () => {
    setRetryCount(0)
    await fetchRealStats(false)
  }, [fetchRealStats])

  // 使用演示数据
  const useDemoData = useCallback(() => {
    setStats(DEMO_DATA)
    setDataSource('demo')
    setError(null)
    setLoading(false)
    setConnectionStatus('disconnected')
    setLastUpdateTime(new Date().toLocaleString('zh-CN') + ' (演示数据)')
  }, [])

  // 组件挂载时获取数据（只执行一次）
  useEffect(() => {
    fetchRealStats()
  }, []) // 移除依赖，只在挂载时执行一次

  // 移除自动重试效果
  // useEffect(() => {
  //   // 自动重试功能已禁用
  // }, [])

  // 渲染连接状态指示器
  const renderConnectionStatus = () => {
    const statusConfig = {
      checking: { icon: Clock, color: 'text-yellow-500', text: '检查中', bgColor: 'bg-yellow-50' },
      connected: { icon: Wifi, color: 'text-green-500', text: '已连接', bgColor: 'bg-green-50' },
      disconnected: { icon: WifiOff, color: 'text-red-500', text: '连接失败', bgColor: 'bg-red-50' }
    }
    
    const { icon: StatusIcon, color, text, bgColor } = statusConfig[connectionStatus]
    
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${bgColor}`}>
        <StatusIcon className={`h-3 w-3 ${color}`} />
        <span className={`text-xs ${color}`}>{text}</span>
      </div>
    )
  }

  // 加载状态
  if (loading && !stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              正在获取访问统计...
            </span>
            {renderConnectionStatus()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // 无数据状态
  if (!stats && !loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              访问统计不可用
            </span>
            {renderConnectionStatus()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">{error || '暂无统计数据'}</p>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleRefresh} disabled={loading} size="sm">
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                重试连接
              </Button>
              <Button onClick={useDemoData} variant="outline" size="sm">
                <Database className="h-4 w-4 mr-1" />
                查看演示数据
              </Button>
            </div>
            {retryCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>已重试 {retryCount} 次，点击"重试连接"继续尝试</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // 渲染统计数据
  return (
    <div className="space-y-4">
      {/* 警告提示和控制面板 */}
      {(dataSource === 'demo' || (stats?.meta?.usingFallback)) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-yellow-800 font-medium">
                  {stats?.meta?.dataSource === 'realistic-mock' ? '正在显示智能模拟数据' : 
                   stats?.meta?.dataSource === 'mixed' ? '显示混合数据（部分真实 + 模拟）' :
                   '正在显示演示数据'}
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  {stats?.meta?.note || error || '无法连接到Umami API，当前显示的是演示数据，仅供参考'}
                </p>
                {retryCount > 0 && (
                  <p className="text-yellow-600 text-xs mt-1">
                    系统已尝试重连 {retryCount} 次
                  </p>
                )}
                {stats?.meta?.dataSource === 'realistic-mock' && (
                  <p className="text-yellow-600 text-xs mt-1">
                    💡 智能模拟数据基于真实网站访问模式生成，包含时间和趋势因素
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 主要统计卡片 */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              BuTP 网站访问统计
            </span>
            <div className="flex items-center gap-2">
              {renderConnectionStatus()}
              <Badge variant={dataSource === 'real' ? 'default' : 'secondary'}>
                {dataSource === 'real' ? '实时数据' : '演示数据'}
              </Badge>
            </div>
          </CardTitle>
          {lastUpdateTime && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>最后更新: {lastUpdateTime}</span>
              {stats?.meta && (
                <span>处理时间: {stats.meta.processingTime}ms | 成功率: {stats.meta.successRate}</span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* 控制按钮 */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button 
              onClick={handleRefresh} 
              disabled={loading} 
              size="sm"
              variant={dataSource === 'real' ? 'default' : 'outline'}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              手动刷新
              {retryCount > 0 && ` (${retryCount})`}
            </Button>
            
            {dataSource === 'real' && (
              <Button onClick={useDemoData} variant="outline" size="sm">
                <Database className="h-4 w-4 mr-1" />
                切换到演示
              </Button>
            )}
            
            {dataSource === 'demo' && attemptedReal && (
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <TestTube className="h-4 w-4 mr-1" />
                尝试真实数据
              </Button>
            )}
            
            <div className="flex items-center text-xs text-gray-500 ml-2">
              💡 数据不会自动刷新，需要手动点击刷新按钮
            </div>
          </div>

          {/* 统计数据网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 日访问量 */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
                <span>日访问量</span>
                {stats?.daily.error && <AlertCircle className="h-3 w-3 text-red-500" />}
              </h3>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-900">{formatNumber(stats?.daily.pageviews || 0)}</p>
                <p className="text-xs text-blue-700">访客: {formatNumber(stats?.daily.visitors || 0)}</p>
                <p className="text-xs text-blue-700">访问: {formatNumber(stats?.daily.visits || 0)}</p>
                <p className="text-xs text-blue-600">跳出率: {(stats?.daily.bounceRate || 0).toFixed(1)}%</p>
              </div>
            </div>

            {/* 周访问量 */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <h3 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                <span>周访问量</span>
                {stats?.weekly.error && <AlertCircle className="h-3 w-3 text-red-500" />}
              </h3>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-900">{formatNumber(stats?.weekly.pageviews || 0)}</p>
                <p className="text-xs text-green-700">访客: {formatNumber(stats?.weekly.visitors || 0)}</p>
                <p className="text-xs text-green-700">访问: {formatNumber(stats?.weekly.visits || 0)}</p>
                <p className="text-xs text-green-600">跳出率: {(stats?.weekly.bounceRate || 0).toFixed(1)}%</p>
              </div>
            </div>

            {/* 月访问量 */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <h3 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-1">
                <span>月访问量</span>
                {stats?.monthly.error && <AlertCircle className="h-3 w-3 text-red-500" />}
              </h3>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-purple-900">{formatNumber(stats?.monthly.pageviews || 0)}</p>
                <p className="text-xs text-purple-700">访客: {formatNumber(stats?.monthly.visitors || 0)}</p>
                <p className="text-xs text-purple-700">访问: {formatNumber(stats?.monthly.visits || 0)}</p>
                <p className="text-xs text-purple-600">跳出率: {(stats?.monthly.bounceRate || 0).toFixed(1)}%</p>
              </div>
            </div>

            {/* 半年访问量 */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
              <h3 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-1">
                <span>半年访问量</span>
                {stats?.halfYearly.error && <AlertCircle className="h-3 w-3 text-red-500" />}
              </h3>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-orange-900">{formatNumber(stats?.halfYearly.pageviews || 0)}</p>
                <p className="text-xs text-orange-700">访客: {formatNumber(stats?.halfYearly.visitors || 0)}</p>
                <p className="text-xs text-orange-700">访问: {formatNumber(stats?.halfYearly.visits || 0)}</p>
                <p className="text-xs text-orange-600">跳出率: {(stats?.halfYearly.bounceRate || 0).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* 补充统计信息 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-gray-600">平均跳出率</p>
              <p className="text-lg font-semibold">{((stats?.monthly.bounceRate || 0)).toFixed(1)}%</p>
              <p className="text-xs text-gray-500">基于月度数据</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">平均访问时长</p>
              <p className="text-lg font-semibold">{formatDuration(stats?.monthly.avgVisitDuration || 0)}</p>
              <p className="text-xs text-gray-500">基于月度数据</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">数据状态</p>
              <div className="flex items-center justify-center gap-1">
                <Badge variant={dataSource === 'real' ? 'default' : 'secondary'}>
                  {dataSource === 'real' ? 'Umami Analytics' : '演示数据'}
                </Badge>
              </div>
              {connectionStatus === 'connected' && (
                <p className="text-xs text-green-600 mt-1">连接正常</p>
              )}
              {connectionStatus === 'disconnected' && retryCount > 0 && (
                <p className="text-xs text-red-600 mt-1">重试 {retryCount}/3</p>
              )}
            </div>
          </div>

          {/* 调试信息（仅在开发环境显示） */}
          {process.env.NODE_ENV === 'development' && stats?.meta && (
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-gray-500">调试信息</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify({
                  meta: stats.meta,
                  connectionStatus,
                  retryCount,
                  dataSource
                }, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 工具函数
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}分钟`
  } else {
    return `${Math.round(seconds / 3600)}小时`
  }
} 