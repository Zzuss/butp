"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, User, ChevronDown } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { trackUserAction } from "@/lib/analytics"

export default function DemoLoginPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedDemoUser, setSelectedDemoUser] = useState('2023') // 默认选择2023级
  const [showDemoUserDropdown, setShowDemoUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDemoUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 示例用户数据
  const demoUsers = [
    {
      id: '2023',
      name: '2023级示例用户',
      hash: '24b56f91ab67af4531242999abd99e154df308220eb51f08e7c0dfff51d25889',
      year: '2023'
    },
    {
      id: '2024',
      name: '2024级示例用户',
      hash: '118ef2f061483894f93e921653b98d66ec21d3f849e458eda96c25e655fd3a49',
      year: '2024'
    },
    {
      id: '2025',
      name: '2025级示例用户',
      hash: 'f001ad16ec7a0b0934bc1a52c1d3e523e24a35bfced8c6e901fd03c6476cf505',
      year: '2025'
    }
  ];

  // 示例用户登录
  const handleDemoUserLogin = async () => {
    const selectedUser = demoUsers.find(user => user.id === selectedDemoUser);
    if (!selectedUser) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userHash: selectedUser.hash }),
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-800">
            <User className="h-6 w-6 text-green-600" />
            示例用户登录
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            体验系统功能，无需真实账号
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">
                选择示例用户年级
              </h3>
              <p className="text-sm text-green-700 mb-4">
                不同年级的示例用户拥有不同的数据和专业信息
              </p>

              {/* 年级选择下拉菜单 */}
              <div className="relative mb-4" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowDemoUserDropdown(!showDemoUserDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm border border-green-300 rounded-md bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <span className="text-gray-700 font-medium">
                    {demoUsers.find(user => user.id === selectedDemoUser)?.name || '选择年级'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showDemoUserDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showDemoUserDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-green-300 rounded-md shadow-lg">
                    {demoUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setSelectedDemoUser(user.id);
                          setShowDemoUserDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm hover:bg-green-50 transition-colors ${
                          selectedDemoUser === user.id ? 'bg-green-100 text-green-800 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <span>{user.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 示例用户登录按钮 */}
              <Button
                onClick={handleDemoUserLogin}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    登录中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    立即登录
                  </div>
                )}
              </Button>
            </div>

            {/* 说明信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">
                关于示例用户
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 无需真实学号即可体验系统</li>
                <li>• 查看完整的功能和界面</li>
                <li>• 数据仅供演示，不会保存</li>
                <li>• 适合系统演示和功能预览</li>
              </ul>
            </div>

            {/* 返回正式登录 */}
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                onClick={() => router.push('/login')}
                className="text-gray-600 hover:text-gray-800"
              >
                返回正式登录页面
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
