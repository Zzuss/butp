"use client"

import { usePathname } from 'next/navigation'
import { AppSidebar } from './sidebar'

// 不需要侧边栏的页面路径
const NO_SIDEBAR_PATHS = [
  '/privacy-agreement',
  '/login',
  '/auth-status',
  '/test-',
  '/verify-hash',
  '/find-student',
  '/about'
]

interface SidebarLayoutProps {
  children: React.ReactNode
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname()
  
  // 检查当前路径是否需要侧边栏
  const shouldShowSidebar = !NO_SIDEBAR_PATHS.some(path => 
    pathname === path || pathname.startsWith(path)
  )

  if (shouldShowSidebar) {
    // 显示侧边栏的布局
    return (
      <div className="flex h-screen flex-col md:flex-row">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-16 md:pt-4">
          {children}
        </main>
      </div>
    )
  }

  // 不显示侧边栏的布局（全屏显示）
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
