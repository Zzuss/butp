"use client"

import React from 'react'
import { Users, UserCheck, TrendingUp, FileText, Bell, Award, Shield, Database } from 'lucide-react'
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

        {/* 智育成绩管理 - 已启用 */}
        <Link href="/admin/prediction/async">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                智育成绩管理
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-purple-700">成绩预测</div>
              <p className="text-xs text-muted-foreground">
                管理学生智育成绩和异步预测系统
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 预测表导入工具 */}
        <Link href="/admin/prediction-import">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                预测表导入工具
              </CardTitle>
              <Database className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-green-700">数据导入</div>
              <p className="text-xs text-muted-foreground">
                单独导入各专业预测文件到数据库
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

        {/* 综评成绩管理 */}
        <Link href="/admin/comprehensive-evaluation">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                综评成绩管理
              </CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-purple-700">综评管理</div>
              <p className="text-xs text-muted-foreground">
                管理学生论文、专利的综合评价加分
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
      
    </AdminLayout>
  )
}