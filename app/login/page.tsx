"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, User, Hash, Copy, Code, LogOut, Shield } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { trackUserAction } from "@/lib/analytics"
import Link from "next/link"


export default function LoginPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [hashValue, setHashValue] = useState("")
  const [hashValidating, setHashValidating] = useState(false)
  const [isDevMode, setIsDevMode] = useState(false)
  

  // 检查是否为开发环境
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
        case 'invalid_mapping':
          errorMessage = messageParam || '您的学号映射信息无效，请联系管理员'
          break
        case 'no_mapping':
          errorMessage = messageParam || '您的学号未在系统中注册，请联系管理员添加权限'
          break
        case 'mapping_error':
          errorMessage = messageParam || '查询学号映射时发生错误，请重试或联系管理员'
          break
        case 'admin_required':
          errorMessage = messageParam || '该页面需要管理员权限，请以管理员身份登录'
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
          if (data.isLoggedIn) {
            // CAS认证且已登录，直接跳转到dashboard
            router.push('/dashboard')
            return
          } else {
            // CAS认证成功但未完成登录，自动完成登录流程
            console.log('Login page: CAS认证成功，数据完整，正在自动完成登录...')
            try {
              const loginResponse = await fetch('/api/auth/cas/complete-auto-login', {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json'
                }
              })
              
              if (loginResponse.ok) {
                const loginData = await loginResponse.json()
                if (loginData.success) {
                  console.log('Login page: 自动登录成功，跳转到dashboard')
                  router.push('/dashboard')
                  return
                }
              }
              
              console.error('Login page: 自动登录失败')
              setError('自动登录失败，请重试或联系管理员')
            } catch (error) {
              console.error('Login page: 自动登录请求失败:', error)
              setError('登录请求失败，请重试')
            }
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

  // CAS登出 - 清除认证状态
  const handleCasLogout = () => {
    console.log('🚀 退出登录按钮被点击')
    try {
      // 强制跳转到CAS服务器登出页面，清除所有认证状态
      // 使用 force=true 参数确保即使在localhost也会跳转到真实的CAS服务器
      console.log('⏰ 开始跳转到CAS服务器登出页面（强制模式）')
      window.location.href = '/api/auth/cas/logout?force=true'
    } catch (error) {
      console.error('❌ CAS登出跳转失败:', error)
      setError('退出登录失败，请重试')
    }
  }

  // 示例用户一键登录
  const handleDemoUserLogin = async () => {
    const demoUserHash = "0dbcd0552538d3169d761a13328b631d28787137bf3cc1717cbd54eb05c22a9e";
    
    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userHash: demoUserHash }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 追踪登录成功事件
        trackUserAction('login_success', { 
          method: 'demo_user',
          userId: data.user?.userId 
        });
        
        await refreshUser();
        
        // 检查隐私条款同意状态
        try {
          const privacyResponse = await fetch('/api/auth/privacy-agreement', {
            credentials: 'include'
          });
          
          if (privacyResponse.ok) {
            const privacyData = await privacyResponse.json();
            if (privacyData.hasAgreed) {
              router.push('/dashboard');
            } else {
              router.push('/privacy-agreement');
            }
          } else {
            // 如果检查失败，默认跳转到隐私条款页面
            router.push('/privacy-agreement');
          }
        } catch (error) {
          console.error('检查隐私条款状态失败:', error);
          // 如果检查失败，默认跳转到隐私条款页面
          router.push('/privacy-agreement');
        }
      } else {
        // 追踪登录失败事件
        trackUserAction('login_failed', { 
          method: 'demo_user',
          error: data.error 
        });
        setError(data.error || '示例用户登录失败');
      }
    } catch (error) {
      // 追踪登录错误事件
      trackUserAction('login_error', { 
        method: 'demo_user',
        error: 'network_error'
      });
      setError('示例用户登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };


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
        
        // 检查隐私条款同意状态
        try {
          const privacyResponse = await fetch('/api/auth/privacy-agreement', {
            credentials: 'include'
          })
          
          if (privacyResponse.ok) {
            const privacyData = await privacyResponse.json()
            if (privacyData.hasAgreed) {
              router.push('/dashboard')
            } else {
              router.push('/privacy-agreement')
            }
          } else {
            // 如果检查失败，默认跳转到隐私条款页面
            router.push('/privacy-agreement')
          }
        } catch (error) {
          console.error('检查隐私条款状态失败:', error)
          // 如果检查失败，默认跳转到隐私条款页面
          router.push('/privacy-agreement')
        }
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

                {/* 开发模式管理员登录链接 */}
                <div className="border-t border-orange-300 pt-4">
                  <div className="text-center">
                    <Link 
                      href="/admin-login"
                      className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      管理员登录页面
                    </Link>
                    <p className="text-xs text-orange-600 mt-1">
                      独立的管理员登录页面
                    </p>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* 生产模式：CAS认证 + 示例用户登录 */
            <div className="space-y-4">
              <div className="text-center text-gray-600">
                <p className="mb-4">选择登录方式</p>
              </div>
              
              {/* CAS 统一身份认证登录 */}
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

              {/* 示例用户登录按钮 */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gradient-to-br from-blue-50 to-indigo-100 px-2 text-gray-500">或</span>
                </div>
              </div>

              <Button
                onClick={handleDemoUserLogin}
                disabled={loading}
                variant="outline"
                className="w-full border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-400"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                    登录中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    示例用户登录（电子信息工程专业学生）
                  </div>
                )}
              </Button>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  示例用户无需认证，可直接体验系统功能
                </p>
              </div>

              {/* 管理员登录链接 */}
              <div className="border-t pt-4">
                <div className="text-center">
                  <Link 
                    href="/admin-login"
                    className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    管理员登录
                  </Link>
                  <p className="text-xs text-gray-500 mt-1">
                    系统管理员请点击此处登录
                  </p>
                </div>
              </div>

            </div>
          )}
        </CardContent>
        
        {/* 退出登录按钮区域 - 仅在生产环境显示 */}
        {!isDevMode && (
          <div className="px-6 pb-6">
            <div className="border-t pt-4">
              <div className="text-center mb-2">
                <p className="text-xs text-gray-500">
                  如果您遇到登录问题或需要重置认证状态
                </p>
              </div>
              <Button
                onClick={handleCasLogout}
                variant="ghost"
                size="sm"
                className="w-full text-gray-600 hover:text-red-600 hover:bg-red-50"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  清除认证状态并退出登录
                </div>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
} 