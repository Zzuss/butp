"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, Shield, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { trackUserAction } from "@/lib/analytics"
import Link from "next/link"

export default function AdminLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isDevMode, setIsDevMode] = useState(false)

  // 检查是否为开发环境
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development' || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1'
    setIsDevMode(isDev)

    // 处理URL错误参数
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    const messageParam = urlParams.get('message')
    
    if (errorParam) {
      let errorMessage = ''
      switch (errorParam) {
        case 'session_expired':
          errorMessage = '管理员会话已过期，请重新登录'
          break
        case 'access_denied':
          errorMessage = '访问被拒绝，请使用管理员账户登录'
          break
        case 'invalid_session':
          errorMessage = '无效的会话，请重新登录'
          break
        default:
          errorMessage = messageParam || '登录过程中发生错误，请重试'
      }
      
      setError(errorMessage)
      console.log('Admin login page: URL error detected:', { errorParam, messageParam, errorMessage })
      
      // 清除URL中的错误参数
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      newUrl.searchParams.delete('message')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [])

  // 管理员登录
  const handleAdminLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("请输入管理员用户名和密码")
      return
    }

    try {
      setLoading(true)
      setError("")
      
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "管理员登录失败")
      }

      // 登录成功，跳转到管理员页面
      trackUserAction('auth', 'login_success', 'admin')
      window.location.href = "/admin"
      
    } catch (err) {
      console.error("管理员登录失败:", err)
      setError(err instanceof Error ? err.message : "管理员登录失败，请重试")
      trackUserAction('auth', 'login_failed', 'admin', { error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  // 处理回车键登录
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdminLogin()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-800">
            <Shield className="h-6 w-6 text-purple-600" />
            管理员登录
            {isDevMode && (
              <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                开发模式
              </span>
            )}
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            请使用管理员账户登录系统
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-gray-700">
                用户名
              </label>
              <Input
                id="username"
                type="text"
                placeholder="请输入管理员用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="bg-white"
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                密码
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="bg-white pr-10"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              onClick={handleAdminLogin}
              disabled={loading || !username.trim() || !password.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  登录中...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  登录
                </div>
              )}
            </Button>

            {/* 开发模式的便利提示 */}
            {isDevMode && (
              <div className="text-center">
                <p className="text-xs text-purple-600 bg-purple-100 p-2 rounded">
                  💡 默认管理员账户：admin / admin123
                </p>
              </div>
            )}
          </div>

          {/* 返回普通登录页面的链接 */}
          <div className="border-t pt-4">
            <div className="text-center">
              <Link 
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                返回学生登录页面
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
