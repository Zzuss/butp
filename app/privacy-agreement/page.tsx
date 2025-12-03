"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, XCircle, FileText, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { trackUserAction } from "@/lib/analytics"
// FileContent interface now defined locally
interface FileContent {
  title: string
  content: string
  lastUpdated: string
  fileType: string
}

export default function PrivacyAgreementPage() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [privacyContent, setPrivacyContent] = useState<FileContent | null>(null)
  const [loadingContent, setLoadingContent] = useState(true)
  const [agreeing, setAgreeing] = useState(false)
  const [error, setError] = useState("")
  const [systemError, setSystemError] = useState("")

  // 检查URL参数中的错误信息
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    
    if (errorParam === 'db_error') {
      setSystemError('数据库连接异常，请稍后重试或联系管理员')
    } else if (errorParam === 'check_error') {
      setSystemError('隐私条款检查系统异常，请稍后重试或联系管理员')
    }
  }, [])

  // 检查用户是否已登录或CAS认证
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (loading) return
      
      // 如果用户已完全登录，直接继续
      if (user) return
      
      // 检查是否来自CAS重定向
      const urlParams = new URLSearchParams(window.location.search)
      const fromCas = urlParams.get('from') === 'cas'
      
      if (fromCas) {
        console.log('Privacy page: 来自CAS重定向，检查CAS认证状态...')
        try {
          const response = await fetch('/api/auth/cas/check-session', {
            credentials: 'include'
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.isCasAuthenticated && data.userId && data.userHash) {
              console.log('Privacy page: CAS认证有效，允许访问隐私条款页面')
              return // 允许继续访问隐私条款页面
            }
          }
        } catch (error) {
          console.error('Privacy page: CAS状态检查失败:', error)
        }
      }
      
      // 如果不是CAS重定向或CAS认证无效，重定向到登录页面
      console.log('Privacy page: 用户未登录且非有效CAS认证，重定向到登录页面')
      router.push('/login')
    }
    
    checkAuthStatus()
  }, [user, loading, router])

  // 加载隐私条款内容
  useEffect(() => {
    const loadContentIfNeeded = async () => {
      // 如果用户已登录，直接加载
      if (user) {
        loadPrivacyContent()
        return
      }
      
      // 如果来自CAS且有认证状态，也加载内容
      const urlParams = new URLSearchParams(window.location.search)
      const fromCas = urlParams.get('from') === 'cas'
      
      if (fromCas) {
        try {
          const response = await fetch('/api/auth/cas/check-session', {
            credentials: 'include'
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.isCasAuthenticated && data.userId && data.userHash) {
              console.log('Privacy page: CAS认证有效，加载隐私条款内容')
              loadPrivacyContent()
            }
          }
        } catch (error) {
          console.error('Privacy page: 检查CAS状态失败:', error)
        }
      }
    }
    
    loadContentIfNeeded()
  }, [user])

  // 加载隐私条款内容
  const loadPrivacyContent = async () => {
    try {
      setLoadingContent(true)
      setError("")
      
      // 从Supabase Storage读取隐私条款内容
      const response = await fetch('/api/privacy-content', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setPrivacyContent(data.data)
      } else {
        console.error('加载隐私条款失败:', data.error)
        setError('加载隐私条款失败，请刷新页面重试')
      }
      
    } catch (error) {
      console.error('加载隐私条款失败:', error)
      setError('加载隐私条款失败，请刷新页面重试')
    } finally {
      setLoadingContent(false)
    }
  }

  // 同意隐私条款
  const handleAgree = async () => {
    // 检查用户登录状态或CAS认证状态
    let hasValidAuth = false
    
    if (user) {
      hasValidAuth = true
    } else {
      // 检查CAS认证状态
      try {
        const response = await fetch('/api/auth/cas/check-session', {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.isCasAuthenticated && data.userId && data.userHash) {
            hasValidAuth = true
          }
        }
      } catch (error) {
        console.error('Privacy page: 检查CAS认证状态失败:', error)
      }
    }
    
    if (!hasValidAuth) {
      setError('用户未登录或认证无效')
      return
    }

    try {
      setAgreeing(true)
      setError("")

      const response = await fetch('/api/auth/privacy-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'agree'
        }),
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ 隐私条款同意成功')
        
        // 如果是CAS用户且未完全登录，需要先完成登录
        if (!user) {
          console.log('🔄 CAS用户同意隐私条款后，完成登录流程...')
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
                console.log('✅ CAS自动登录完成，跳转到dashboard')
                router.push('/dashboard')
                return
              }
            }
            
            console.error('❌ CAS自动登录失败，跳转到登录页面')
            router.push('/login')
          } catch (error) {
            console.error('❌ CAS自动登录请求失败:', error)
            router.push('/login')
          }
        } else {
          // 普通用户直接跳转到dashboard
          console.log('✅ 普通用户同意隐私条款，跳转到dashboard')
          router.push('/dashboard')
        }
      } else {
        console.error('❌ 隐私条款同意失败:', data.error)
        setError('同意失败，请重试')
      }
    } catch (error) {
      console.error('同意隐私条款失败:', error)
      setError('网络错误，请重试')
    } finally {
      setAgreeing(false)
    }
  }

  // 不同意隐私条款 - 与sidebar中的logout按钮完全一致
  const handleDisagree = () => {
    // 追踪登出事件（与sidebar中的logout按钮完全一致）
    trackUserAction('logout', { 
      userId: user?.userId,
      userHash: user?.userHash?.substring(0, 12)
    })
    
    // 调用相同的logout函数（与sidebar中的logout按钮完全一致）
    logout()
  }

  // 如果正在加载用户信息，显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">正在加载隐私条款内容...</p>
        </div>
      </div>
    )
  }

  // 如果用户未登录，不显示内容（会被useEffect重定向）
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-5xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            <FileText className="inline-block h-8 w-8 mr-3 text-blue-600" />
            隐私条款同意
          </h1>
          <p className="text-gray-600">
            请仔细阅读以下隐私政策与用户数据使用条款，同意后方可使用系统服务
          </p>
        </div>

        {/* 系统错误提示 */}
        {systemError && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">系统异常</p>
              <p>{systemError}</p>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 隐私条款内容 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {privacyContent?.title || '隐私政策与用户数据使用条款'}
            </CardTitle>
            <p className="text-sm text-gray-500">
              最后更新时间：{privacyContent?.lastUpdated || '2025年8月'}
            </p>
          </CardHeader>
          <CardContent>
            {loadingContent ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">正在加载隐私条款内容...</p>
              </div>
            ) : privacyContent ? (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                  {privacyContent.content}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>无法加载隐私条款内容</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleAgree}
            disabled={agreeing || loadingContent}
            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
          >
            {agreeing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                处理中...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                我同意隐私条款
              </div>
            )}
          </Button>

          <Button
            onClick={handleDisagree}
            disabled={agreeing || loadingContent}
            variant="outline"
            className="flex-1 sm:flex-none border-red-300 text-red-700 hover:bg-red-50 px-8 py-3 text-lg"
          >
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              我不同意
            </div>
          </Button>
        </div>

        {/* 提示信息 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>点击"我同意"表示您已阅读并同意上述隐私条款</p>
          <p>如果您不同意，将无法使用系统服务</p>
        </div>
      </div>
    </div>
  )
}
