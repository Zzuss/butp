"use client"

import { useState, useEffect, useRef } from "react"
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

  // CAS popup window refs
  const casWindowRef = useRef<Window | null>(null)
  const messageListenerRef = useRef<((event: MessageEvent) => void) | null>(null)

  // 检查是否为开发环境
  useEffect(() => {
    // const isDev = process.env.NODE_ENV === 'development' ||
    //               window.location.hostname === 'localhost' ||
    //               window.location.hostname === '127.0.0.1'

    const isDev = false

    setIsDevMode(isDev)

    // 页面加载时检查URL参数
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    const messageParam = urlParams.get('message')
    const casSuccessParam = urlParams.get('cas_success')

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

    // 检查CAS成功参数（保留兼容旧的回调方式）
    if (casSuccessParam === 'true') {
      console.log('Login page: CAS认证成功，清除URL参数并检查session状态')
      // 清除URL中的cas_success参数
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('cas_success')
      window.history.replaceState({}, '', newUrl.toString())

      // 立即检查CAS认证状态
      setTimeout(() => {
        checkCasAuth()
      }, 100)
      return
    }

    // 本地开发环境直接跳过CAS认证检查
    if (isDev) {
      console.log('Login page: localhost detected, skipping CAS auth check')
      return
    }

    checkCasAuth()
  }, [])

  // 清理effect：组件卸载时清理监听器
  useEffect(() => {
    return () => {
      if (messageListenerRef.current) {
        window.removeEventListener('message', messageListenerRef.current)
      }
    }
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
            // CAS认证且已登录，检查隐私条款同意状态
            console.log('Login page: CAS认证且已登录，检查隐私条款状态...')
            try {
              const privacyResponse = await fetch('/api/auth/privacy-agreement', {
                method: 'GET',
                credentials: 'include'
              })

              if (privacyResponse.ok) {
                const privacyData = await privacyResponse.json()
                if (privacyData.hasAgreed) {
                  console.log('Login page: 隐私条款已同意，跳转到dashboard')
                  router.push('/dashboard')
                } else {
                  console.log('Login page: 隐私条款未同意，跳转到隐私条款页面')
                  router.push('/privacy-agreement')
                }
              } else {
                console.log('Login page: 隐私条款检查失败，跳转到隐私条款页面')
                router.push('/privacy-agreement')
              }
            } catch (error) {
              console.error('Login page: 隐私条款检查出错:', error)
              router.push('/privacy-agreement')
            }
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

  // CAS登录 - 直接访问CAS服务器方式（适配代理服务器v2.0.0）
  const handleCasLogin = () => {
    console.log('🚀 CAS登录按钮被点击 - 直接访问CAS服务器')
    setLoading(true)
    setError("")

    try {
      // 标志：是否已经收到认证成功的消息
      let authCompleted = false
      let checkClosed: NodeJS.Timeout | null = null
      let timeoutId: NodeJS.Timeout | null = null

      // 监听来自CAS窗口的消息
      const handleMessage = async (event: MessageEvent) => {
        // 验证消息来源（可选，根据代理服务器配置）
        const proxyOrigin = process.env.NEXT_PUBLIC_CAS_PROXY_URL || 'http://10.3.58.3:8080';
        try {
          const proxyUrl = new URL(proxyOrigin);
          if (event.origin !== proxyUrl.origin && event.origin !== 'null') {
            console.log('⚠️ 收到来自未知来源的消息:', event.origin);
            return;
          }
        } catch {
          // URL解析失败，继续处理
        }

          if (event.data.type === 'CAS_SUCCESS') {
          authCompleted = true  // 标记认证已完成，避免窗口关闭时重置状态
          if (checkClosed) clearInterval(checkClosed)
          if (timeoutId) clearTimeout(timeoutId)
          console.log('📥 收到CAS认证消息:', event.data)
          const { ticket, returnUrl } = event.data

          // 清理监听器
          if (messageListenerRef.current) {
            window.removeEventListener('message', messageListenerRef.current)
            messageListenerRef.current = null
          }

          // 发送ticket到后端验证
          try {
            console.log('🔍 正在验证ticket...')
            const verifyResponse = await fetch('/api/auth/cas/verify-ticket', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ ticket })
            })

            const verifyData = await verifyResponse.json()

            if (verifyData.success) {
              console.log('✅ Ticket验证成功，正在完成登录...')
              // 刷新用户状态
              await refreshUser()

              // 检查隐私条款同意状态
              try {
                const privacyResponse = await fetch('/api/auth/privacy-agreement', {
                  credentials: 'include'
                })

                if (privacyResponse.ok) {
                  const privacyData = await privacyResponse.json()
                  if (privacyData.hasAgreed) {
                    router.push(returnUrl || '/dashboard')
                  } else {
                    router.push('/privacy-agreement')
                  }
                } else {
                  router.push('/privacy-agreement')
                }
              } catch (error) {
                console.error('检查隐私条款状态失败:', error)
                router.push('/privacy-agreement')
              }
            } else {
              console.error('❌ Ticket验证失败:', verifyData.error)
              const errorMessages: Record<string, string> = {
                'ticket_validation_failed': 'CAS票据验证失败，请重新登录',
                'no_student_mapping': '您的学号未在系统中注册，请联系管理员',
                'invalid_student_hash': '您的学号映射信息无效，请联系管理员',
                'internal_error': '服务器内部错误，请稍后重试',
              }
              setError(errorMessages[verifyData.error] || '登录验证失败，请重试')
            }
          } catch (error) {
            console.error('❌ Ticket验证请求失败:', error)
            setError('登录请求失败，请重试')
          } finally {
            setLoading(false)
          }
        }
      }

      // 保存监听器引用以便清理
      messageListenerRef.current = handleMessage
      window.addEventListener('message', handleMessage)

      // 🔧 关键修改：直接构建CAS登录URL（不经过proxy-login）
      // CAS服务器会回调到代理服务器的callback端点，代理服务器通过postMessage返回ticket
      const callbackUrl = encodeURIComponent('http://10.3.58.3:8080/api/auth/cas/callback')
      const casLoginUrl = `https://auth.bupt.edu.cn/authserver/login?service=${callbackUrl}`

      console.log('🪟 打开CAS登录页面:', casLoginUrl)

      const newWindow = window.open(
        casLoginUrl,
        'CAS Login',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      )

      if (!newWindow) {
        setError('弹出窗口被阻止，请允许弹出窗口后重试')
        setLoading(false)
        window.removeEventListener('message', handleMessage)
        return
      }

      casWindowRef.current = newWindow

      // 设置超时检测（5分钟）
      timeoutId = setTimeout(() => {
        if (newWindow && !newWindow.closed && !authCompleted) {
          newWindow.close()
          setError('登录超时，请重试')
          setLoading(false)
          window.removeEventListener('message', handleMessage)
          if (checkClosed) clearInterval(checkClosed)
        }
      }, 300000)

      // 检测窗口关闭
      checkClosed = setInterval(() => {
        if (newWindow.closed && !authCompleted) {
          if (checkClosed) clearInterval(checkClosed)
          if (timeoutId) clearTimeout(timeoutId)
          window.removeEventListener('message', handleMessage)
          setLoading(false)
          console.log('🔴 弹窗被用户关闭，重置登录状态')
        }
      }, 1000)

    } catch (error) {
      console.error('❌ CAS登录失败:', error)
      setError('登录失败，请重试')
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
            /* 生产模式：CAS认证登录 */
            <div className="space-y-4">
              <div className="text-center text-gray-600">
                <p className="mb-4">使用统一身份认证登录</p>
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
                    认证中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    使用学号统一身份认证登录
                  </div>
                )}
              </Button>

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
