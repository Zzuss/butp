// Umami 分析 API 客户端
// 用于获取 butp.tech 网站的访问量统计数据

interface UmamiApiConfig {
  baseUrl: string
  username: string
  password: string
  websiteId: string
}

interface UmamiStats {
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
  }
}

// Umami 配置
const UMAMI_CONFIG: UmamiApiConfig = {
  baseUrl: 'https://umami-ruby-chi.vercel.app',
  username: process.env.NEXT_PUBLIC_UMAMI_USERNAME || '',
  password: process.env.NEXT_PUBLIC_UMAMI_PASSWORD || '', 
  websiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || ''
}

// 获取认证token
async function getAuthToken(): Promise<string | null> {
  try {
    const response = await fetch(`${UMAMI_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: UMAMI_CONFIG.username,
        password: UMAMI_CONFIG.password,
      }),
    })

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`)
    }

    const data = await response.json()
    return data.token
  } catch (error) {
    console.error('Umami authentication error:', error)
    return null
  }
}

// 获取指定时间范围的统计数据
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

    const response = await fetch(
      `${UMAMI_CONFIG.baseUrl}/api/websites/${UMAMI_CONFIG.websiteId}/stats?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to fetch website stats:', error)
    return null
  }
}

// 计算时间范围
function getDateRange(period: 'daily' | 'weekly' | 'monthly' | 'halfYear'): { start: Date; end: Date } {
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
  }

  return { start, end }
}

// 处理统计数据
function processStats(stats: UmamiStats): PeriodStats {
  const { pageviews, visitors, visits, bounces, totaltime } = stats
  
  return {
    period: 'daily', // Placeholder, will be updated by caller
    days: 1, // Placeholder, will be updated by caller
    pageviews: pageviews?.value || 0,
    visitors: visitors?.value || 0,
    visits: visits?.value || 0,
    bounces: bounces?.value || 0,
    totaltime: totaltime?.value || 0,
    bounceRate: visits?.value > 0 ? Math.round((bounces?.value || 0) / visits.value * 100) : 0,
    avgVisitDuration: visits?.value > 0 ? Math.round((totaltime?.value || 0) / visits.value / 1000) : 0, // 转换为秒
  }
}

// 获取访问统计数据
export async function getVisitorStats(): Promise<VisitorStats | null> {
  try {
    console.log('🔄 调用本地API获取Umami统计数据...')
    
    // 设置较短的超时时间，避免长时间等待
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8秒总超时
    
    try {
      // 调用我们的API路由获取数据
      const response = await fetch('/api/umami-stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch stats')
      }

      return result.data as VisitorStats
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    console.error('Error fetching visitor stats:', error)
    // 快速失败，不再重试
    return null
  }
}

// 工具函数
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}分钟`
  } else {
    return `${Math.round(seconds / 3600)}小时`
  }
}

export function getPeriodDisplayName(period: string): string {
  const names: Record<string, string> = {
    daily: '日访问量',
    weekly: '周访问量', 
    monthly: '月访问量',
    halfYearly: '半年访问量'
  }
  return names[period] || period
} 