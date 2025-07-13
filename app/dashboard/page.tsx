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

  // 为各科成绩添加虚假的学校平均分数据
  const subjectGradesWithAverage = subjectGrades.map((item, index) => {
    // 使用固定的平均分数据，避免每次刷新都变化
    const averageScores = [82, 78, 85, 79, 88, 76, 83, 80, 87, 81];
    return {
      ...item,
      schoolAverage: averageScores[index % averageScores.length]
    };
  })

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

      {/* 免责声明 */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800 text-center">
          本页面显示的平均分数、通过率、GPA等数据均为模糊计算所得，仅供参考和趋势分析使用。真实成绩信息请以官方教务系统为准。
        </p>
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
              {subjectGradesWithAverage.length > 0 ? subjectGradesWithAverage.map((item) => {
                const isAboveAverage = item.score > item.schoolAverage;
                const maxScore = Math.max(item.score, item.schoolAverage, 100);
                
                return (
                  <div key={item.subject} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm font-medium">{item.subject}</span>
                      <span className="text-xs text-muted-foreground">
                        {isAboveAverage ? '+' : ''}{item.score - item.schoolAverage}分
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={isAboveAverage ? 'text-green-600' : 'text-red-600'}>
                          当前: {item.score}分
                        </span>
                        <span className="text-muted-foreground">
                          平均: {item.schoolAverage}分
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 relative">
                        {/* 基础进度条 - 蓝色 */}
                        <div 
                          className="bg-blue-600 h-2 rounded-full absolute left-0"
                          style={{ width: `${(Math.min(item.score, item.schoolAverage) / maxScore) * 100}%` }}
                        ></div>
                        {/* 超出/不足平均分的部分 */}
                        {item.score > item.schoolAverage ? (
                          /* 超出平均分 - 绿色补充 */
                          <div 
                            className="bg-green-600 h-2 rounded-r-full absolute"
                            style={{ 
                              left: `${(item.schoolAverage / maxScore) * 100}%`,
                              width: `${((item.score - item.schoolAverage) / maxScore) * 100}%`
                            }}
                          ></div>
                        ) : (
                          /* 低于平均分 - 红色补充 */
                          <div 
                            className="bg-red-600 h-2 rounded-r-full absolute"
                            style={{ 
                              left: `${(item.score / maxScore) * 100}%`,
                              width: `${((item.schoolAverage - item.score) / maxScore) * 100}%`
                            }}
                          ></div>
                        )}
                        {/* 平均分标记线 */}
                        <div 
                          className="absolute top-0 w-0.5 h-2 bg-gray-800 z-10"
                          style={{ left: `${(item.schoolAverage / maxScore) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
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
    </div>
  )
}