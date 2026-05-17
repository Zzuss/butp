"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BarChart3, BookOpen, GraduationCap, PercentCircle, Download } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NotificationStack } from '@/components/ui/notification-modal'

// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboard } from '@/contexts/dashboard-context'
import { useLanguage } from '@/contexts/language-context'

// 导入图表组件
import { CourseStatsChart } from '@/components/ui/chart'
// ProxyHealthCheck removed per request

// 通知接口定义
interface SystemNotification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: number;
  image_url?: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const {
    stats,
    subjectGrades,
    courseTypeStats,
    semesterTrends,
    studentInfo,
    isLoading,
    cachedUserHash,
    loadDashboardIfNeeded,
  } = useDashboard()
  const { t } = useLanguage()
  const router = useRouter()
  
  // 通知相关状态
  const [notifications, setNotifications] = useState<SystemNotification[]>([])
  const [notificationLoading, setNotificationLoading] = useState(false)

  // 获取未读通知
  const fetchUnreadNotifications = async (userId: string) => {
    setNotificationLoading(true)
    try {
      const response = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('获取通知失败:', error)
    } finally {
      setNotificationLoading(false)
    }
  }

  // 标记通知为已读
  const markNotificationAsRead = async (notificationId: string) => {
    if (!user?.userId) return
    
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.userId,
          notificationId: notificationId
        })
      })

      if (response.ok) {
        // 从未读通知中移除该通知
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
    } catch (error) {
      console.error('标记通知已读失败:', error)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user?.isLoggedIn) return
    loadDashboardIfNeeded(user)
  }, [user, authLoading, loadDashboardIfNeeded])

  useEffect(() => {
    if (authLoading) return
    if (!user?.isLoggedIn) return
    fetchUnreadNotifications(user.userId)
  }, [user, authLoading])
  
  const isDataLoading =
    authLoading ||
    isLoading ||
    (!!user?.isLoggedIn && cachedUserHash !== user.userHash)
  const loadingLabel = t('dashboard.data.loading')

  // 如果未登录，显示登录提示
  if (!authLoading && !user?.isLoggedIn) {
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
  
  return (
    <>
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {isDataLoading && !studentInfo
              ? loadingLabel
              : (() => {
                  const studentNumber = typeof (user as any)?.studentNumber === 'string' 
                    ? (user as any).studentNumber 
                    : (user?.userId || '').toString();
                  const trimmedStudentNumber = studentNumber.toString().trim();
                  const year = parseInt(trimmedStudentNumber.substring(0, 4));
                  const displayYear = !isNaN(year) && year >= 2018 && year <= 2050 ? year : null;
                  
                  return studentInfo 
                    ? `${displayYear || studentInfo.year}${studentInfo.major}-${user?.userId || ''}`
                    : t('dashboard.description', { name: user?.name || '' });
                })()}
          </p>
        </div>
        
        {/* Dashboard导出按钮 */}
        <div className="flex gap-2">
          {/* 导出测试按钮已移除 */}
        </div>
      </div>
      
      {/* 统计卡片 */}
      <div className="dashboard-content">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.stats.average')}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isDataLoading && !stats ? loadingLabel : (stats?.averageScore ?? 0)}</div>
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
            <div className="text-2xl font-bold">{isDataLoading && !stats ? loadingLabel : `${Math.round((stats?.passRate || 0) * 100)}%`}</div>
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
            <div className="text-2xl font-bold">{isDataLoading && !stats ? loadingLabel : (stats?.courseCount ?? 0)}</div>
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
            <div className="text-2xl font-bold">
              {isDataLoading && !stats
                ? loadingLabel
                : stats?.gpa !== undefined
                  ? stats.gpa.toFixed(2)
                  : '0.00'}
            </div>
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
                    {/* <span>{t('dashboard.subjects.average')}: {subject.average}</span> */}
                  </div>
                </div>
              ))}
            </div>
          ) : isDataLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              {loadingLabel}
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
            {isDataLoading && !stats ? (
              <div className="py-8 text-center text-muted-foreground">
                {loadingLabel}
              </div>
            ) : stats ? (
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
            ) : null}
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
            ) : isDataLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                {loadingLabel}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                {t('dashboard.trends.no.data')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
          ) : isDataLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              {loadingLabel}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {t('dashboard.distribution.no.data')}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* PDF代理服务状态检查（已移除） */}
      
      {/* 免责声明 */}
      <div className="text-xs text-muted-foreground text-center p-4 border-t">
        {t('disclaimer.data.accuracy')}
      </div>
    </div>
    
    {/* 系统通知弹窗 */}
    {notifications.length > 0 && (
      <NotificationStack
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
      />
    )}
    </>
  )
}