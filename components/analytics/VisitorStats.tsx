"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  Users, 
  Eye, 
  Clock, 
  TrendingUp,
  Loader2,
  AlertCircle,
  RefreshCw,
  Database,
  TestTube
} from "lucide-react"
import { 
  getVisitorStats, 
  formatNumber, 
  formatDuration, 
  getPeriodDisplayName 
} from '@/lib/umami-api'

interface UmamiMetrics {
  pageviews: number
  visitors: number
  visits: number
  bounceRate: number
  avgVisitDuration: number
}

interface VisitorStats {
  daily: UmamiMetrics
  weekly: UmamiMetrics
  monthly: UmamiMetrics
  halfYear: UmamiMetrics
}

// 示例数据
const DEMO_DATA: VisitorStats = {
  daily: { pageviews: 156, visitors: 89, visits: 98, bounceRate: 42, avgVisitDuration: 145 },
  weekly: { pageviews: 892, visitors: 456, visits: 523, bounceRate: 38, avgVisitDuration: 168 },
  monthly: { pageviews: 3456, visitors: 1789, visits: 2134, bounceRate: 35, avgVisitDuration: 192 },
  halfYear: { pageviews: 18943, visitors: 8765, visits: 10234, bounceRate: 33, avgVisitDuration: 215 }
}

export default function VisitorStats() {
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'real' | 'demo'>('real')
  const [attemptedReal, setAttemptedReal] = useState(false)

  const fetchRealStats = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 尝试获取真实统计数据...')
      
      const data = await getVisitorStats()
      
      if (data) {
        setStats(data)
        setDataSource('real')
        setAttemptedReal(true)
        console.log('✅ 成功获取真实数据')
      } else {
        throw new Error('API返回空数据')
      }
    } catch (err) {
      console.error('❌ 获取真实数据失败:', err)
      setError('无法连接到Umami API')
      setStats(DEMO_DATA)
      setDataSource('demo')
      setAttemptedReal(true)
    } finally {
      setLoading(false)
    }
  }

  const useDemoData = () => {
    setStats(DEMO_DATA)
    setDataSource('demo')
    setError(null)
    setLoading(false)
  }

  useEffect(() => {
    fetchRealStats()
  }, [])

  if (loading) {
    return (
      <Card className="border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            网站访问统计
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-blue-600">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>正在加载访问统计数据...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card className="border-red-200">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6" />
            访问统计
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="h-6 w-6" />
              <span>无法加载统计数据</span>
            </div>
            <div className="flex gap-3">
              <Button onClick={fetchRealStats} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                重试
              </Button>
              <Button onClick={useDemoData} variant="outline" size="sm">
                <TestTube className="h-4 w-4 mr-2" />
                使用示例数据
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const periods = [
    { key: 'daily' as keyof VisitorStats, color: 'from-green-500 to-green-600' },
    { key: 'weekly' as keyof VisitorStats, color: 'from-blue-500 to-blue-600' },
    { key: 'monthly' as keyof VisitorStats, color: 'from-purple-500 to-purple-600' },
    { key: 'halfYear' as keyof VisitorStats, color: 'from-orange-500 to-orange-600' }
  ]

  return (
    <div className="space-y-6">
      {/* 标题和控制面板 */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-blue-900 mb-2">网站访问统计</h2>
        <p className="text-blue-600">基于 Umami 分析的 butp.tech 访问数据</p>
        
        {/* 数据源指示器和控制 */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <Badge 
            variant={dataSource === 'real' ? 'default' : 'secondary'} 
            className={`flex items-center gap-2 ${
              dataSource === 'real' ? 'bg-green-100 text-green-800 border-green-300' : ''
            }`}
          >
            <Database className="h-3 w-3" />
            {dataSource === 'real' ? '实时数据' : '示例数据'}
          </Badge>
          
          {attemptedReal && (
            <div className="flex gap-2">
              <Button 
                onClick={fetchRealStats} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </Button>
              
              {dataSource === 'real' && (
                <Button 
                  onClick={useDemoData} 
                  variant="outline" 
                  size="sm"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  切换到示例
                </Button>
              )}
              
              {dataSource === 'demo' && (
                <Button 
                  onClick={fetchRealStats} 
                  variant="outline" 
                  size="sm"
                  disabled={loading}
                >
                  <Database className="h-4 w-4 mr-2" />
                  尝试真实数据
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 状态提示 */}
      {error && dataSource === 'demo' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              <div className="flex-1">
                <span className="text-sm font-medium">当前显示示例数据</span>
                <p className="text-xs mt-1">
                  {error} - 这可能是由于网络连接、防火墙设置或Umami服务器暂时不可用导致的
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {dataSource === 'real' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-green-800">
              <Database className="h-5 w-5" />
              <span className="text-sm">正在显示来自Umami的实时统计数据</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 统计卡片网格 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {periods.map(({ key, color }) => {
          const data = stats[key]
          const displayName = getPeriodDisplayName(key)
          
          return (
            <Card key={key} className="border-blue-200 hover:shadow-lg transition-shadow duration-300">
              <CardHeader className={`bg-gradient-to-r ${color} text-white pb-3`}>
                <CardTitle className="text-lg font-medium">{displayName}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* 页面浏览量 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-600">浏览量</span>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {formatNumber(data.pageviews)}
                    </Badge>
                  </div>

                  {/* 访客数 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-600">访客数</span>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {formatNumber(data.visitors)}
                    </Badge>
                  </div>

                  {/* 访问次数 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-gray-600">访问次数</span>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {formatNumber(data.visits)}
                    </Badge>
                  </div>

                  {/* 平均访问时长 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-gray-600">平均时长</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {formatDuration(data.avgVisitDuration)}
                    </Badge>
                  </div>

                  {/* 跳出率 */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">跳出率</span>
                    <span className="text-xs font-mono text-gray-600">
                      {data.bounceRate}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 数据说明 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-sm text-blue-700">
              数据更新时间：{new Date().toLocaleString('zh-CN')} | 
              数据来源：
              {dataSource === 'real' ? (
                <a 
                  href="https://umami-ruby-chi.vercel.app/dashboard" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline ml-1"
                >
                  Umami Analytics
                </a>
              ) : (
                <span className="ml-1 text-blue-600">示例数据（用于演示）</span>
              )}
            </p>
            {dataSource === 'demo' && (
              <p className="text-xs text-blue-600 mt-2">
                💡 配置正确的Umami API凭据后可查看真实数据 | 
                <a href="/test-umami" className="underline hover:text-blue-800">
                  运行配置测试
                </a>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 