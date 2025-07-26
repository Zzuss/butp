"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, User, Hash, Copy } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

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

  // 检查CAS认证状态
  useEffect(() => {
    checkCasAuth()
  }, [])

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
    setLoading(true)
    setError("")
    window.location.href = '/api/auth/cas/login?returnUrl=/dashboard'
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

  // 哈希登录
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

      if (response.ok) {
        // 登录成功，刷新用户状态并重定向到仪表板
        console.log('Hash login successful, refreshing user...')
        await refreshUser()
        console.log('User refreshed, redirecting to dashboard...')
        router.push('/dashboard')
      } else {
        const data = await response.json()
        setError(data.error || '登录失败，请重试')
      }
    } catch {
      setError('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 测试哈希值
  const testHashes = [
    "1cdc5935a5f0afaf2238e0e83021ad2fcbdcda479ffd7783d6e6bd1ef774d890",
    "4d589e50d0c55009fd9a3bdaffcfad179309a31093a24e4ac95e0f6a6aff7452"
  ]

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setHashValue(text)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">
            BuTP 登录
          </CardTitle>
          <p className="text-gray-600">北京邮电大学学习数据平台</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* CAS认证状态显示 */}
          {casAuthInfo ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">CAS认证成功</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">
                    {casAuthInfo.name} ({casAuthInfo.userId})
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* CAS登录按钮 */
            <Button
              onClick={handleCasLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              {loading ? '正在跳转...' : '使用学号统一身份认证登录'}
            </Button>
          )}

          {/* 哈希值登录 */}
          {casAuthInfo && (
            <div className="space-y-4">
              <div className="border-t border-gray-200 pt-4">
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
        </CardContent>
      </Card>
    </div>
  )
} 