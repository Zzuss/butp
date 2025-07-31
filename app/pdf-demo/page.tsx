'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SimplePDFExport } from '@/components/pdf/SimplePDFExport'
import { FileText, Download, Eye } from 'lucide-react'
import dynamic from 'next/dynamic'

// 动态导入PDF组件，避免SSR问题
const ChinesePDFPreview = dynamic(
  () => import('@/components/pdf/ChinesePDF').then(mod => ({ default: mod.ChinesePDFPreview })),
  { ssr: false }
)

const ChinesePDFDownload = dynamic(
  () => import('@/components/pdf/ChinesePDF').then(mod => ({ default: mod.ChinesePDFDownload })),
  { ssr: false }
)

// 模拟学生数据
const mockStudent = {
  userId: '2021211001',
  name: '张三',
  userHash: 'a97af3ae898a3d3e2c2c8aecd9f49fc0a0474e813c218f3891016ac0466fcb55',
  major: '电子信息工程',
  year: '2021级'
}

// 模拟课程成绩数据
const mockCourseScores = [
  { courseName: '高等数学A(上)', score: 85, semester: 1, credit: 4 },
  { courseName: '线性代数', score: 92, semester: 1, credit: 3 },
  { courseName: '程序设计基础', score: 88, semester: 2, credit: 3 },
  { courseName: '大学物理D（上）', score: 78, semester: 2, credit: 4 },
  { courseName: '综合英语（上）', score: 90, semester: 1, credit: 2 },
  { courseName: '思想道德与法治', score: 85, semester: 1, credit: 2 },
]

export default function PDFDemoPage() {
  const [showPreview, setShowPreview] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF功能演示</h1>
        <p className="text-gray-600">基于React-PDF的学生成绩报告生成</p>
      </div>

      {/* 学生信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            学生信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">姓名</label>
              <p className="text-lg">{mockStudent.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">学号</label>
              <p className="text-lg">{mockStudent.userId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">专业</label>
              <p className="text-lg">{mockStudent.major}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">年级</label>
              <p className="text-lg">{mockStudent.year}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF操作按钮 */}
      <Card>
        <CardHeader>
          <CardTitle>PDF操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? '隐藏预览' : '预览PDF'}
            </Button>
            
            {isClient && (
              <ChinesePDFDownload student={mockStudent} courseScores={mockCourseScores} />
            )}
            <SimplePDFExport student={mockStudent} courseScores={mockCourseScores} />
          </div>
        </CardContent>
      </Card>

      {/* PDF预览区域 */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>PDF预览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              {isClient && (
                <ChinesePDFPreview student={mockStudent} courseScores={mockCourseScores} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 功能说明 */}
      <Card>
        <CardHeader>
          <CardTitle>功能说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">React-PDF 特性</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>✅ 浏览器端PDF生成，无需服务器</li>
                <li>✅ 支持中文内容（需要配置字体）</li>
                <li>✅ 灵活的布局和样式控制</li>
                <li>✅ 支持表格、图片、链接等元素</li>
                <li>✅ 实时预览和下载功能</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">使用场景</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>📄 学生成绩报告单</li>
                <li>📄 课程表导出</li>
                <li>📄 学习计划文档</li>
                <li>📄 数据分析报告</li>
                <li>📄 证书和证明文件</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 