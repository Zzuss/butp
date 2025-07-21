"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GraduationCap, Languages } from "lucide-react"
import { useSimpleAuth } from "@/contexts/simple-auth-context"
import { useLanguage } from "@/contexts/language-context"
import { isValidStudentHash, getStudentInfoByHash } from "@/lib/student-data"

export default function LoginPage() {
  const [studentHash, setStudentHash] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useSimpleAuth()
  const { language, setLanguage, t } = useLanguage()
  const router = useRouter()

  const handleLogin = async () => {
    if (!studentHash) {
      alert(t('login.alert.input'))
      return
    }

    setIsLoading(true)
    
    try {
      // 检查哈希值是否有效
      if (isValidStudentHash(studentHash)) {
        // 获取学生信息
        const studentInfo = getStudentInfoByHash(studentHash);
        
        // 登录
        login(studentInfo)
        
        // 模拟登录延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 跳转到dashboard
        router.push("/dashboard")
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
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('login.input.label')}</label>
            <Input
              type="text"
              placeholder={t('login.input.placeholder')}
              value={studentHash}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudentHash(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              提示：请输入64位哈希值作为学号
            </p>
            <p className="text-xs text-muted-foreground">
              示例：1cdc5935a5f0afaf2238e0e83021ad2fcbdcda479ffd7783d6e6bd1ef774d890
            </p>
          </div>
          
          <Button 
            onClick={handleLogin}
            disabled={!studentHash || isLoading}
            className="w-full"
          >
            {isLoading ? t('login.button.loading') : t('login.button.login')}
          </Button>
          
          <div className="text-center text-xs text-muted-foreground">
            <p>{t('login.demo.text')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}