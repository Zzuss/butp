// Umami Analytics 配置
export const ANALYTICS_CONFIG = {
  // Umami 网站ID (从您的Umami仪表板获取)
  WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || 'ec362d7d-1d62-46c2-8338-6e7c0df7c084',
  
  // Umami 脚本URL
  SCRIPT_URL: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || 'https://umami-teal-omega.vercel.app/script.js',
  
  // 是否启用分析 (开发环境默认关闭)
  ENABLED: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  
  // 自定义事件名称
  EVENTS: {
    LOGIN: 'user_login',
    LOGOUT: 'user_logout',
    PAGE_VIEW: 'page_view',
    FEATURE_USE: 'feature_use',
    ERROR: 'error_occurred'
  }
}

// 自定义事件追踪函数
export function trackEvent(eventName: string, data?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track(eventName, data)
  }
}

// 页面浏览追踪
export function trackPageView(url?: string) {
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track('page_view', { url: url || window.location.pathname })
  }
}

// 用户行为追踪
export function trackUserAction(action: string, details?: Record<string, any>) {
  trackEvent('user_action', { action, ...details })
}

// 错误追踪
export function trackError(error: Error, context?: Record<string, any>) {
  trackEvent('error', {
    message: error.message,
    stack: error.stack,
    context
  })
}

// 声明全局类型
declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: Record<string, any>) => void
    }
  }
} 