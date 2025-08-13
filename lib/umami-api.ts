// Umami 分析 API 客户端
// 支持Supabase版本和MySQL版本的Umami Analytics
// 自动检测可用的服务并切换

interface UmamiApiConfig {
  baseUrl: string
  username: string
  password: string
  websiteId: string
  version: 'supabase' | 'mysql'
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
    dataSource?: string
    usingFallback?: boolean
    note?: string
    activeConfig?: string
  }
}

// 多个Umami配置 - 优先级从高到低
const UMAMI_CONFIGS: UmamiApiConfig[] = [
  // MySQL版本 (优先使用，更稳定)
  {
    baseUrl: process.env.NEXT_PUBLIC_UMAMI_MYSQL_BASE_URL || 'https://umami-mysql-mauve.vercel.app',
    username: process.env.NEXT_PUBLIC_UMAMI_MYSQL_USERNAME || 'admin',
    password: process.env.NEXT_PUBLIC_UMAMI_MYSQL_PASSWORD || 'umami',
    websiteId: process.env.NEXT_PUBLIC_UMAMI_MYSQL_WEBSITE_ID || '4bd87e19-b721-41e5-9de5-0c694e046425',
    version: 'mysql' as const
  },
  // Supabase版本 (备用，不稳定)
  {
    baseUrl: process.env.NEXT_PUBLIC_UMAMI_BASE_URL || 'https://umami-mysql-mauve.vercel.app',
    username: process.env.NEXT_PUBLIC_UMAMI_USERNAME || '',
    password: process.env.NEXT_PUBLIC_UMAMI_PASSWORD || '',
    websiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || '',
    version: 'supabase' as const
  }
].filter(config => config.baseUrl && config.websiteId); // 只保留有效配置

// 当前活跃的配置
let activeConfig: UmamiApiConfig | null = null;

// 获取认证token
async function getAuthToken(config: UmamiApiConfig): Promise<string | null> {
  try {
    console.log(`🔑 尝试认证 ${config.version} 版本 Umami (${config.baseUrl})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
    
    const response = await fetch(`${config.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: config.username,
        password: config.password,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ ${config.version} 版本认证成功`);
    activeConfig = config; // 记录成功的配置
    return data.token;
  } catch (error) {
    console.error(`❌ ${config.version} 版本认证失败:`, error);
    return null;
  }
}

// 智能选择可用的Umami配置
async function getAvailableConfig(): Promise<{ config: UmamiApiConfig; token: string } | null> {
  for (const config of UMAMI_CONFIGS) {
    const token = await getAuthToken(config);
    if (token) {
      console.log(`🎯 使用 ${config.version} 版本的Umami服务`);
      return { config, token };
    }
  }
  
  console.log('❌ 所有Umami服务都不可用');
  return null;
}

// 获取指定时间范围的统计数据
async function getWebsiteStats(
  startDate: Date, 
  endDate: Date, 
  config: UmamiApiConfig,
  token: string
): Promise<UmamiStats | null> {
  try {
    const params = new URLSearchParams({
      startAt: startDate.getTime().toString(),
      endAt: endDate.getTime().toString(),
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

    const response = await fetch(
      `${config.baseUrl}/api/websites/${config.websiteId}/stats?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📊 成功获取 ${config.version} 版本统计数据`);
    return data;
  } catch (error) {
    console.error(`💥 ${config.version} 版本获取数据失败:`, error);
    return null;
  }
}

// 计算时间范围
function getDateRange(period: 'daily' | 'weekly' | 'monthly' | 'halfYear'): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case 'daily':
      start.setDate(end.getDate() - 1);
      break;
    case 'weekly':
      start.setDate(end.getDate() - 7);
      break;
    case 'monthly':
      start.setDate(end.getDate() - 30);
      break;
    case 'halfYear':
      start.setDate(end.getDate() - 180);
      break;
  }

  return { start, end };
}

// 处理统计数据
function processStats(stats: UmamiStats, period: string, days: number): PeriodStats {
  const { pageviews, visitors, visits, bounces, totaltime } = stats;
  
  return {
    period,
    days,
    pageviews: pageviews?.value || 0,
    visitors: visitors?.value || 0,
    visits: visits?.value || 0,
    bounces: bounces?.value || 0,
    totaltime: totaltime?.value || 0,
    bounceRate: visits?.value > 0 ? Math.round((bounces?.value || 0) / visits.value * 100) : 0,
    avgVisitDuration: visits?.value > 0 ? Math.round((totaltime?.value || 0) / visits.value / 1000) : 0,
  };
}

// 生成示例数据 (当所有服务都不可用时)
function generateExampleData(period: string, days: number): PeriodStats {
  const baseMultiplier = Math.log(days + 1) * 50;
  const randomFactor = 0.8 + Math.random() * 0.4; // 0.8-1.2
  
  const pageviews = Math.round(baseMultiplier * randomFactor * 1.8);
  const visitors = Math.round(pageviews * (0.6 + Math.random() * 0.2));
  const visits = Math.round(visitors * (1.1 + Math.random() * 0.3));
  const bounces = Math.round(visits * (0.3 + Math.random() * 0.4));
  const avgDuration = Math.round(90 + Math.random() * 120);
  const totaltime = visits * avgDuration;
  
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
  };
}

// 获取访问统计数据 (主要API)
export async function getVisitorStats(): Promise<VisitorStats | null> {
  const startTime = Date.now();
  
  try {
    console.log('🔄 调用本地API获取Umami统计数据...');
    
    // 设置较短的超时时间，避免长时间等待
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒总超时
    
    try {
      // 调用我们的API路由获取数据
      const response = await fetch('/api/umami-stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch stats');
      }

      // 添加处理时间信息
      if (result.data?.meta) {
        result.data.meta.processingTime = Date.now() - startTime;
      }

      return result.data as VisitorStats;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('Error fetching visitor stats:', error);
    // 快速失败，返回示例数据
    const processingTime = Date.now() - startTime;
    
    return {
      daily: generateExampleData('daily', 1),
      weekly: generateExampleData('weekly', 7),
      monthly: generateExampleData('monthly', 30),
      halfYearly: generateExampleData('halfYearly', 180),
      meta: {
        lastUpdated: new Date().toISOString(),
        processingTime,
        successRate: '0/4',
        cacheExpires: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        dataSource: 'realistic-mock',
        usingFallback: true,
        note: `所有Umami服务不可用，使用智能模拟数据 (错误: ${error})`,
        activeConfig: 'none'
      }
    };
  }
}

// 直接API调用 (用于内部API路由)
export async function getDirectVisitorStats(): Promise<VisitorStats | null> {
  const startTime = Date.now();
  
  try {
    console.log('🔄 直接获取Umami统计数据...');
    
    // 获取可用的配置
    const available = await getAvailableConfig();
    
    if (!available) {
      console.log('⚠️  没有可用的Umami服务，使用模拟数据');
      return createFallbackStats(startTime, 'no-service');
    }
    
    const { config, token } = available;
    const results: Record<string, PeriodStats> = {};
    let successCount = 0;
    
    // 获取各时间段数据
    const periods = [
      { name: 'daily', days: 1 },
      { name: 'weekly', days: 7 },
      { name: 'monthly', days: 30 },
      { name: 'halfYearly', days: 180 }
    ];
    
    for (const period of periods) {
      const { start, end } = getDateRange(period.name as any);
      const stats = await getWebsiteStats(start, end, config, token);
      
      if (stats) {
        results[period.name] = processStats(stats, period.name, period.days);
        successCount++;
      } else {
        results[period.name] = generateExampleData(period.name, period.days);
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      daily: results.daily,
      weekly: results.weekly,
      monthly: results.monthly,
      halfYearly: results.halfYearly,
      meta: {
        lastUpdated: new Date().toISOString(),
        processingTime,
        successRate: `${successCount}/${periods.length}`,
        cacheExpires: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        dataSource: successCount === periods.length ? `umami-${config.version}` : 
                   successCount > 0 ? 'mixed' : 'realistic-mock',
        usingFallback: successCount < periods.length,
        note: successCount === periods.length ? 
          `来自 ${config.version} 版本 Umami 的真实数据` :
          successCount > 0 ? 
          `部分数据来自 ${config.version} 版本 Umami，部分使用智能模拟` :
          '无法连接到任何 Umami 服务，使用智能模拟数据',
        activeConfig: config.version
      }
    };
    
  } catch (error) {
    console.error('直接获取统计数据失败:', error);
    return createFallbackStats(startTime, `error: ${error}`);
  }
}

// 创建后备数据
function createFallbackStats(startTime: number, reason: string): VisitorStats {
  const processingTime = Date.now() - startTime;
  
  return {
    daily: generateExampleData('daily', 1),
    weekly: generateExampleData('weekly', 7),
    monthly: generateExampleData('monthly', 30),
    halfYearly: generateExampleData('halfYearly', 180),
    meta: {
      lastUpdated: new Date().toISOString(),
      processingTime,
      successRate: '0/4',
      cacheExpires: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      dataSource: 'realistic-mock',
      usingFallback: true,
      note: `使用智能模拟数据，原因: ${reason}`,
      activeConfig: 'none'
    }
  };
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

// 获取当前活跃的配置信息
export function getActiveUmamiConfig(): { version: string; url: string } | null {
  if (!activeConfig) {
    return null;
  }
  
  return {
    version: activeConfig.version,
    url: activeConfig.baseUrl
  };
}

// 健康检查
export async function checkUmamiHealth(): Promise<{ available: boolean; configs: any[] }> {
  const results = [];
  
  for (const config of UMAMI_CONFIGS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${config.baseUrl}/api/heartbeat`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      results.push({
        version: config.version,
        url: config.baseUrl,
        available: response.ok,
        status: response.status
      });
    } catch (error) {
      results.push({
        version: config.version,
        url: config.baseUrl,
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return {
    available: results.some(r => r.available),
    configs: results
  };
} 