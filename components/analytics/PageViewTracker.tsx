'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // 页面加载时追踪
    trackPageView(pathname)
  }, [pathname])

  return null
} 