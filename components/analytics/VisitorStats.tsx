'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
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
    dataSource?: string
    usingFallback?: boolean
    note?: string
  }
}

export default function VisitorStats() {
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [loading, setLoading] = useState(true)

  // 获取真实数据
  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await getVisitorStats()
      if (data) {
        setStats(data)
      }
    } catch (error) {
      console.error('获取访问统计失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    fetchStats()
  }, [])

  // 加载状态
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            BuTP 网站访问统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-50 p-4 rounded-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // 无数据状态
  if (!stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            BuTP 网站访问统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-8">暂无访问统计数据</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          BuTP 网站访问统计
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 统计数据网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 日访问量 */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="text-sm font-medium text-blue-800 mb-2">日访问量</h3>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.daily.pageviews)}</p>
              <p className="text-xs text-blue-700">访客: {formatNumber(stats.daily.visitors)}</p>
              <p className="text-xs text-blue-700">访问: {formatNumber(stats.daily.visits)}</p>
              <p className="text-xs text-blue-600">跳出率: {stats.daily.bounceRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* 周访问量 */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h3 className="text-sm font-medium text-green-800 mb-2">周访问量</h3>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-900">{formatNumber(stats.weekly.pageviews)}</p>
              <p className="text-xs text-green-700">访客: {formatNumber(stats.weekly.visitors)}</p>
              <p className="text-xs text-green-700">访问: {formatNumber(stats.weekly.visits)}</p>
              <p className="text-xs text-green-600">跳出率: {stats.weekly.bounceRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* 月访问量 */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
            <h3 className="text-sm font-medium text-purple-800 mb-2">月访问量</h3>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-purple-900">{formatNumber(stats.monthly.pageviews)}</p>
              <p className="text-xs text-purple-700">访客: {formatNumber(stats.monthly.visitors)}</p>
              <p className="text-xs text-purple-700">访问: {formatNumber(stats.monthly.visits)}</p>
              <p className="text-xs text-purple-600">跳出率: {stats.monthly.bounceRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* 半年访问量 */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
            <h3 className="text-sm font-medium text-orange-800 mb-2">半年访问量</h3>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-orange-900">{formatNumber(stats.halfYearly.pageviews)}</p>
              <p className="text-xs text-orange-700">访客: {formatNumber(stats.halfYearly.visitors)}</p>
              <p className="text-xs text-orange-700">访问: {formatNumber(stats.halfYearly.visits)}</p>
              <p className="text-xs text-orange-600">跳出率: {stats.halfYearly.bounceRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* 补充统计信息 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-gray-600">平均跳出率</p>
            <p className="text-lg font-semibold">{stats.monthly.bounceRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">基于月度数据</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">平均访问时长</p>
            <p className="text-lg font-semibold">{formatDuration(stats.monthly.avgVisitDuration)}</p>
            <p className="text-xs text-gray-500">基于月度数据</p>
          </div>
        </div>
      </CardContent>
    </Card>
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