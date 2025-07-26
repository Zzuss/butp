"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GraduationCap, Languages } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/language-context"
import { isValidStudentHash } from "@/lib/student-data"

export default function LoginPage() {
  const [studentHash, setStudentHash] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [casAuthInfo, setCasAuthInfo] = useState<{
    userId: string;
    userHash: string;
    name: string;
    isLoggedIn: boolean;
    isCasAuthenticated: boolean;
    loginTime: number;
  } | null>(null)
  const [showCasLogin, setShowCasLogin] = useState(true)
  const { login } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const router = useRouter()

  // 检查是否有CAS认证信息
  useEffect(() => {
    const checkCasAuth = async () => {
      try {
        const response = await fetch('/api/auth/cas/check-session', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.isCasAuthenticated && !data.isLoggedIn) {
            console.log('Found CAS auth info:', data);
            setCasAuthInfo(data);
            setShowCasLogin(false);
            // 自动完成最终登录
            await completeCasLogin(data.userHash);
          }
        }
      } catch (error) {
        console.error('检查CAS认证状态失败:', error);
      }
    };

    checkCasAuth();
  }, []);

  // 完成CAS登录流程
  const completeCasLogin = async (userHash: string) => {
    setIsLoading(true);
    
    try {
      // 验证哈希值并完成登录
      if (isValidStudentHash(userHash)) {
        const response = await fetch('/api/auth/cas/complete-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ userHash }),
        });

        if (response.ok) {
          // 登录成功，跳转到dashboard
          router.push("/dashboard");
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || '完成登录失败');
        }
      } else {
        throw new Error('无效的学号哈希值格式');
      }
    } catch (error) {
      console.error('完成CAS登录失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`登录失败: ${errorMessage}，请重试`);
      setShowCasLogin(true);
      setCasAuthInfo(null);
      setIsLoading(false);
    }
  };

  const handleCASLogin = async () => {
    setIsLoading(true)
    
    try {
      // 直接重定向到CAS登录
      login('/dashboard')
    } catch (error) {
      console.error('CAS登录失败:', error)
      alert('CAS登录失败，请重试')
      setIsLoading(false)
    }
  }

  const handleHashLogin = async () => {
    if (!studentHash) {
      alert(t('login.alert.input'))
      return
    }

    setIsLoading(true)
    
    try {
      // 检查哈希值格式是否有效
      if (isValidStudentHash(studentHash)) {
        // 验证哈希值是否在数据库中存在
        const response = await fetch('/api/auth/validate-hash', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hash: studentHash }),
        });

        if (response.ok) {
          // 哈希值有效，创建临时session并跳转
          await completeCasLogin(studentHash);
        } else {
          alert('该学号哈希值在数据库中不存在');
          setIsLoading(false);
        }
      } else {
        alert(t('login.alert.invalid'))
        setIsLoading(false)
      }
    } catch (error) {
      console.error('登录失败:', error)
      alert(t('login.alert.failed'))
      setIsLoading(false)
    }
  }

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh')
  }

  // 如果正在处理CAS认证，显示加载状态
  if (casAuthInfo && !showCasLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-primary rounded-full">
                <GraduationCap className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">正在登录...</CardTitle>
              <CardDescription>
                CAS认证成功，正在完成登录流程
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                用户: {casAuthInfo.name}
              </p>
              <p className="text-sm text-muted-foreground">
                学号哈希: {casAuthInfo.userHash?.substring(0, 16)}...
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {/* 语言切换按钮 */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="flex items-center gap-2"
            >
              <Languages className="h-4 w-4" />
              {t('login.language.switch')}
            </Button>
          </div>
          
          <div className="flex justify-center">
            <div className="p-3 bg-primary rounded-full">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">
              <div>{t('login.title.line1')}</div>
              <div>{t('login.title.line2')}</div>
            </CardTitle>
            <CardDescription>
              {t('login.description')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 主要CAS登录按钮 */}
          <div className="space-y-4">
            <Button 
              onClick={handleCASLogin}
              disabled={isLoading}
              className="w-full text-lg py-6"
              size="lg"
            >
              {isLoading ? "正在跳转到CAS登录..." : "登录BuTP系统"}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>点击上方按钮使用学校统一身份认证登录</p>
              <p className="text-xs mt-1">系统将验证您的学号是否在数据库中存在</p>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">或</span>
            </div>
          </div>

          {/* 备用哈希登录 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              备用登录方式（需要数据库中存在的哈希值）
            </label>
            <Input
              type="text"
              placeholder="请输入64位SHA256哈希值"
              value={studentHash}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentHash(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              提示：请输入64位SHA256哈希值
            </p>
            <p className="text-xs text-muted-foreground">
              格式：000ded13b3d1e6f3276740881104c25ace1d3d4cbdd75f775c9b6dbac8efd2cb
            </p>
            
            <Button 
              onClick={handleHashLogin}
              disabled={!studentHash || isLoading}
              className="w-full"
              variant="outline"
              size="sm"
            >
              {isLoading ? t('login.button.loading') : "使用哈希值登录"}
            </Button>
          </div>
          
          <div className="text-center text-xs text-muted-foreground">
            <p>{t('login.demo.text')}</p>
            <p className="mt-1">系统使用SHA256算法对学号进行哈希化处理</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}