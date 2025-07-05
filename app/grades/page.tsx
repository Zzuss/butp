"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSubjectGrades } from "@/lib/dashboard-data"
import { useSimpleAuth } from "@/contexts/simple-auth-context"
import Link from 'next/link'

export default function AllGrades() {
  const { currentStudent } = useSimpleAuth()
  const [grades, setGrades] = useState<Awaited<ReturnType<typeof getSubjectGrades>>>([])
  const [loading, setLoading] = useState(false)
  const [selectedRow, setSelectedRow] = useState<number | null>(null)

  useEffect(() => {
    if (currentStudent) {
      loadGrades(currentStudent.id)
    }
  }, [currentStudent])

  async function loadGrades(studentId: string) {
    setLoading(true)
    try {
      // 获取所有成绩，不设置限制
      const allGrades = await getSubjectGrades(studentId, 999)
      // 按学分从高到低排序
      const sortedGrades = [...allGrades].sort((a, b) => b.credit - a.credit)
      setGrades(sortedGrades)
    } catch (error) {
      console.error('Failed to load grades data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (index: number) => {
    setSelectedRow(selectedRow === index ? null : index)
  }

  // 格式化学分为保留一位小数
  const formatCredit = (credit: number): string => {
    return credit.toFixed(1)
  }

  if (!currentStudent) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">成绩详情</h1>
          <p className="text-muted-foreground">请先登录查看学习数据</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">成绩详情</h1>
          <p className="text-muted-foreground">正在加载 {currentStudent.name} 的数据...</p>
        </div>
        <div className="mt-6 flex items-center justify-center h-32">
          <div className="text-muted-foreground">数据加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">成绩详情</h1>
          <p className="text-muted-foreground">{currentStudent.name} 的所有课程成绩</p>
        </div>
        <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          返回总览
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>所有课程成绩</CardTitle>
          <CardDescription>课程成绩详细列表（按学分从高到低排序）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-4 text-left">课程名称</th>
                  <th className="py-3 px-4 text-center">学分</th>
                  <th className="py-3 px-4 text-center">分数</th>
                </tr>
              </thead>
              <tbody>
                {grades.length > 0 ? grades.map((item, index) => (
                  <tr 
                    key={`${item.subject}-${index}`} 
                    className={`border-b hover:bg-gray-50 cursor-pointer ${selectedRow === index ? '!bg-blue-50' : ''}`}
                    onClick={() => handleRowClick(index)}
                  >
                    <td className="py-3 px-4">{item.subject}</td>
                    <td className="py-3 px-4 text-center">{formatCredit(item.credit)}</td>
                    <td className="py-3 px-4 text-center">{item.score}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      暂无成绩数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            共 {grades.length} 门课程
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 