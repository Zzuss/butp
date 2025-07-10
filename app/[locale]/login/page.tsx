"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraduationCap, Globe } from "lucide-react"
import { useSimpleAuth, students } from "@/contexts/simple-auth-context"
import { useLanguage } from "@/contexts/language-context"
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useSimpleAuth()
  const router = useRouter()
  const params = useParams()
  const { locale, changeLanguage } = useLanguage()
  const t = useTranslations('login')

  const handleLogin = async () => {
    if (!selectedStudentId) {
      alert("请选择一个学生账号")
      return
    }

    setIsLoading(true)
    
    // 找到选择的学生
    const selectedStudent = students.find(s => s.id === selectedStudentId)
    if (selectedStudent) {
      // 登录
      login(selectedStudent)
      
      // 模拟登录延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 获取当前语言
      const currentLocale = params.locale || 'zh'
      
      // 跳转到dashboard
      router.push(`/${currentLocale}/dashboard`)
    }
    
    setIsLoading(false)
  }

  // 切换语言
  const toggleLanguage = () => {
    const newLocale = locale === 'zh' ? 'en' : 'zh'
    changeLanguage(newLocale)
    
    // 获取当前路径
    const path = window.location.pathname
    const pathParts = path.split('/')
    
    // 替换语言部分并重定向
    if (pathParts.length >= 2) {
      pathParts[1] = newLocale
      const newPath = pathParts.join('/')
      window.location.href = newPath
    }
  }

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
            <CardTitle className="text-2xl">{t('title')}</CardTitle>
            <CardTitle className="text-xl">{t('subtitle')}</CardTitle>
            <CardDescription>
              {t('description')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('selectStudent')}</label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{student.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {student.id} • {student.class}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleLogin}
            disabled={!selectedStudentId || isLoading}
            className="w-full"
          >
            {isLoading ? t('loggingIn') : t('loginButton')}
          </Button>
          
          <div className="flex justify-between items-center">
            <div className="text-center text-xs text-muted-foreground">
              <p>{t('demoSystem')}</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleLanguage} 
              className="flex items-center gap-1"
            >
              <Globe className="h-4 w-4" />
              {locale === 'zh' ? 'English' : '中文'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 