'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'

interface StudentData {
  userId: string
  name: string
  userHash: string
  major?: string
  year?: string
}

interface CourseScore {
  courseName: string
  score: number | null
  semester?: number
  credit?: number
}

// 简单的PDF生成函数
export function generateSimplePDF(student: StudentData, courseScores: CourseScore[]) {
  // 创建PDF内容
  const pdfContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${student.name} - 学生成绩报告</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; font-size: 24px; margin-bottom: 30px; }
        .info { margin-bottom: 20px; }
        .info-row { margin: 10px 0; }
        .label { font-weight: bold; display: inline-block; width: 80px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">学生成绩报告单</div>
      
      <div class="info">
        <div class="info-row"><span class="label">姓名：</span>${student.name}</div>
        <div class="info-row"><span class="label">学号：</span>${student.userId}</div>
        ${student.major ? `<div class="info-row"><span class="label">专业：</span>${student.major}</div>` : ''}
        ${student.year ? `<div class="info-row"><span class="label">年级：</span>${student.year}</div>` : ''}
      </div>
      
      ${courseScores.length > 0 ? `
        <h3>课程成绩</h3>
        <table>
          <thead>
            <tr>
              <th>课程名称</th>
              <th>成绩</th>
              <th>学期</th>
              <th>学分</th>
            </tr>
          </thead>
          <tbody>
            ${courseScores.map(course => `
              <tr>
                <td>${course.courseName}</td>
                <td>${course.score !== null ? course.score : '未录入'}</td>
                <td>${course.semester || '-'}</td>
                <td>${course.credit || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      
      <div class="footer">
        生成时间：${new Date().toLocaleString('zh-CN')} | BuTP学生管理系统
      </div>
    </body>
    </html>
  `

  // 创建Blob
  const blob = new Blob([pdfContent], { type: 'text/html' })
  
  // 创建下载链接
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${student.name}_成绩报告_${new Date().toISOString().split('T')[0]}.html`
  
  // 触发下载
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // 清理URL
  URL.revokeObjectURL(url)
}

// 导出组件
export function SimplePDFExport({ 
  student, 
  courseScores 
}: { 
  student: StudentData
  courseScores: CourseScore[]
}) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleExport = async () => {
    setIsGenerating(true)
    try {
      generateSimplePDF(student, courseScores)
    } catch (error) {
      console.error('PDF生成失败:', error)
      alert('PDF生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isGenerating}
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      {isGenerating ? '生成中...' : '导出报告'}
    </Button>
  )
} 