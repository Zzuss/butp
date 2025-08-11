'use client'

import Script from 'next/script'

interface UmamiAnalyticsProps {
  websiteId: string
  src?: string
}

export function UmamiAnalytics({ 
  websiteId, 
  src = "https://umami-teal-omega.vercel.app/script.js" 
}: UmamiAnalyticsProps) {
  // 只在生产环境或明确启用时加载
  const shouldLoad = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
  
  if (!shouldLoad) {
    return null
  }

  return (
    <Script
      defer
      src={src}
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  )
} 