"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  User, 
  BarChart3, 
  Users, 
  TrendingUp,
  GraduationCap
} from "lucide-react"
import { Sidebar, SidebarHeader, SidebarContent, SidebarItem } from "@/components/ui/sidebar"

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
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="h-screen">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          <span className="font-semibold text-lg">学生管理系统</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
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
    </Sidebar>
  )
}