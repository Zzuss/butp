"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BarChart3, BookOpen, GraduationCap, PercentCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSimpleAuth } from '@/contexts/simple-auth-context'
import { useLanguage } from '@/contexts/language-context'

// 导入数据处理函数
import { 
  getStudentResults,
  calculateDashboardStats, 
  getRecentSubjectGrades, 
  getCourseTypeStats, 
  getSemesterTrends,
  getStudentInfo,
  type DashboardStats,
  type SubjectGrade,
  type CourseTypeStats,
  type SemesterTrend
} from '@/lib/dashboard-data'

// 导入图表组件
import { CourseStatsChart } from '@/components/ui/chart'

export default function DashboardPage() {
  const { currentStudent, isLoggedIn, isLoading: authLoading } = useSimpleAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrade[]>([])
  const [courseTypeStats, setCourseTypeStats] = useState<CourseTypeStats[]>([])
  const [semesterTrends, setSemesterTrends] = useState<SemesterTrend[]>([])
  const [studentInfo, setStudentInfo] = useState<{ year: string; major: string } | null>(null)
  // const [courseResults, setCourseResults] = useState<CourseResult[]>([])

  useEffect(() => {
    // 如果未登录，不加载数据
    if (authLoading) return
    
    if (!isLoggedIn || !currentStudent) {
      setIsLoading(false)
      return
    }
    
    async function loadDashboardData() {
      setIsLoading(true)
      try {
        // 获取学生成绩数据
        const results = await getStudentResults(currentStudent!.id)
        // setCourseResults(results)
        
        // 获取学生信息（年级和专业）
        const info = await getStudentInfo(currentStudent!.id)
        setStudentInfo(info)
        
        // 计算统计数据
        const dashboardStats = calculateDashboardStats(results)
        setStats(dashboardStats)
        
        // 获取最近的科目成绩
        const recentGrades = await getRecentSubjectGrades(results, 6, language, info?.major, info?.year)
        setSubjectGrades(recentGrades)
        
        // 获取课程类型统计
        const typeStats = getCourseTypeStats(results)
        setCourseTypeStats(typeStats)
        
        // 获取学期成绩趋势
        const trends = getSemesterTrends(results)
        setSemesterTrends(trends)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadDashboardData()
  }, [currentStudent, isLoggedIn, authLoading])
  
  // 如果未登录，显示登录提示
  if (!authLoading && !isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">{t('dashboard.login.required')}</h2>
        <Button onClick={() => router.push('/login')}>
          {t('login.button.login')}
        </Button>
      </div>
    )
  }
  
  // 加载状态
  if (isLoading || authLoading) {
    const studentName = currentStudent?.name || ''
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <h2 className="text-xl font-medium mb-2">
          {currentStudent ? t('dashboard.loading', { name: studentName }) : t('dashboard.loading.message')}
        </h2>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">
          {studentInfo 
            ? `${studentInfo.year}${studentInfo.major}-${currentStudent?.id || ''}`
            : t('dashboard.description', { name: currentStudent?.name || '' })
          }
        </p>
      </div>
      
      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.average')}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageScore || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.average.desc')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.pass.rate')}
            </CardTitle>
            <PercentCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((stats?.passRate || 0) * 100)}%</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.pass.rate.desc')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.courses')}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.courseCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.courses.desc')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.gpa')}
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.gpa || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.gpa.desc')}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* 各科成绩 */}
      <Card className="col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.subjects.title')}</CardTitle>
              <CardDescription>
                {t('dashboard.subjects.description')}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-1"
              onClick={() => router.push('/grades')}
            >
              {t('dashboard.subjects.view.more')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {subjectGrades.length > 0 ? (
            <div className="space-y-8">
              {subjectGrades.map((subject, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">{subject.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {subject.credit} {t('grades.table.credit')}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {subject.grade}
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ 
                        width: `${Math.min(100, (typeof subject.grade === 'number' ? subject.grade : 0) / 100 * 100)}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('dashboard.subjects.current')}</span>
                    <span>{t('dashboard.subjects.average')}: {subject.average}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {t('dashboard.subjects.no.data')}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 课程统计 & 学期趋势 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 课程统计 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.course.stats.title')}</CardTitle>
            <CardDescription>
              {t('dashboard.course.stats.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {stats && (
              <>
                <CourseStatsChart 
                  passed={Math.round((stats.passRate || 0) * stats.courseCount)}
                  failed={Math.round((1 - (stats.passRate || 0)) * stats.courseCount)}
                  passLabel={t('dashboard.course.stats.passed')}
                  failLabel={t('dashboard.course.stats.failed')}
                />
                <div className="mt-4 text-sm text-center">
                  <div className="font-medium mb-1">
                    {t('dashboard.course.stats.pass.rate')}: {Math.round((stats.passRate || 0) * 100)}%
                  </div>
                  <div className="text-muted-foreground">
                    {t('dashboard.course.stats.summary', { 
                      completed: Math.round((stats.passRate || 0) * stats.courseCount), 
                      total: stats.courseCount 
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* 学期趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.trends.title')}</CardTitle>
            <CardDescription>
              {t('dashboard.trends.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {semesterTrends.length > 0 ? (
              <div className="space-y-4">
                {semesterTrends.map((trend, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">{trend.semester}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('dashboard.trends.courses.count', { count: trend.courseCount })}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {trend.average}
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, trend.average / 100 * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                {t('dashboard.trends.no.data')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* 课程类型分布 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.distribution.title')}</CardTitle>
          <CardDescription>
            {t('dashboard.distribution.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {courseTypeStats.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courseTypeStats.map((type, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">{type.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('dashboard.distribution.courses.count', { count: type.count })}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {type.averageScore}
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, type.averageScore / 100 * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-end text-xs text-muted-foreground">
                    <span>{t('dashboard.distribution.average')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {t('dashboard.distribution.no.data')}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 免责声明 */}
      <div className="text-xs text-muted-foreground text-center p-4 border-t">
        {t('disclaimer.data.accuracy')}
      </div>
    </div>
  )
}