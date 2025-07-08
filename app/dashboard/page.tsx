"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardStats, getSubjectGrades, getProgressData, getCourseCategories } from "@/lib/dashboard-data"
import { useSimpleAuth } from "@/contexts/simple-auth-context"
import { useTranslations } from 'next-intl'
import { TodoList } from '@/components/ui/todo-list'
import Link from 'next/link'

interface DashboardData {
  stats: Awaited<ReturnType<typeof getDashboardStats>>
  subjectGrades: Awaited<ReturnType<typeof getSubjectGrades>>
  progressData: Awaited<ReturnType<typeof getProgressData>>
  categories: Awaited<ReturnType<typeof getCourseCategories>>
}

export default function Dashboard() {
  const { currentStudent } = useSimpleAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const t = useTranslations('dashboard')

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
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description', { name: '' })}</p>
        </div>
      </div>
    )
  }

  if (loading || !dashboardData) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description', { name: currentStudent.name })}</p>
        </div>
        <div className="mt-6 flex items-center justify-center h-32">
          <div className="text-muted-foreground">数据加载中...</div>
        </div>
      </div>
    )
  }

  const { stats, subjectGrades, progressData, categories } = dashboardData
  
  const attendanceRate = stats.completedCourses > 0 
    ? Math.round((stats.completedCourses / stats.totalCourses) * 100)
    : 0

  const attendanceData = [
    { name: t('passed'), value: attendanceRate, color: '#10b981' },
    { name: t('notPassed'), value: 100 - attendanceRate, color: '#ef4444' },
  ];
  
  return (
    <div className="p-2 sm:p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">{t('title')}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t('description', { name: currentStudent.name })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4 mb-4 md:mb-6 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">{t('averageScore')}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2">
            <div className="text-xl md:text-2xl font-bold">{stats.averageGrade}</div>
            <p className="text-xs text-muted-foreground">
              {t('overallAverage')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">{t('passRate')}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2">
            <div className="text-xl md:text-2xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {t('coursePassRate')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">{t('completedCourses')}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2">
            <div className="text-xl md:text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {t('totalCourses')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">{t('gpa')}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2">
            <div className="text-xl md:text-2xl font-bold">{stats.gpaPoints}</div>
            <p className="text-xs text-muted-foreground">
              {t('creditPoints')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between px-3 md:px-6 py-3 md:py-4">
            <div>
              <CardTitle className="text-base md:text-lg">{t('subjectGrades')}</CardTitle>
              <CardDescription className="text-xs md:text-sm">{t('recentGrades')}</CardDescription>
            </div>
            <Link 
              href="/grades" 
              className="px-2 py-1 md:px-3 md:py-1.5 bg-blue-600 text-white text-xs md:text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('viewMore')}
            </Link>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-3 md:py-4">
            <div className="space-y-3 md:space-y-4">
              {subjectGrades.length > 0 ? subjectGrades.map((item) => (
                <div key={item.subject} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs md:text-sm font-medium">{item.subject}</span>
                    <span className="text-xs text-muted-foreground">{t('level')}: {item.grade}</span>
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
                  暂无成绩数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full md:col-span-1">
          <CardHeader className="px-3 md:px-6 py-3 md:py-4">
            <CardTitle className="text-base md:text-lg">{t('courseStatistics')}</CardTitle>
            <CardDescription className="text-xs md:text-sm">{t('coursePassStatus')}</CardDescription>
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
                <div className="text-xs md:text-sm text-muted-foreground">{t('coursePassRate')}</div>
              </div>
              <div className="mt-3 md:mt-4 text-center">
                <div className="text-xs md:text-sm text-muted-foreground">
                  {t('passed')} {stats.completedCourses} / {t('totalCourses')} {stats.totalCourses} {t('courses')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="col-span-full md:col-span-2">
          <TodoList />
        </div>

        <Card className="col-span-full">
          <CardHeader className="px-3 md:px-6 py-3 md:py-4">
            <CardTitle className="text-base md:text-lg">{t('semesterTrends')}</CardTitle>
            <CardDescription className="text-xs md:text-sm">{t('semesterAverageScores')}</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-3 md:py-4">
            <div className="space-y-3">
              {progressData.length > 0 ? progressData.map((item, index) => (
                <div key={item.semester} className="flex items-center justify-between p-2 md:p-3 border rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-xs md:text-sm font-medium">{item.semester}</span>
                    <span className="text-xs text-muted-foreground">{item.totalCourses} {t('courses')}</span>
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
                  暂无学期数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader className="px-3 md:px-6 py-3 md:py-4">
            <CardTitle className="text-base md:text-lg">{t('courseTypeDistribution')}</CardTitle>
            <CardDescription className="text-xs md:text-sm">{t('differentTypesPerformance')}</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-3 md:py-4">
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
              {categories.length > 0 ? categories.map((category) => (
                <div key={category.category} className="p-3 md:p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-1 md:mb-2">
                    <h4 className="text-xs md:text-sm font-medium">{category.category}</h4>
                    <span className="text-xs md:text-sm text-muted-foreground">{category.count} {t('courses')}</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-blue-600">{category.averageGrade}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">{t('average')}</div>
                </div>
              )) : (
                <div className="col-span-full text-center text-muted-foreground py-6 md:py-8">
                  暂无课程类型数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}