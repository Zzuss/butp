"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  User, 
  BarChart3, 
  Users, 
  TrendingUp,
  GraduationCap,
  PieChart,
  LogOut
} from "lucide-react"
import { Sidebar, SidebarHeader, SidebarContent, SidebarItem } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useSimpleAuth } from "@/contexts/simple-auth-context"

const sidebarItems = [
  {
    title: "我的信息",
    href: "/profile",
    icon: User,
  },
  {
    title: "数据总览",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Role Model",
    href: "/role-models",
    icon: Users,
  },
  {
    title: "分析模块",
    href: "/analysis",
    icon: TrendingUp,
  },
  {
    title: "图表测试",
    href: "/charts",
    icon: PieChart,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { currentStudent, logout } = useSimpleAuth()

  // 如果在登录页面，不显示侧边栏
  if (pathname === '/login') {
    return null
  }

  return (
    <Sidebar className="h-screen flex flex-col">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          <span className="font-semibold text-lg">学生管理系统</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1">
        <nav className="space-y-2">
          {sidebarItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <SidebarItem
                active={pathname === item.href}
                className="w-full justify-start"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarItem>
            </Link>
          ))}
        </nav>
      </SidebarContent>
      
      {/* 用户信息和登出按钮 */}
      {currentStudent && (
        <div className="p-4 border-t border-border mt-auto">
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
            退出登录
          </Button>
        </div>
      )}
    </Sidebar>
  )
}