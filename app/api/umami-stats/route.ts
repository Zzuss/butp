import { NextRequest, NextResponse } from 'next/server'

// 使用新的 MySQL 版本 Umami
const UMAMI_BASE_URL = 'https://umami-mysql-mauve.vercel.app'
const UMAMI_WEBSITE_ID = '4bd87e19-b721-41e5-9de5-0c694e046425'
const UMAMI_SHARE_URL = 'https://umami-mysql-mauve.vercel.app' // 暂时不使用分享链接，直接API认证

// 添加认证配置
const UMAMI_USERNAME = 'admin'
const UMAMI_PASSWORD = 'umami'

// 使用标准认证API
const UMAMI_API_ENDPOINTS = [
  `/api/websites/${UMAMI_WEBSITE_ID}/stats`, // 标准认证API
]

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
  private timeout = 15000 // 15秒超时
  private maxRetries = 3
  private authToken: string | null = null

  constructor() {}

  // 获取认证token
  private async getAuthToken(): Promise<string | null> {
    if (this.authToken) {
      return this.authToken
    }

    try {
      console.log('🔑 正在获取 Umami 认证 token...')
      
      const response = await fetch(`${UMAMI_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: UMAMI_USERNAME,
          password: UMAMI_PASSWORD,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        this.authToken = data.token
        console.log('✅ 成功获取认证 token')
        return this.authToken
      } else {
        console.error('❌ 认证失败:', response.status, response.statusText)
        return null
      }
    } catch (error) {
      console.error('❌ 获取认证 token 失败:', error)
      return null
    }
  }

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

    // 获取认证token
    const token = await this.getAuthToken()
    if (!token) {
      console.error('❌ 无法获取认证token，跳过真实数据获取')
      return null
    }

    // 尝试多个API端点
    for (let i = 0; i < UMAMI_API_ENDPOINTS.length; i++) {
      const endpoint = UMAMI_API_ENDPOINTS[i]
      
      try {
        const apiUrl = `${UMAMI_BASE_URL}${endpoint}?startAt=${startAt}&endAt=${endAt}`
        
        console.log(`🌐 尝试 Umami API 端点 ${i + 1}/${UMAMI_API_ENDPOINTS.length} (${period}): ${apiUrl}`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'BuTP-Analytics/1.0',
            'Cache-Control': 'no-cache'
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        console.log(`📊 Umami API响应 (${period}, 端点${i + 1}): ${response.status} ${response.statusText}`)

        if (response.ok) {
          const data: UmamiApiResponse = await response.json()
          console.log(`✅ 成功获取 ${period} 数据 (端点${i + 1}):`, data)
          return this.processUmamiData(period, days, data)
        } else {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.warn(`❌ API 端点${i + 1}请求失败 (${period}): ${response.status} - ${errorText}`)
          
          // 如果是401错误且还有其他端点可尝试，继续下一个
          if (response.status === 401 && i < UMAMI_API_ENDPOINTS.length - 1) {
            console.log(`🔄 端点${i + 1}认证失败，尝试下一个端点...`)
            continue
          }
          
          // 最后一个端点也失败了，记录详细错误
          if (i === UMAMI_API_ENDPOINTS.length - 1) {
            console.error('🔐 所有 Umami API端点都失败 - 可能原因:')
            console.error('   1. Umami服务器访问限制')
            console.error('   2. 网站ID或分享ID不正确')
            console.error('   3. 网络连接问题')
            console.error(`   当前配置: ${UMAMI_BASE_URL}`)
            console.error(`   网站ID: ${UMAMI_WEBSITE_ID}`)
            console.error(`   分享URL: ${UMAMI_SHARE_URL}`)
          }
        }

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`⏰ 端点${i + 1}获取 ${period} 数据超时 (${this.timeout}ms)`)
        } else {
          console.warn(`💥 端点${i + 1}获取 ${period} 数据异常:`, error)
        }
        
        // 如果还有其他端点可尝试，继续
        if (i < UMAMI_API_ENDPOINTS.length - 1) {
          console.log(`🔄 端点${i + 1}失败，尝试下一个端点...`)
          continue
        }
      }
    }
    
    console.warn(`🚫 所有 ${UMAMI_API_ENDPOINTS.length} 个API端点都失败 (${period})，使用模拟数据`)
    return null
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