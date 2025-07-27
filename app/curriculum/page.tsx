"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useSimpleAuth } from "@/contexts/simple-auth-context"
import { useLanguage } from "@/contexts/language-context"

interface Course {
  id: number
  course_id: string
  course_name: string
  category: string
  credit: number
  total_hours: number
  theory_hours: number
  practice_hours: number
  semester: number
  required: string
  exam_type: string
  remarks: string
  major: string
  year: number
}

export default function CurriculumPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [studentMajor, setStudentMajor] = useState<string | null>(null)
  const { currentStudent } = useSimpleAuth()
  const { t } = useLanguage()
  const router = useRouter()

  // 获取学生专业
  const loadStudentMajor = async () => {
    if (!currentStudent?.id) return
    
    try {
      const response = await fetch('/api/student-major', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: currentStudent.id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setStudentMajor(data.major)
        return data.major
      }
    } catch (error) {
      console.error('Failed to load student major:', error)
    }
    return null
  }

  // 获取培养方案课程
  const loadCurriculum = async (major: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/curriculum', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          major: major
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses)
      } else {
        console.error('Failed to load curriculum')
        setCourses([])
      }
    } catch (error) {
      console.error('Failed to load curriculum:', error)
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  // 加载数据
  useEffect(() => {
    const initializeData = async () => {
      const major = await loadStudentMajor()
      if (major) {
        await loadCurriculum(major)
      }
    }
    
    if (currentStudent?.id) {
      initializeData()
    }
  }, [currentStudent?.id])

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <h1 className="text-3xl font-bold">培养方案</h1>
        <p className="text-muted-foreground">
          {studentMajor ? `${studentMajor}专业课程列表` : '加载中...'}
        </p>
      </div>

      {/* 课程表格 */}
      <Card>
        <CardHeader>
          <CardTitle>课程列表</CardTitle>
          <CardDescription>
            共 {courses.length} 门课程
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-muted-foreground">加载中...</div>
            </div>
          ) : courses.length > 0 ? (
            <div className="overflow-x-auto">
                                   <table className="w-full border-collapse border border-gray-200">
                       <thead>
                         <tr className="bg-gray-50">
                           <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学期</th>
                           <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">课程编号</th>
                           <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">课程名称</th>
                           <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">课程类型</th>
                           <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">学分</th>
                           <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium">备注</th>
                         </tr>
                       </thead>
                <tbody>
                                           {/* 暂时只展示前50条，后期可改回全部展示 */}
                         {courses.slice(0, 50).map((course, index) => (
                           <tr key={course.id || index} className="hover:bg-gray-50">
                             <td className="border border-gray-200 px-4 py-2 text-sm">{course.semester || '-'}</td>
                             <td className="border border-gray-200 px-4 py-2 text-sm font-mono">{course.course_id || '-'}</td>
                             <td className="border border-gray-200 px-4 py-2 text-sm">{course.course_name || '-'}</td>
                             <td className="border border-gray-200 px-4 py-2 text-sm">{course.category || '-'}</td>
                             <td className="border border-gray-200 px-4 py-2 text-sm">{course.credit || '-'}</td>
                             <td className="border border-gray-200 px-4 py-2 text-sm">{course.remarks || '-'}</td>
                           </tr>
                         ))}
                         {/* 原代码（展示全部）：
                         {courses.map((course, index) => (
                           <tr key={course.id || index} className="hover:bg-gray-50">
                             <td className="border border-gray-200 px-4 py-2 text-sm">{course.semester || '-'}</td>
                             <td className="border border-gray-200 px-4 py-2 text-sm font-mono">{course.course_id || '-'}</td>
                             <td className="border border-gray-200 px-4 py-2 text-sm">{course.course_name || '-'}</td>
                             <td className="border border-gray-200 px-4 py-2 text-sm">{course.category || '-'}</td>
                             <td className="border border-gray-200 px-4 py-2 text-sm">{course.credit || '-'}</td>
                             <td className="border border-gray-200 px-4 py-2 text-sm">{course.remarks || '-'}</td>
                           </tr>
                         ))}
                         */}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-muted-foreground">暂无课程数据</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 