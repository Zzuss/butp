'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface SimplePDFExportProps {
  pageTitle?: string
  fileName?: string
  contentSelector?: string
  className?: string
}

export function SimplePDFExport({ 
  pageTitle = '页面导出',
  fileName,
  contentSelector = 'main',
  className = ''
}: SimplePDFExportProps) {
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

      console.log('开始生成PDF，内容元素:', contentElement)

      // 获取原始尺寸
      const originalWidth = contentElement.scrollWidth
      const originalHeight = contentElement.scrollHeight
      
      console.log('原始尺寸:', { width: originalWidth, height: originalHeight })

      // 创建临时容器
      const tempContainer = document.createElement('div')
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: ${originalWidth}px;
        background: white;
        padding: 20px;
        font-family: Arial, sans-serif;
        color: #000;
        overflow: visible;
        transform: none;
        box-sizing: border-box;
        line-height: 1.4;
      `
      
      // 克隆内容
      const clonedContent = contentElement.cloneNode(true) as HTMLElement
      
      // 递归应用样式，确保所有内容可见
      const applyStyles = (element: HTMLElement) => {
        // 基础样式
        element.style.fontFamily = 'Arial, sans-serif'
        element.style.color = '#000'
        element.style.backgroundColor = '#fff'
        element.style.lineHeight = '1.4'
        
        // 确保元素完全可见
        element.style.display = element.style.display === 'none' ? 'block' : element.style.display
        element.style.visibility = 'visible'
        element.style.opacity = '1'
        element.style.overflow = 'visible'
        element.style.maxHeight = 'none'
        element.style.height = 'auto'
        element.style.minHeight = 'auto'
        
        // 处理定位
        if (element.style.position === 'absolute' || element.style.position === 'fixed') {
          element.style.position = 'relative'
        }
        
        // 处理子元素
        Array.from(element.children).forEach(child => {
          if (child instanceof HTMLElement) {
            applyStyles(child)
          }
        })
      }
      
      applyStyles(clonedContent)
      tempContainer.appendChild(clonedContent)
      document.body.appendChild(tempContainer)

      // 等待DOM更新
      await new Promise(resolve => setTimeout(resolve, 300))

      // 获取实际高度
      const actualHeight = tempContainer.scrollHeight
      console.log('临时容器实际高度:', actualHeight)

      // 如果高度为0或太小，使用原始高度
      const finalHeight = actualHeight > 100 ? actualHeight : originalHeight
      console.log('最终使用高度:', finalHeight)

      // 使用html2canvas捕获完整内容
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: tempContainer.scrollWidth,
        height: finalHeight,
        logging: true,
        removeContainer: true,
        foreignObjectRendering: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // 确保克隆的文档中所有元素都可见
          const allElements = clonedDoc.querySelectorAll('*')
          allElements.forEach(el => {
            if (el instanceof HTMLElement) {
              el.style.display = el.style.display === 'none' ? 'block' : el.style.display
              el.style.visibility = 'visible'
              el.style.opacity = '1'
              el.style.overflow = 'visible'
              el.style.maxHeight = 'none'
              el.style.height = 'auto'
              el.style.minHeight = 'auto'
              
              if (el.style.position === 'absolute' || el.style.position === 'fixed') {
                el.style.position = 'relative'
              }
            }
          })
        }
      })

      console.log('Canvas生成完成:', { width: canvas.width, height: canvas.height })

      // 清理临时元素
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer)
      }

      // 创建PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      // 计算图片在PDF中的尺寸
      const margin = 10
      const imgWidth = pdfWidth - (margin * 2)
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      console.log('PDF尺寸计算:', { 
        pdfWidth, 
        pdfHeight, 
        imgWidth, 
        imgHeight, 
        totalPages: Math.ceil(imgHeight / (pdfHeight - margin * 2))
      })

      // 分页处理
      let heightLeft = imgHeight
      let position = 0
      let pageCount = 0
      
      // 添加第一页
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgWidth, imgHeight)
      pageCount++
      heightLeft -= (pdfHeight - margin * 2)
      
      // 添加后续页面
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, position + margin, imgWidth, imgHeight)
        pageCount++
        heightLeft -= (pdfHeight - margin * 2)
      }

      // 下载PDF
      const defaultFileName = fileName || `${pageTitle}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(defaultFileName)
      
      console.log(`PDF生成完成，共${pageCount}页`)
      
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
      className={`flex items-center gap-2 ${className}`}
      variant="outline"
      size="sm"
    >
      <Download className="h-4 w-4" />
      {isGenerating ? '生成中...' : '导出PDF'}
    </Button>
  )
} 