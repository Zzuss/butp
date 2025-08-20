"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, User, Hash, Copy, Code } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { trackUserAction } from "@/lib/analytics"

// CAS认证信息接口
interface CasAuthInfo {
  userId: string;
  name: string;
  userHash: string;
}

export default function LoginPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [hashValue, setHashValue] = useState("")
  const [hashValidating, setHashValidating] = useState(false)
  const [casAuthInfo, setCasAuthInfo] = useState<CasAuthInfo | null>(null)
  const [isDevMode, setIsDevMode] = useState(false)

  // 检查是否为开发环境和处理URL错误参数
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development' || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1'
    setIsDevMode(isDev)
    
    // 🆕 处理URL错误参数
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    const messageParam = urlParams.get('message')
    
    if (errorParam) {
      let errorMessage = ''
      switch (errorParam) {
        case 'ticket_expired':
          errorMessage = messageParam || '登录票据已过期，请重新登录'
          break
        case 'missing_ticket':
          errorMessage = '缺少登录票据，请重新登录'
          break
        case 'auth_failed':
          errorMessage = messageParam || '认证失败，请重试'
          break
        case 'verify_failed':
          errorMessage = '票据验证失败，请重新登录'
          break
        default:
          errorMessage = messageParam || '登录过程中发生错误，请重试'
      }
      
      setError(errorMessage)
      console.log('Login page: URL error detected:', { errorParam, messageParam, errorMessage })
      
      // 清除URL中的错误参数，避免刷新时重复显示
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('error')
      newUrl.searchParams.delete('message')
      window.history.replaceState({}, '', newUrl.toString())
    }
    
    // 本地开发环境直接跳过CAS认证检查
    if (isDev) {
      console.log('Login page: localhost detected, skipping CAS auth check')
      return
    }
    
    checkCasAuth()
  }, [])

  // 测试哈希值
  const testHashes = [
    "a97af3ae898a3d3e2c2c8aecd9f49fc0a0474e813c218f3891016ac0466fcb55",
    "0886e2a5c75eaa21b81977e56f67c6faceafb1ee67eeb8a85c1eacc8bbd2447b"
  ]

  // 复制到剪贴板并填入输入框
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // 同时填入输入框
      setHashValue(text)
      console.log('已复制到剪贴板并填入输入框')
    } catch (error) {
      console.error('复制失败:', error)
      // 备用方案：使用传统方法
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      // 即使复制失败，也要填入输入框
      setHashValue(text)
      console.log('已复制到剪贴板（备用方案）并填入输入框')
    }
  }

  // 检查CAS认证状态
  const checkCasAuth = async () => {
    try {
      const response = await fetch('/api/auth/cas/check-session', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.isCasAuthenticated && data.userId && data.name && data.userHash) {
          setCasAuthInfo({
            userId: data.userId,
            name: data.name,
            userHash: data.userHash
          })
          if (data.isLoggedIn) {
            router.push('/dashboard')
            return
          }
        }
      }
    } catch (error) {
      console.error('检查CAS认证状态失败:', error)
    }
  }

  // CAS登录
  const handleCasLogin = () => {
    console.log('🚀 CAS登录按钮被点击')
    setLoading(true)
    setError("")
    
    try {
      const loginUrl = '/api/auth/cas/login?returnUrl=/dashboard'
      console.log('�� 准备跳转到:', loginUrl)
      
      // 添加一个小延迟以确保状态更新
      setTimeout(() => {
        console.log('⏰ 开始跳转到CAS登录')
        window.location.href = loginUrl
      }, 100)
      
    } catch (error) {
      console.error('❌ CAS登录跳转失败:', error)
      setError('登录跳转失败，请重试')
      setLoading(false)
    }
  }

  // 开发模式直接哈希登录
  const handleDevHashLogin = async () => {
    if (!hashValue.trim()) {
      setError('请输入学号哈希值')
      return
    }

    if (!/^[a-fA-F0-9]{64}$/.test(hashValue.trim())) {
      setError('哈希值格式错误，必须是64位十六进制字符')
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userHash: hashValue.trim() }),
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // 追踪登录成功事件
        trackUserAction('login_success', { 
          method: 'dev_hash',
          userId: data.user?.userId 
        })
        
        await refreshUser()
        router.push('/dashboard')
      } else {
        // 追踪登录失败事件
        trackUserAction('login_failed', { 
          method: 'dev_hash',
          error: data.error 
        })
        setError(data.error || '登录失败')
      }
    } catch (error) {
      // 追踪登录错误事件
      trackUserAction('login_error', { 
        method: 'dev_hash',
        error: 'network_error'
      })
      setError('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 验证哈希值
  const validateHash = async () => {
    if (!hashValue.trim()) {
      setError('请输入学号哈希值')
      return false
    }

    setHashValidating(true)
    try {
      const response = await fetch('/api/auth/validate-hash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userHash: hashValue.trim() }),
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && (data.valid || data.exists)) {
        return true
      } else {
        setError('学号哈希值不正确或学生不存在')
        return false
      }
    } catch {
      setError('验证失败，请重试')
      return false
    } finally {
      setHashValidating(false)
    }
  }

  // 哈希登录（CAS认证后）
  const handleHashLogin = async () => {
    if (!casAuthInfo) {
      setError('请先完成CAS认证')
      return
    }

    const isValid = await validateHash()
    if (!isValid) return

    setLoading(true)
    try {
      const response = await fetch('/api/auth/cas/complete-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userHash: hashValue.trim(),
          preserveCasInfo: true 
        }),
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // 追踪登录成功事件
        trackUserAction('login_success', { 
          method: 'cas_hash',
          userId: data.user?.userId 
        })
        
        await refreshUser()
        router.push('/dashboard')
      } else {
        // 追踪登录失败事件
        trackUserAction('login_failed', { 
          method: 'cas_hash',
          error: data.error 
        })
        setError(data.error || '登录失败')
      }
    } catch (error) {
      // 追踪登录错误事件
      trackUserAction('login_error', { 
        method: 'cas_hash',
        error: 'network_error'
      })
      setError('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-800">
            <User className="h-6 w-6" />
            BuTP 登录
            {isDevMode && (
              <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                开发模式
              </span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 开发模式：直接哈希值登录 */}
          {isDevMode ? (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-medium text-orange-800 mb-3 flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  本地开发模式 - 跳过CAS认证
                </h3>
                
                {/* 测试哈希值提示 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <h4 className="font-medium text-blue-800 mb-2">测试用哈希值：</h4>
                  <div className="space-y-2">
                    {testHashes.map((hash, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white p-2 rounded border font-mono">
                          {hash.substring(0, 20)}...
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(hash)}
                          className="px-2 py-1"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Input
                    type="text"
                    placeholder="请输入64位学号哈希值"
                    value={hashValue}
                    onChange={(e) => setHashValue(e.target.value)}
                    className="font-mono text-sm"
                    disabled={loading}
                  />
                  
                  <Button
                    onClick={handleDevHashLogin}
                    disabled={loading || !hashValue.trim()}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        登录中...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        本地开发登录
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* 生产模式：CAS认证 + 哈希值验证 */
            <>
              {!casAuthInfo ? (
                /* 第一步：CAS认证 */
                <div className="space-y-4">
                  <div className="text-center text-gray-600">
                    <p className="mb-4">使用学号统一身份认证登录</p>
                  </div>
                  
                  <Button
                    onClick={handleCasLogin}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        跳转中...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        使用学号统一身份认证登录
                      </div>
                    )}
                  </Button>
                </div>
              ) : (
                /* 第二步：显示CAS信息 + 哈希值登录 */
                <div className="space-y-4">
                  {/* CAS认证成功信息 */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">CAS认证成功</span>
                    </div>
                    <div className="text-sm text-green-600">
                      <p><strong>姓名：</strong>{casAuthInfo.name}</p>
                      <p><strong>学号：</strong>{casAuthInfo.userId}</p>
                    </div>
                  </div>

                  {/* 哈希值登录 */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-3">输入学号哈希值完成登录</h3>
                    
                    {/* 测试哈希值提示 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <h4 className="font-medium text-blue-800 mb-2">测试用学号哈希值：</h4>
                      <div className="space-y-2">
                        {testHashes.map((hash, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-white p-2 rounded border font-mono">
                              {hash.substring(0, 20)}...
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(hash)}
                              className="px-2 py-1"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Input
                        type="text"
                        placeholder="请输入64位学号哈希值"
                        value={hashValue}
                        onChange={(e) => setHashValue(e.target.value)}
                        className="font-mono text-sm"
                        disabled={loading || hashValidating}
                      />
                      
                      <Button
                        onClick={handleHashLogin}
                        disabled={loading || hashValidating || !hashValue.trim()}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        {hashValidating ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            验证中...
                          </div>
                        ) : loading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            登录中...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            登录
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 