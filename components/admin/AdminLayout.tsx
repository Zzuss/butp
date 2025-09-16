"use client"

import React, { useEffect, useState } from 'react'
import AdminHeader from './AdminHeader'

interface AdminLayoutProps {
  children: React.ReactNode
  showBackButton?: boolean
}

export default function AdminLayout({ children, showBackButton = true }: AdminLayoutProps) {
  const [adminInfo, setAdminInfo] = useState<{username: string, role: string} | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const response = await fetch('/api/auth/admin-session')
        if (response.ok) {
          const data = await response.json()
          if (data.isAdmin && data.admin) {
            setAdminInfo(data.admin)
          } else {
            // 未登录或非管理员，跳转到登录页
            window.location.href = '/login?error=admin_required&message=请先以管理员身份登录'
          }
        } else {
          window.location.href = '/login?error=admin_required&message=请先以管理员身份登录'
        }
      } catch (error) {
        console.error('获取管理员信息失败:', error)
        window.location.href = '/login?error=admin_required&message=请先以管理员身份登录'
      } finally {
        setLoading(false)
      }
    }

    fetchAdminInfo()
  }, [])

  // 页面关闭时清空登录状态
  useEffect(() => {
    const handleBeforeUnload = async () => {
      try {
        await fetch('/api/auth/admin-logout', {
          method: 'POST',
          credentials: 'include',
          keepalive: true
        })
      } catch (error) {
        console.error('页面关闭时清空登录状态失败:', error)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!adminInfo) {
    return null // 正在跳转
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader adminInfo={adminInfo} showBackButton={showBackButton} />
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  )
}
