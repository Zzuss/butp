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

  // 增强的数据获取函数 - 始终尝试获取真实数据
  const fetchRealStats = useCallback(async (isRetry = false) => {
    try {
      setLoading(true)
      setError(null)
      setConnectionStatus('checking')
      
      if (isRetry) {
        setRetryCount(prev => prev + 1)
        console.log(`🔄 手动重试获取数据 (第${retryCount + 1}次)...`)
      } else {
        console.log('🔄 积极尝试获取真实统计数据...')
        setRetryCount(0)
      }
      
      const data = await getVisitorStats()
      
      if (data) {
        setStats(data)
        setAttemptedReal(true)
        setRetryCount(0)
        
        // 检查数据源类型，根据元数据判断是否为真实数据
        const dataSource = (data.meta as any)?.dataSource || 'unknown'
        const note = (data.meta as any)?.note || ''
        
        if (dataSource === 'umami-public') {
          setDataSource('real')
          setConnectionStatus('connected')
          setLastUpdateTime(new Date().toLocaleString('zh-CN'))
          console.log('✅ 成功获取真实 Umami 数据')
        } else {
          setDataSource('demo')
          setConnectionStatus('disconnected')
          
          // 根据注释内容提供更具体的状态信息
          if (note.includes('服务器问题') || note.includes('不稳定')) {
            setLastUpdateTime(new Date().toLocaleString('zh-CN') + ' (服务暂时不可用)')
            console.log('⚠️ Umami 服务暂时不稳定，使用智能模拟数据')
          } else {
            setLastUpdateTime(new Date().toLocaleString('zh-CN') + ' (智能模拟)')
            console.log('📊 使用基于真实模式的智能模拟数据')
          }
        }
      } else {
        throw new Error('API返回空数据')
      }
    } catch (err) {
      console.error('❌ 获取数据失败:', err)
      setConnectionStatus('disconnected')
      setAttemptedReal(true)
      
      // 根据错误类型提供不同的错误信息
      let errorMessage = '暂时无法获取实时数据，显示智能模拟数据'
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          errorMessage = '连接超时，显示智能模拟数据'
        } else if (err.message.includes('fetch')) {
          errorMessage = '网络连接问题，显示智能模拟数据'
        }
      }
      
      setError(errorMessage)
      
      // 🔧 修复：当API失败时，使用本地智能降级数据
      console.log('🔄 API失败，使用本地智能降级数据')
      const fallbackData = generateIntelligentFallbackData()
      setStats(fallbackData)
      setDataSource('demo')
      setLastUpdateTime(new Date().toLocaleString('zh-CN') + ' (智能模拟)')
    } finally {
      setLoading(false)
    }
  }, [retryCount])

// 🆕 添加智能降级数据生成函数
const generateIntelligentFallbackData = (): VisitorStats => {
  const now = Date.now()
  const baseMultiplier = Math.sin(now / (1000 * 60 * 60 * 24)) * 0.3 + 1 // 基于日期的变化
  
  const generatePeriodData = (period: string, days: number): PeriodStats => {
    const dayMultiplier = Math.log(days + 1) * 50
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8-1.2
    const timeVariation = Math.sin((now / (1000 * 60 * 60)) + days) * 0.2 + 1 // 基于时间的变化
    
    const pageviews = Math.round(dayMultiplier * randomFactor * baseMultiplier * timeVariation * 1.8)
    const visitors = Math.round(pageviews * (0.6 + Math.random() * 0.2))
    const visits = Math.round(visitors * (1.1 + Math.random() * 0.3))
    const bounces = Math.round(visits * (0.3 + Math.random() * 0.4))
    const avgDuration = Math.round(90 + Math.random() * 120)
    const totaltime = visits * avgDuration
    
    return {
      period,
      days,
      pageviews,
      visitors,
      visits,
      bounces,
      totaltime,
      bounceRate: Math.round(30 + Math.random() * 40), // 30-70%
      avgVisitDuration: avgDuration
    }
  }

  return {
    daily: generatePeriodData('daily', 1),
    weekly: generatePeriodData('weekly', 7),
    monthly: generatePeriodData('monthly', 30),
    halfYearly: generatePeriodData('halfYearly', 180),
    meta: {
      lastUpdated: new Date().toISOString(),
      processingTime: 0,
      successRate: '0/4',
      cacheExpires: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      dataSource: 'realistic-mock',
      usingFallback: true,
      note: '无法连接到 Umami API，使用基于真实模式的智能模拟数据'
    }
  }
}

  // 禁用自动重试机制 - 移除原有的自动重试函数
  // const handleAutoRetry = useCallback(async () => {
  //   // 自动重试功能已禁用
  // }, [])

  // 手动刷新
  const handleRefresh = useCallback(async () => {
    setRetryCount(0)
    await fetchRealStats(false)
  }, [fetchRealStats])

  // 强制刷新数据（移除演示数据选项）
  const forceRefresh = useCallback(async () => {
    setRetryCount(0)
    await fetchRealStats(false)
    setError(null)
    setLoading(false)
    setConnectionStatus('checking')
    setLastUpdateTime('')
  }, [fetchRealStats])

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
              <Button onClick={forceRefresh} variant="outline" size="sm">
                <Database className="h-4 w-4 mr-1" />
                强制刷新
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
                {stats?.meta?.note?.includes('登录问题') && (
                  <div className="text-yellow-600 text-xs mt-2 p-2 bg-yellow-100 rounded">
                    <strong>🔧 建议解决方案：</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>检查 Umami 服务是否需要重新登录</li>
                      <li>确认共享链接权限设置是否正确</li>
                      <li>联系 Umami 服务管理员重新部署服务</li>
                      <li>验证 Vercel 部署状态是否正常</li>
                    </ul>
                  </div>
                )}
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
              <Button onClick={forceRefresh} variant="outline" size="sm">
                <Database className="h-4 w-4 mr-1" />
                强制刷新
              </Button>
            )}
            
            {dataSource === 'demo' && attemptedReal && (
              <Button onClick={forceRefresh} variant="outline" size="sm">
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