"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSimpleAuth } from '@/contexts/simple-auth-context'

export function SimpleAuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useSimpleAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // 如果不在加载中且未登录，且不在登录页面，则跳转到登录页
    if (!isLoading && !isLoggedIn && pathname !== '/login') {
      router.push('/login')
    }
    // 如果已登录且在登录页面，则跳转到dashboard
    else if (!isLoading && isLoggedIn && pathname === '/login') {
      router.push('/dashboard')
    }
  }, [isLoggedIn, isLoading, pathname, router])

  // 加载中显示loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">正在加载...</p>
        </div>
      </div>
    )
  }

  // 登录页面直接显示，不需要侧边栏
  if (pathname === '/login') {
    return <div className="min-h-screen">{children}</div>
  }

  // 其他页面需要登录
  if (!isLoggedIn) {
    return null // 这种情况下会被重定向到登录页
  }

  return <>{children}</>
}