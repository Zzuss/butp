"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Home, 
  BarChart3, 
  GraduationCap, 
  User, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Globe,
  Menu,
  X,
  TrendingUp,
  Info,
  Languages,
  LogOut,
  FileText
} from 'lucide-react'
import { Sidebar, SidebarHeader, SidebarContent, SidebarItem } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/language-context"
import { useSidebar } from "@/contexts/sidebar-context"
import { trackUserAction } from "@/lib/analytics"
import { CompletePDFExport } from '@/components/pdf/CompletePDFExport'
import PreserveLayoutPdfButton from '@/components/pdf/PreserveLayoutPdfButton'

const sidebarItems = [
  {
    title: "我的信息",
    titleKey: "sidebar.profile",
    href: "/profile",
    icon: User,
  },
  {
    title: "数据总览",
    titleKey: "sidebar.dashboard",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "分析模块",
    titleKey: "sidebar.analysis",
    href: "/analysis",
    icon: TrendingUp,
  },
  {
    title: "Role Model",
    titleKey: "sidebar.rolemodels",
    href: "/role-models",
    icon: Users,
  },
  {
    title: "关于BuTP",
    titleKey: "about.title",
    href: "/about",
    icon: Info,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const { isSidebarVisible } = useSidebar()
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // 处理登出事件
  const handleLogout = () => {
    // 追踪登出事件
    trackUserAction('logout', { 
      userId: user?.userId,
      userHash: user?.userHash?.substring(0, 12)
    })
    
    logout()
  }

  // 切换语言函数
  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh')
  }

  // 检测是否为移动设备
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])
  
  // 从本地存储加载侧边栏状态
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true')
    }
  }, [])

  // 如果sidebar不可见，则不渲染
  if (!isSidebarVisible) {
    return null
  }

  // 切换侧边栏折叠状态
  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', String(newState))
  }

  // 如果在登录页面，不显示侧边栏
  if (pathname === '/login') {
    return null
  }

  // 移动设备上的汉堡菜单按钮
  const toggleButton = (
    <button
      className="fixed top-4 left-4 z-50 p-2 bg-background border rounded-md shadow-md md:hidden"
      onClick={() => setIsOpen(!isOpen)}
    >
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  )

  return (
    <>
      {toggleButton}
      
      <Sidebar 
        className={`h-screen flex flex-col transition-all duration-300 ease-in-out ${
          isMobile 
            ? `fixed top-0 left-0 z-40 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-lg`
            : isCollapsed ? 'w-16' : 'w-52'
        }`}
      >
        <SidebarHeader className="relative">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
          <GraduationCap className="h-6 w-6" />
            {!isCollapsed && <span className="font-semibold text-lg">BuTP</span>}
        </div>
          
          {/* 收起/展开按钮 - 仅在非移动设备上显示 */}
          {!isMobile && (
            <button
              onClick={toggleCollapse}
              className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1 p-1 rounded-full bg-background border hover:bg-accent transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}
      </SidebarHeader>
      <SidebarContent className="flex-1">
        <nav className="space-y-2">
          {sidebarItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => isMobile && setIsOpen(false)}>
              <SidebarItem
                active={pathname === item.href}
                  className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
                  title={isCollapsed ? (item.titleKey ? t(item.titleKey) : item.title) : undefined}
              >
                <item.icon className="h-4 w-4" />
                  {!isCollapsed && <span>{item.titleKey ? t(item.titleKey) : item.title}</span>}
              </SidebarItem>
            </Link>
          ))}
        </nav>
      </SidebarContent>
      
      {user && user.isLoggedIn && (
          <div className={`border-t border-border mt-auto ${isCollapsed ? 'p-2' : 'p-4'}`}>
            {!isCollapsed ? (
              <>
          {/* PDF导出按钮 */}
          {/* 提高按钮层级并确保可点击，避免被页面其他浮层遮挡 */}
          <div className="mb-3 relative z-60 pointer-events-auto">
            <div className="space-y-2">
              <PreserveLayoutPdfButton defaultViewport={1366} />
            </div>
          </div>
          
          {/* 语言切换按钮 */}
          <div className="mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="w-full flex items-center gap-2 justify-start"
            >
              <Languages className="h-4 w-4" />
              <span>{language === 'zh' ? 'Change to English' : '切换为中文'}</span>
            </Button>
          </div>

          {/* 用户信息 */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">学号: {user.userId}</p>
              {user.userHash && (
                <p className="text-xs text-muted-foreground">哈希: {user.userHash.substring(0, 12)}...</p>
              )}
            </div>
          </div>

          {/* 登出按钮 */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full flex items-center gap-2 justify-start border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span>{language === 'zh' ? '退出登录' : 'Logout'}</span>
            </Button>
          </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {/* PDF导出按钮 - 折叠状态 */}
                <CompletePDFExport 
                  pageTitle="当前页面"
                  fileName={`page_export_${new Date().toISOString().split('T')[0]}.pdf`}
                  className="sidebar-collapsed"
                />
                
                {/* 语言切换按钮 - 折叠状态 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleLanguage}
                  title={language === 'zh' ? 'Change to English' : '切换为中文'}
                  className="w-8 h-8"
                >
                  <Languages className="h-4 w-4" />
                </Button>
                
                {/* 用户头像 - 折叠状态 */}
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                
                {/* 登出按钮 - 折叠状态 */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={logout}
                  title={language === 'zh' ? '退出登录' : 'Logout'}
                  className="w-8 h-8 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Sidebar>
      
      {/* 移动设备上的遮罩层，点击时关闭侧边栏 */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}