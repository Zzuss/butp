'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface PagePDFExportProps {
  pageTitle?: string
  fileName?: string
  className?: string
  children?: React.ReactNode
}

export function PagePDFExport({ 
  pageTitle = '页面导出',
  fileName,
  className = '',
  children 
}: PagePDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const generatePDF = async () => {
    if (!contentRef.current) return

    setIsGenerating(true)
    try {
      // 使用html2canvas捕获页面内容
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // 提高清晰度
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: contentRef.current.scrollWidth,
        height: contentRef.current.scrollHeight,
      })

      // 创建PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      // 计算图片在PDF中的尺寸
      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // 如果内容超过一页，分页处理
      let heightLeft = imgHeight
      let position = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      // 下载PDF
      const defaultFileName = fileName || `${pageTitle}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(defaultFileName)
      
    } catch (error) {
      console.error('PDF生成失败:', error)
      alert('PDF生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className={className}>
      {/* 导出按钮 */}
      <div className="mb-4 flex justify-end">
        <Button
          onClick={generatePDF}
          disabled={isGenerating}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Download className="h-4 w-4" />
          {isGenerating ? '生成中...' : '导出PDF'}
        </Button>
      </div>

      {/* 页面内容容器 */}
      <div ref={contentRef} className="bg-white p-6 rounded-lg shadow-sm">
        {/* 页面标题 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-2">
            生成时间：{new Date().toLocaleString('zh-CN')}
          </p>
        </div>

        {/* 页面内容 */}
        <div className="space-y-4">
          {children}
        </div>

        {/* 页脚 */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
          BuTP学生管理系统 | 页面导出
        </div>
      </div>
    </div>
  )
}

// 简化的导出按钮组件，用于现有页面
export function ExportButton({ 
  pageTitle = '页面导出',
  fileName,
  contentSelector = 'main' // 默认选择main元素
}: {
  pageTitle?: string
  fileName?: string
  contentSelector?: string
}) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDF = async () => {
    setIsGenerating(true)
    try {
      // 查找要导出的内容
      const contentElement = document.querySelector(contentSelector) as HTMLElement
      if (!contentElement) {
        alert('未找到要导出的内容')
        return
      }

      // 使用html2canvas捕获内容
      const canvas = await html2canvas(contentElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: contentElement.scrollWidth,
        height: contentElement.scrollHeight,
      })

      // 创建PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      let heightLeft = imgHeight
      let position = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      // 下载PDF
      const defaultFileName = fileName || `${pageTitle}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(defaultFileName)
      
    } catch (error) {
      console.error('PDF生成失败:', error)
      alert('PDF生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      onClick={generatePDF}
      disabled={isGenerating}
      className="flex items-center gap-2"
      variant="outline"
      size="sm"
    >
      <Download className="h-4 w-4" />
      {isGenerating ? '生成中...' : '导出PDF'}
    </Button>
  )
} 