"use client"

import React from 'react'
import { Users, UserCheck, FileText, Bell, Award, Shield, Database, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'

export default function AdminPage() {
  return (
    <AdminLayout showBackButton={false}>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 管理员权限管理 */}
        <Link href="/admin/admins">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                管理员权限管理
              </CardTitle>
              <Shield className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-purple-700">管理员用户</div>
              <p className="text-xs text-muted-foreground">
                管理管理员用户信息和权限
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 学生登录管理 */}
        <Link href="/admin/SNH">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                学生登录管理
              </CardTitle>
              <UserCheck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-purple-700">学号管理</div>
              <p className="text-xs text-muted-foreground">
                管理学生学号和登录权限
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 培养方案管理 */}
        <Link href="/admin/education-plan">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                培养方案管理
              </CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-purple-700">培养方案</div>
              <p className="text-xs text-muted-foreground">
                管理各专业培养方案文档
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 系统通知管理 */}
        <Link href="/admin/notifications">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                系统通知管理
              </CardTitle>
              <Bell className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-purple-700">系统通知</div>
              <p className="text-xs text-muted-foreground">
                管理系统消息和通知弹窗
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 隐私条款管理 */}
        <Link href="/admin/privacy-policy">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                隐私条款管理
              </CardTitle>
              <FileText className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-red-700">隐私条款</div>
              <p className="text-xs text-muted-foreground">
                管理用户隐私条款同意记录
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 成绩推免页面 */}
        <Link href="/admin/comprehensive-evaluation">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                成绩推免页面
              </CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-purple-700">推免管理</div>
              <p className="text-xs text-muted-foreground">
                管理学生加分记录审核和推免资格
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 成绩导入管理 */}
        <Link href="/admin/grades-import">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                成绩导入管理
              </CardTitle>
              <Database className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-blue-700">成绩导入</div>
              <p className="text-xs text-muted-foreground">
                使用影子表机制安全导入成绩数据到 academic_results 表
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 示例用户体验入口 - 外链，新开标签避免影响管理员登录状态 */}
        <a
          href="https://butp.tech/demo-login"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                示例用户体验
              </CardTitle>
              <Globe className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-blue-700">Demo 登录（新窗口）</div>
              <p className="text-xs text-muted-foreground">
                新开标签访问示例账号，不会影响当前管理员登录状态
              </p>
            </CardContent>
          </Card>
        </a>
      </div>
      
    </AdminLayout>
  )
}