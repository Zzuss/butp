import { NextRequest, NextResponse } from 'next/server'

// 使用新的 Umami 服务
const UMAMI_BASE_URL = 'https://umami-teal-omega.vercel.app'
const UMAMI_WEBSITE_ID = 'ec362d7d-1d62-46c2-8338-6e7c0df7c084'

interface UmamiApiResponse {
  pageviews: { value: number }
  visitors: { value: number }
  visits: { value: number }
  bounces: { value: number }
  totaltime: { value: number }
}

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
    dataSource?: string
    usingFallback?: boolean
    note?: string
  }
}

interface TimeRange {
  name: string
  days: number
  displayName: string
}

// 时间范围配置
const TIME_RANGES: TimeRange[] = [
  { name: 'daily', days: 1, displayName: '日访问量' },
  { name: 'weekly', days: 7, displayName: '周访问量' },
  { name: 'monthly', days: 30, displayName: '月访问量' },
  { name: 'halfYearly', days: 180, displayName: '半年访问量' }
]

class UmamiStatsService {
  private timeout = 10000 // 10秒超时
  private maxRetries = 3

  constructor() {}

  // 主要获取方法
  async getStats(): Promise<{ success: boolean; data?: VisitorStats; error?: string; timestamp: string }> {
    try {
      console.log('🔄 开始获取 Umami 统计数据...')
      
      const results: Record<string, PeriodStats> = {}
      let successCount = 0
      let totalRequests = TIME_RANGES.length
      let usingFallback = false
      
      // 并行获取所有时间段的数据
      const promises = TIME_RANGES.map(async (range) => {
        const stats = await this.getStatsForPeriod(range.name, range.days)
        if (stats && !stats.error) {
          results[range.name] = stats
          successCount++
        } else {
          // 如果无法获取真实数据，使用示例数据
          results[range.name] = this.generateExampleData(range.name, range.days)
          usingFallback = true
        }
      })

      await Promise.all(promises)

      console.log(`✅ 统计数据获取完成 (${successCount}/${totalRequests} 成功)`)
      
      const visitorStats: VisitorStats = {
        daily: results.daily,
        weekly: results.weekly,
        monthly: results.monthly,
        halfYearly: results.halfYearly,
        meta: {
          lastUpdated: new Date().toISOString(),
          processingTime: Date.now() - Date.now(), // 简化处理时间计算
          successRate: `${successCount}/${totalRequests}`,
          cacheExpires: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          dataSource: successCount === totalRequests ? 'umami-public' : 
                     successCount > 0 ? 'mixed' : 'realistic-mock',
          usingFallback,
          note: usingFallback ? 
            (successCount > 0 ? '部分数据来自真实 Umami API，部分使用智能模拟' : 
             '无法连接到 Umami API，使用基于真实模式的智能模拟数据') :
            '来自 Umami Analytics 的真实数据'
        }
      }
      
      return {
        success: true,
        data: visitorStats,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      console.error('❌ 获取统计数据失败:', error)
      
      // 返回示例数据作为后备
      const exampleData: VisitorStats = {
        daily: this.generateExampleData('daily', 1),
        weekly: this.generateExampleData('weekly', 7),
        monthly: this.generateExampleData('monthly', 30),
        halfYearly: this.generateExampleData('halfYearly', 180),
        meta: {
          lastUpdated: new Date().toISOString(),
          processingTime: 0,
          successRate: '0/4',
          cacheExpires: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          dataSource: 'realistic-mock',
          usingFallback: true,
          note: `服务器错误，使用智能模拟数据: ${error}`
        }
      }

      return {
        success: false,
        data: exampleData,
        error: `无法连接到 Umami API: ${error}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  // 获取指定时间段的统计数据
  private async getStatsForPeriod(period: string, days: number): Promise<PeriodStats | null> {
    const endAt = Date.now()
    const startAt = endAt - (days * 24 * 60 * 60 * 1000)

    try {
      // 尝试通过 API 获取数据
      const apiUrl = `${UMAMI_BASE_URL}/api/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BuTP-Analytics/1.0'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data: UmamiApiResponse = await response.json()
        return this.processUmamiData(period, days, data)
      }

      console.warn(`API 请求失败 (${days}天): ${response.status}`)
      return null

    } catch (error) {
      console.warn(`获取 ${days} 天数据失败:`, error)
      return null
    }
  }

  // 处理 Umami API 返回的数据
  private processUmamiData(period: string, days: number, data: UmamiApiResponse): PeriodStats {
    const pageviews = data?.pageviews?.value || 0
    const visitors = data?.visitors?.value || 0
    const visits = data?.visits?.value || 0
    const bounces = data?.bounces?.value || 0
    const totaltime = data?.totaltime?.value || 0

    return {
      period,
      days,
      pageviews,
      visitors,
      visits,
      bounces,
      totaltime,
      bounceRate: visits > 0 ? Math.round((bounces / visits) * 100) : 0,
      avgVisitDuration: visits > 0 ? Math.round(totaltime / visits) : 0
    }
  }

  // 生成示例数据
  private generateExampleData(period: string, days: number): PeriodStats {
    const baseMultiplier = Math.log(days + 1) * 50
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8-1.2
    
    const pageviews = Math.round(baseMultiplier * randomFactor * 1.8)
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
}

// API 端点处理
export async function GET(request: NextRequest) {
  try {
    console.log('📊 收到统计数据请求')
    
    const service = new UmamiStatsService()
    const result = await service.getStats()

    // 设置缓存头
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', // 5分钟缓存
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    })

    if (result.success) {
      console.log('✅ 成功返回统计数据')
      return new NextResponse(JSON.stringify(result), { 
        status: 200, 
        headers 
      })
    } else {
      console.log('⚠️ 返回备用数据')
      return new NextResponse(JSON.stringify(result), { 
        status: 200, // 仍然返回200，但数据中包含错误信息
        headers 
      })
    }

  } catch (error) {
    console.error('❌ API 处理失败:', error)
    
    // 返回错误响应和示例数据
    const service = new UmamiStatsService()
    const errorResponse = {
      success: false,
      error: `服务器内部错误: ${error}`,
      data: {
        daily: service['generateExampleData']('daily', 1),
        weekly: service['generateExampleData']('weekly', 7),
        monthly: service['generateExampleData']('monthly', 30),
        halfYearly: service['generateExampleData']('halfYearly', 180),
        meta: {
          lastUpdated: new Date().toISOString(),
          processingTime: 0,
          successRate: '0/4',
          cacheExpires: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          dataSource: 'realistic-mock',
          usingFallback: true,
          note: `服务器内部错误，使用智能模拟数据`
        }
      } as VisitorStats,
      timestamp: new Date().toISOString()
    }

    return new NextResponse(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
} 