"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardStats, getSubjectGrades, getProgressData, getCourseCategories } from "@/lib/dashboard-data"
import { StudentSelector } from "@/components/student-selector"
import { type Student } from "@/lib/student-data"

interface DashboardData {
  stats: Awaited<ReturnType<typeof getDashboardStats>>
  subjectGrades: Awaited<ReturnType<typeof getSubjectGrades>>
  progressData: Awaited<ReturnType<typeof getProgressData>>
  categories: Awaited<ReturnType<typeof getCourseCategories>>
}

export default function Dashboard() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedStudent) {
      loadDashboardData(selectedStudent.SNH)
    }
  }, [selectedStudent])

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

  if (!selectedStudent) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">数据总览</h1>
          <p className="text-muted-foreground">查看学生的学习数据和表现统计</p>
        </div>
        <StudentSelector 
          onStudentSelect={setSelectedStudent}
          selectedStudent={selectedStudent}
        />
      </div>
    )
  }

  if (loading || !dashboardData) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">数据总览</h1>
          <p className="text-muted-foreground">正在加载 {selectedStudent.displayName} 的数据...</p>
        </div>
        <StudentSelector 
          onStudentSelect={setSelectedStudent}
          selectedStudent={selectedStudent}
        />
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">数据总览</h1>
        <p className="text-muted-foreground">查看 {selectedStudent.displayName} 的学习数据和表现统计</p>
      </div>

      <div className="mb-6">
        <StudentSelector 
          onStudentSelect={setSelectedStudent}
          selectedStudent={selectedStudent}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均分数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageGrade}</div>
            <p className="text-xs text-muted-foreground">
              总体平均成绩
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">通过率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              课程通过率
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已修课程</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              总课程数量
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.gpaPoints}</div>
            <p className="text-xs text-muted-foreground">
              学分绩点
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>各科成绩</CardTitle>
            <CardDescription>最近课程成绩分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subjectGrades.length > 0 ? subjectGrades.map((item) => (
                <div key={item.subject} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.subject}</span>
                    <span className="text-xs text-muted-foreground">等级: {item.grade}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${item.score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold w-8">{item.score}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-8">
                  暂无成绩数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>课程统计</CardTitle>
            <CardDescription>课程通过情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attendanceData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-lg font-semibold">{item.value}%</span>
                </div>
              ))}
              <div className="mt-6 text-center">
                <div className="text-3xl font-bold text-green-600">{attendanceRate}%</div>
                <div className="text-sm text-muted-foreground">课程通过率</div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-sm text-muted-foreground">
                  已通过 {stats.completedCourses} / 总共 {stats.totalCourses} 门课程
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>学期成绩趋势</CardTitle>
            <CardDescription>各学期平均成绩变化趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {progressData.length > 0 ? progressData.map((item, index) => (
                <div key={item.semester} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex flex-col">
                    <span className="font-medium">{item.semester}</span>
                    <span className="text-xs text-muted-foreground">{item.totalCourses} 门课程</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${(item.averageScore / 100) * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-semibold w-12">{item.averageScore}</span>
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
                <div className="text-center text-muted-foreground py-8">
                  暂无学期数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>课程类型分布</CardTitle>
            <CardDescription>不同类型课程的成绩表现</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.length > 0 ? categories.map((category) => (
                <div key={category.category} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{category.category}</h4>
                    <span className="text-sm text-muted-foreground">{category.count} 门</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{category.averageGrade}</div>
                  <div className="text-sm text-muted-foreground">平均分</div>
                </div>
              )) : (
                <div className="col-span-full text-center text-muted-foreground py-8">
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