"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardStats, getSubjectGrades, getProgressData, getCourseCategories } from "@/lib/dashboard-data"
import { useSimpleAuth } from "@/contexts/simple-auth-context"
import { useLanguage } from "@/contexts/language-context"
import Link from 'next/link'

interface DashboardData {
  stats: Awaited<ReturnType<typeof getDashboardStats>>
  subjectGrades: Awaited<ReturnType<typeof getSubjectGrades>>
  progressData: Awaited<ReturnType<typeof getProgressData>>
  categories: Awaited<ReturnType<typeof getCourseCategories>>
}

export default function Dashboard() {
  const { currentStudent } = useSimpleAuth()
  const { t } = useLanguage()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentStudent) {
      loadDashboardData(currentStudent.id)
    }
  }, [currentStudent])

  async function loadDashboardData(studentId: string) {
    setLoading(true)
    try {
      const [stats, subjectGrades, progressData, categories] = await Promise.all([
        getDashboardStats(studentId),
        getSubjectGrades(studentId),
        getProgressData(studentId),
        getCourseCategories(studentId)
      ])
      
      setDashboardData({ stats, subjectGrades, progressData, categories })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!currentStudent) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.login.required')}</p>
        </div>
      </div>
    )
  }

  if (loading || !dashboardData) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.loading').replace('{name}', currentStudent.name)}</p>
        </div>
        <div className="mt-6 flex items-center justify-center h-32">
          <div className="text-muted-foreground">{t('dashboard.loading.message')}</div>
        </div>
      </div>
    )
  }

  const { stats, subjectGrades, progressData, categories } = dashboardData
  
  const attendanceRate = stats.completedCourses > 0 
    ? Math.round((stats.completedCourses / stats.totalCourses) * 100)
    : 0

  const attendanceData = [
    { name: t('dashboard.course.stats.passed'), value: attendanceRate, color: '#10b981' },
    { name: t('dashboard.course.stats.failed'), value: 100 - attendanceRate, color: '#ef4444' },
  ];
  
  return (
    <div className="p-2 sm:p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-sm md:text-base text-muted-foreground">{t('dashboard.description').replace('{name}', currentStudent.name)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4 mb-4 md:mb-6 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">{t('dashboard.stats.average')}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2">
            <div className="text-xl md:text-2xl font-bold">{stats.averageGrade}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.average.desc')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">{t('dashboard.stats.pass.rate')}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2">
            <div className="text-xl md:text-2xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.pass.rate.desc')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">{t('dashboard.stats.courses')}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2">
            <div className="text-xl md:text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.courses.desc')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">{t('dashboard.stats.gpa')}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2">
            <div className="text-xl md:text-2xl font-bold">{stats.gpaPoints}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.stats.gpa.desc')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between px-3 md:px-6 py-3 md:py-4">
            <div>
              <CardTitle className="text-base md:text-lg">{t('dashboard.subjects.title')}</CardTitle>
              <CardDescription className="text-xs md:text-sm">{t('dashboard.subjects.description')}</CardDescription>
            </div>
            <Link 
              href="/grades" 
              className="px-2 py-1 md:px-3 md:py-1.5 bg-blue-600 text-white text-xs md:text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('dashboard.subjects.view.more')}
            </Link>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-3 md:py-4">
            <div className="space-y-3 md:space-y-4">
              {subjectGrades.length > 0 ? subjectGrades.map((item) => (
                <div key={item.subject} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs md:text-sm font-medium">{item.subject}</span>
                    <span className="text-xs text-muted-foreground">{t('dashboard.subjects.grade.level')}: {item.grade}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 md:w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${item.score}%` }}
                      ></div>
                    </div>
                    <span className="text-xs md:text-sm font-semibold w-6 md:w-8">{item.score}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-6 md:py-8">
                  {t('dashboard.subjects.no.data')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full md:col-span-1">
          <CardHeader className="px-3 md:px-6 py-3 md:py-4">
            <CardTitle className="text-base md:text-lg">{t('dashboard.course.stats.title')}</CardTitle>
            <CardDescription className="text-xs md:text-sm">{t('dashboard.course.stats.description')}</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-3 md:py-4">
            <div className="space-y-3 md:space-y-4">
              {attendanceData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 md:w-4 md:h-4 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-xs md:text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-base md:text-lg font-semibold">{item.value}%</span>
                </div>
              ))}
              <div className="mt-4 md:mt-6 text-center">
                <div className="text-2xl md:text-3xl font-bold text-green-600">{attendanceRate}%</div>
                <div className="text-xs md:text-sm text-muted-foreground">{t('dashboard.course.stats.pass.rate')}</div>
              </div>
              <div className="mt-3 md:mt-4 text-center">
                <div className="text-xs md:text-sm text-muted-foreground">
                  {t('dashboard.course.stats.summary').replace('{completed}', stats.completedCourses.toString()).replace('{total}', stats.totalCourses.toString())}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader className="px-3 md:px-6 py-3 md:py-4">
            <CardTitle className="text-base md:text-lg">{t('dashboard.trends.title')}</CardTitle>
            <CardDescription className="text-xs md:text-sm">{t('dashboard.trends.description')}</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-3 md:py-4">
            <div className="space-y-3">
              {progressData.length > 0 ? progressData.map((item, index) => (
                <div key={item.semester} className="flex items-center justify-between p-2 md:p-3 border rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-xs md:text-sm font-medium">{item.semester}</span>
                    <span className="text-xs text-muted-foreground">{t('dashboard.trends.courses.count').replace('{count}', item.totalCourses.toString())}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 md:w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(item.averageScore / 100) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs md:text-sm font-semibold w-8 md:w-12">{item.averageScore}</span>
                    {index > 0 && (
                      <span className={`text-xs ${
                        item.averageScore > progressData[index - 1].averageScore 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {item.averageScore > progressData[index - 1].averageScore ? '↗' : '↘'}
                      </span>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-6 md:py-8">
                  {t('dashboard.trends.no.data')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader className="px-3 md:px-6 py-3 md:py-4">
            <CardTitle className="text-base md:text-lg">{t('dashboard.distribution.title')}</CardTitle>
            <CardDescription className="text-xs md:text-sm">{t('dashboard.distribution.description')}</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-3 md:py-4">
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
              {categories.length > 0 ? categories.map((category) => (
                <div key={category.category} className="p-3 md:p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-1 md:mb-2">
                    <h4 className="text-xs md:text-sm font-medium">{category.category}</h4>
                    <span className="text-xs md:text-sm text-muted-foreground">{t('dashboard.distribution.courses.count').replace('{count}', category.count.toString())}</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-blue-600">{category.averageGrade}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">{t('dashboard.distribution.average')}</div>
                </div>
              )) : (
                <div className="col-span-full text-center text-muted-foreground py-6 md:py-8">
                  {t('dashboard.distribution.no.data')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 数据说明 */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-muted">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-foreground mb-1">{t('dashboard.data.disclaimer.title')}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('dashboard.data.disclaimer.content')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}