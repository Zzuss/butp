"use client"

import React from 'react'
import { Shield, LogOut, ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from 'next/link'

interface AdminHeaderProps {
  adminInfo: {
    username: string
    role?: string
  } | null
  showBackButton?: boolean
}

export default function AdminHeader({ adminInfo, showBackButton = false }: AdminHeaderProps) {
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin-logout', {
        method: 'POST',
        credentials: 'include'
      })
      window.location.href = '/login'
    } catch (error) {
      console.error('退出登录失败:', error)
    }
  }

  return (
    <div className="bg-white shadow-sm border-b mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  返回
                </Button>
              </Link>
            )}
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-purple-600 mr-2" />
              <h1 className="text-lg font-semibold text-gray-900">
                {showBackButton ? 'BuTP 管理后台' : 'BuTP 管理员控制台'}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {adminInfo && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{adminInfo.username}</div>
                  <div className="text-gray-500 text-xs">
                    {adminInfo.role === 'super_admin' ? '超级管理员' : '管理员'}
                  </div>
                </div>
              </div>
            )}
            
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
