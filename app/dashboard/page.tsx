"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardStats, getSubjectGrades, getProgressData, getCourseCategories } from "@/lib/dashboard-data"
import { useSimpleAuth } from "@/contexts/simple-auth-context"
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
          <h1 className="text-3xl font-bold">数据总览</h1>
          <p className="text-muted-foreground">请先登录查看学习数据</p>
        </div>
      </div>
    )
  }

  if (loading || !dashboardData) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">数据总览</h1>
          <p className="text-muted-foreground">正在加载 {currentStudent.name} 的数据...</p>
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
    { name: '通过', value: attendanceRate, color: '#10b981' },
    { name: '未通过', value: 100 - attendanceRate, color: '#ef4444' },
  ];
  
  return (
    <div className="p-2 sm:p-4 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">数据总览</h1>
        <p className="text-sm md:text-base text-muted-foreground">查看 {currentStudent.name} 的学习数据和表现统计</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4 mb-4 md:mb-6 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">平均分数</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2">
            <div className="text-xl md:text-2xl font-bold">{stats.averageGrade}</div>
            <p className="text-xs text-muted-foreground">
              总体平均成绩
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">通过率</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2">
            <div className="text-xl md:text-2xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              课程通过率
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">已修课程</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2">
            <div className="text-xl md:text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              总课程数量
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 px-3 md:px-6">
            <CardTitle className="text-xs md:text-sm font-medium">GPA</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-2">
            <div className="text-xl md:text-2xl font-bold">{stats.gpaPoints}</div>
            <p className="text-xs text-muted-foreground">
              学分绩点
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between px-3 md:px-6 py-3 md:py-4">
            <div>
              <CardTitle className="text-base md:text-lg">各科成绩</CardTitle>
              <CardDescription className="text-xs md:text-sm">最近课程成绩分布</CardDescription>
            </div>
            <Link 
              href="/grades" 
              className="px-2 py-1 md:px-3 md:py-1.5 bg-blue-600 text-white text-xs md:text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              查看更多
            </Link>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-3 md:py-4">
            <div className="space-y-3 md:space-y-4">
              {subjectGrades.length > 0 ? subjectGrades.map((item) => (
                <div key={item.subject} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs md:text-sm font-medium">{item.subject}</span>
                    <span className="text-xs text-muted-foreground">等级: {item.grade}</span>
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
            <CardTitle className="text-base md:text-lg">课程统计</CardTitle>
            <CardDescription className="text-xs md:text-sm">课程通过情况</CardDescription>
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
                <div className="text-xs md:text-sm text-muted-foreground">课程通过率</div>
              </div>
              <div className="mt-3 md:mt-4 text-center">
                <div className="text-xs md:text-sm text-muted-foreground">
                  已通过 {stats.completedCourses} / 总共 {stats.totalCourses} 门课程
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader className="px-3 md:px-6 py-3 md:py-4">
            <CardTitle className="text-base md:text-lg">学期成绩趋势</CardTitle>
            <CardDescription className="text-xs md:text-sm">各学期平均成绩变化趋势</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-3 md:py-4">
            <div className="space-y-3">
              {progressData.length > 0 ? progressData.map((item, index) => (
                <div key={item.semester} className="flex items-center justify-between p-2 md:p-3 border rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-xs md:text-sm font-medium">{item.semester}</span>
                    <span className="text-xs text-muted-foreground">{item.totalCourses} 门课程</span>
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
            <CardTitle className="text-base md:text-lg">课程类型分布</CardTitle>
            <CardDescription className="text-xs md:text-sm">不同类型课程的成绩表现</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 py-3 md:py-4">
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
              {categories.length > 0 ? categories.map((category) => (
                <div key={category.category} className="p-3 md:p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-1 md:mb-2">
                    <h4 className="text-xs md:text-sm font-medium">{category.category}</h4>
                    <span className="text-xs md:text-sm text-muted-foreground">{category.count} 门</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-blue-600">{category.averageGrade}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">平均分</div>
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