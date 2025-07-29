"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { 
  User, 
  BarChart3, 
  Users, 
  TrendingUp,
  GraduationCap,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Languages,
  FileText
} from "lucide-react"
import { Sidebar, SidebarHeader, SidebarContent, SidebarItem } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useSimpleAuth } from "@/contexts/simple-auth-context"
import { useLanguage } from "@/contexts/language-context"

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
  const { currentStudent, logout } = useSimpleAuth()
  const { t, language, setLanguage } = useLanguage()
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // 切换语言函数
  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh')
  }

  // 导出PDF函数
  const exportToPDF = () => {
    try {
      // 直接使用浏览器内置的打印功能，不隐藏任何元素
      window.print();
    } catch (error) {
      console.error('PDF导出失败:', error);
      alert('PDF导出失败，请重试');
    }
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
      
      {/* 用户信息和登出按钮 */}
      {currentStudent && (
          <div className={`border-t border-border mt-auto ${isCollapsed ? 'p-2' : 'p-4'}`}>
            {!isCollapsed ? (
              <>
          {/* PDF导出按钮 */}
          <div className="mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={exportToPDF}
              className="w-full flex items-center gap-2 justify-start"
            >
              <FileText className="h-4 w-4" />
              <span>{language === 'zh' ? '导出PDF' : 'Export PDF'}</span>
            </Button>
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
          
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{currentStudent.name}</p>
              <p className="text-xs text-muted-foreground">{currentStudent.id}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={logout}
            className="w-full flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t('sidebar.logout')}
          </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {/* PDF导出按钮 - 折叠状态 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={exportToPDF}
                  title={language === 'zh' ? '导出PDF' : 'Export PDF'}
                  className="w-8 h-8"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                
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
                
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={logout}
                  title={t('sidebar.logout')}
                  className="w-8 h-8"
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