'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, User, Shield, LogOut } from 'lucide-react'
import SessionTimeoutWarning from '@/components/auth/SessionTimeoutWarning'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function TestSessionTimeoutPage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    return `${minutes}分${seconds}秒`
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">会话超时测试页面</h1>
          <p className="text-gray-600">
            测试CAS认证的30分钟不活跃自动过期功能
          </p>
        </div>

        {/* 会话超时警告组件 - 已简化，不再显示警告 */}
        <SessionTimeoutWarning />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 用户信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                用户信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">用户ID:</span>
                <span className="font-mono text-sm">{user?.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">姓名:</span>
                <span className="text-sm">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">CAS认证:</span>
                <Badge variant={user?.isCasAuthenticated ? 'default' : 'secondary'}>
                  {user?.isCasAuthenticated ? '已认证' : '未认证'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">登录状态:</span>
                <Badge variant={user?.isLoggedIn ? 'default' : 'secondary'}>
                  {user?.isLoggedIn ? '已登录' : '未登录'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">登录时间:</span>
                <span className="text-xs text-gray-500">
                  {user?.loginTime ? formatTimestamp(user.loginTime) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">最后活跃:</span>
                <span className="text-xs text-gray-500">
                  {user?.lastActiveTime ? formatTimestamp(user.lastActiveTime) : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 会话状态卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                会话状态
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center text-gray-500 py-4">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">会话将在30分钟不活跃后自动过期</p>
                <p className="text-xs text-gray-400 mt-1">无需用户干预，系统自动管理</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 操作按钮 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>会话操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                立即登出
              </Button>
              
              <Button 
                onClick={() => router.push('/dashboard')}
                variant="secondary"
                className="flex items-center gap-2"
              >
                返回仪表板
              </Button>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">简化说明：</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• 会话超时时间：30分钟不活跃</li>
                <li>• 任何页面操作都会自动重置活跃时间</li>
                <li>• 超时后会自动登出并跳转到登录页面</li>
                <li>• 无警告提示，无手动延长功能</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
} 