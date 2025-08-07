import { NextRequest, NextResponse } from 'next/server'

// Umami API 配置
const UMAMI_CONFIG = {
  baseUrl: process.env.UMAMI_BASE_URL || 'https://umami-ruby-chi.vercel.app',
  username: process.env.UMAMI_USERNAME || '',
  password: process.env.UMAMI_PASSWORD || '',
  websiteId: process.env.UMAMI_WEBSITE_ID || ''
}

interface UmamiStats {
  pageviews: { value: number }
  visitors: { value: number }
  visits: { value: number }
  bounces: { value: number }
  totaltime: { value: number }
}

// 创建带超时的fetch函数
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 10000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    throw error
  }
}

// 获取认证token
async function getAuthToken(): Promise<string | null> {
  try {
    console.log('🔑 正在认证Umami API...')
    
    // 检查配置
    if (!UMAMI_CONFIG.username || !UMAMI_CONFIG.password) {
      console.error('❌ Umami用户名或密码未配置')
      return null
    }

    const response = await fetchWithTimeout(
      `${UMAMI_CONFIG.baseUrl}/api/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: UMAMI_CONFIG.username,
          password: UMAMI_CONFIG.password,
        }),
      },
      8000 // 8秒超时
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`❌ Umami认证失败: ${response.status} - ${errorText}`)
      return null
    }

    const data = await response.json()
    console.log('✅ Umami认证成功')
    return data.token
  } catch (error) {
    console.error('❌ Umami认证错误:', error)
    return null
  }
}

// 获取网站统计数据
async function getWebsiteStats(
  startDate: Date, 
  endDate: Date, 
  token: string
): Promise<UmamiStats | null> {
  try {
    const params = new URLSearchParams({
      startAt: startDate.getTime().toString(),
      endAt: endDate.getTime().toString(),
    })

    const response = await fetchWithTimeout(
      `${UMAMI_CONFIG.baseUrl}/api/websites/${UMAMI_CONFIG.websiteId}/stats?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      8000 // 8秒超时
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`❌ 获取统计数据失败: ${response.status} - ${errorText}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('❌ 获取网站统计失败:', error)
    return null
  }
}

// 计算时间范围
function getDateRange(period: string): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()

  switch (period) {
    case 'daily':
      start.setDate(end.getDate() - 1)
      break
    case 'weekly':
      start.setDate(end.getDate() - 7)
      break
    case 'monthly':
      start.setDate(end.getDate() - 30)
      break
    case 'halfYear':
      start.setDate(end.getDate() - 180)
      break
    default:
      start.setDate(end.getDate() - 7) // 默认一周
  }

  return { start, end }
}

// 处理统计数据
function processStats(stats: UmamiStats) {
  const { pageviews, visitors, visits, bounces, totaltime } = stats
  
  return {
    pageviews: pageviews?.value || 0,
    visitors: visitors?.value || 0,
    visits: visits?.value || 0,
    bounceRate: visits?.value > 0 ? Math.round((bounces?.value || 0) / visits.value * 100) : 0,
    avgVisitDuration: visits?.value > 0 ? Math.round((totaltime?.value || 0) / visits.value / 1000) : 0,
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 开始获取Umami统计数据...')
    
    // 检查环境变量配置
    if (!UMAMI_CONFIG.username || !UMAMI_CONFIG.password || !UMAMI_CONFIG.websiteId) {
      console.error('❌ Umami配置缺失:', {
        hasUsername: !!UMAMI_CONFIG.username,
        hasPassword: !!UMAMI_CONFIG.password,
        hasWebsiteId: !!UMAMI_CONFIG.websiteId,
        baseUrl: UMAMI_CONFIG.baseUrl
      })
      
      return NextResponse.json(
        { 
          error: 'Umami configuration missing',
          details: 'Please check UMAMI_USERNAME, UMAMI_PASSWORD, and UMAMI_WEBSITE_ID environment variables'
        },
        { status: 500 }
      )
    }

    // 获取认证token
    const token = await getAuthToken()
    if (!token) {
      return NextResponse.json(
        { 
          error: 'Failed to authenticate with Umami',
          details: 'Please check your Umami username and password'
        },
        { status: 401 }
      )
    }

    // 获取各个时间段的数据
    console.log('📈 获取统计数据...')
    const periods = ['daily', 'weekly', 'monthly', 'halfYear']
    const results = []
    
    // 串行获取数据，避免并发请求过多
    for (const period of periods) {
      const { start, end } = getDateRange(period)
      console.log(`📅 获取${period}数据: ${start.toISOString()} - ${end.toISOString()}`)
      
      const stats = await getWebsiteStats(start, end, token)
      results.push({ period, stats })
      
      // 添加小延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // 处理结果
    const visitorStats: Record<string, any> = {}
    
    for (const { period, stats } of results) {
      if (stats) {
        visitorStats[period] = processStats(stats)
        console.log(`✅ ${period}数据获取成功:`, visitorStats[period])
      } else {
        // 如果获取失败，返回默认值
        visitorStats[period] = {
          pageviews: 0,
          visitors: 0,
          visits: 0,
          bounceRate: 0,
          avgVisitDuration: 0,
        }
        console.log(`⚠️ ${period}数据获取失败，使用默认值`)
      }
    }

    console.log('✅ 所有统计数据获取完成')

    // 设置缓存头（5分钟缓存）
    const response = NextResponse.json({ 
      success: true, 
      data: visitorStats,
      timestamp: new Date().toISOString()
    })
    
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    
    return response
    
  } catch (error) {
    console.error('❌ Umami统计API错误:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 