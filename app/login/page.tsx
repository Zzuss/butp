"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraduationCap, Languages } from "lucide-react"
import { useSimpleAuth, students } from "@/contexts/simple-auth-context"
import { useLanguage } from "@/contexts/language-context"

export default function LoginPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useSimpleAuth()
  const { language, setLanguage, t } = useLanguage()
  const router = useRouter()

  const handleLogin = async () => {
    if (!selectedStudentId) {
      alert(t('login.alert.select'))
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
      
      // 跳转到dashboard
      router.push("/dashboard")
    }
    
    setIsLoading(false)
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
            <label className="text-sm font-medium">{t('login.select.label')}</label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder={t('login.select.placeholder')} />
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