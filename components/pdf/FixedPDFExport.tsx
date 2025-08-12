'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface FixedPDFExportProps {
  pageTitle?: string
  fileName?: string
  contentSelector?: string
  className?: string
  buttonSize?: 'sm' | 'default' | 'lg'
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost'
}

export function FixedPDFExport({ 
  pageTitle = '页面导出',
  fileName,
  contentSelector = '.dashboard-content',
  className = '',
  buttonSize = 'sm',
  buttonVariant = 'outline'
}: FixedPDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState('')

  const generatePDF = async () => {
    setIsGenerating(true)
    setProgress('正在查找内容...')
    
    try {
      // 查找要导出的内容元素
      let contentElement: HTMLElement | null = null
      
      // 尝试多个选择器
      const selectors = [
        contentSelector,
        '.dashboard-content',
        '.analysis-content', 
        '.grades-content',
        'main',
        '[role="main"]',
        '.container',
        'body > div'
      ]
      
      for (const selector of selectors) {
        contentElement = document.querySelector(selector) as HTMLElement
        if (contentElement && contentElement.children.length > 0) {
          console.log('找到内容元素:', selector, contentElement)
          break
        }
      }
      
      if (!contentElement) {
        alert('未找到要导出的内容，请确保页面已完全加载')
        return
      }

      setProgress('正在准备内容...')
      
      // 等待页面完全渲染
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 检查内容元素的实际尺寸
      const rect = contentElement.getBoundingClientRect()
      const scrollWidth = contentElement.scrollWidth
      const scrollHeight = contentElement.scrollHeight
      
      console.log('内容元素信息:', {
        selector: contentSelector,
        element: contentElement,
        rect,
        scrollWidth,
        scrollHeight,
        children: contentElement.children.length,
        textContent: contentElement.textContent?.substring(0, 100)
      })
      
      if (scrollHeight < 50 || scrollWidth < 50) {
        alert('内容区域太小，可能没有找到正确的内容')
        return
      }

      setProgress('正在生成图像...')

      // 滚动到顶部，确保内容可见
      window.scrollTo(0, 0)
      await new Promise(resolve => setTimeout(resolve, 500))

      // 使用html2canvas生成图像
      const canvas = await html2canvas(contentElement, {
        scale: 1.5, // 降低分辨率，避免内存问题
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: scrollWidth,
        height: scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        logging: true, // 开启日志
        onclone: (clonedDoc, element) => {
          console.log('克隆文档:', clonedDoc, element)
          
          // 确保克隆的元素可见
          const clonedElement = element as HTMLElement
          clonedElement.style.display = 'block'
          clonedElement.style.visibility = 'visible'
          clonedElement.style.opacity = '1'
          clonedElement.style.position = 'relative'
          clonedElement.style.left = '0'
          clonedElement.style.top = '0'
          
          // 处理所有子元素
          const allElements = clonedElement.querySelectorAll('*')
          allElements.forEach(el => {
            if (el instanceof HTMLElement) {
              el.style.display = el.style.display === 'none' ? 'block' : el.style.display
              el.style.visibility = 'visible'
              el.style.opacity = '1'
              
              // 移除可能影响渲染的样式
              el.style.transform = 'none'
              el.style.filter = 'none'
              
              // 确保文本可见
              if (el.style.color === 'transparent' || el.style.color === '') {
                el.style.color = '#000000'
              }
            }
          })
        }
      })

      console.log('Canvas生成完成:', { 
        width: canvas.width, 
        height: canvas.height,
        dataLength: canvas.toDataURL('image/png').length
      })

      if (canvas.width === 0 || canvas.height === 0) {
        alert('生成的图像为空，请检查页面内容')
        return
      }

      setProgress('正在创建PDF...')

      // 创建PDF
      const imgData = canvas.toDataURL('image/png', 0.8) // 降低质量，减小文件大小
      
      // 检查图像数据
      if (imgData.length < 1000) {
        alert('图像数据异常，请重试')
        return
      }

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      // 设置边距
      const margin = 10
      const contentWidth = pdfWidth - (margin * 2)
      const contentHeight = pdfHeight - (margin * 2)
      
      // 计算图片缩放比例
      const imgWidth = contentWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      console.log('PDF尺寸计算:', { 
        pdfWidth, 
        pdfHeight, 
        imgWidth, 
        imgHeight,
        canvasSize: { width: canvas.width, height: canvas.height }
      })

      // 添加标题
      pdf.setFontSize(16)
      pdf.setTextColor(0, 0, 0)
      
      // 使用内置字体避免中文乱码
      try {
        pdf.text(pageTitle, pdfWidth / 2, margin + 5, { align: 'center' })
      } catch (e) {
        console.warn('无法添加中文标题，使用英文:', e)
        pdf.text('Report', pdfWidth / 2, margin + 5, { align: 'center' })
      }
      
      // 添加生成时间（英文）
      pdf.setFontSize(8)
      const dateStr = new Date().toLocaleString('en-US')
      pdf.text(`Generated: ${dateStr}`, pdfWidth / 2, margin + 12, { align: 'center' })

      // 分页处理
      let remainingHeight = imgHeight
      let position = margin + 20 // 为标题留出空间
      let pageCount = 1
      
      // 第一页
      const firstPageHeight = Math.min(imgHeight, contentHeight - 20)
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, firstPageHeight)
      remainingHeight -= firstPageHeight
      
      // 后续页面
      while (remainingHeight > 0) {
        pdf.addPage()
        pageCount++
        
        const currentPageHeight = Math.min(remainingHeight, contentHeight)
        const sourceY = imgHeight - remainingHeight
        
        // 创建当前页的图像片段
        const pageCanvas = document.createElement('canvas')
        const pageCtx = pageCanvas.getContext('2d')!
        
        pageCanvas.width = canvas.width
        pageCanvas.height = (currentPageHeight * canvas.width) / imgWidth
        
        pageCtx.drawImage(
          canvas,
          0, (sourceY * canvas.width) / imgWidth,
          canvas.width, pageCanvas.height,
          0, 0,
          canvas.width, pageCanvas.height
        )
        
        const pageImgData = pageCanvas.toDataURL('image/png', 0.8)
        pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, currentPageHeight)
        
        remainingHeight -= currentPageHeight
      }

      // 添加页码
      for (let i = 1; i <= pageCount; i++) {
        if (i > 1) pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(128, 128, 128)
        pdf.text(`Page ${i} of ${pageCount}`, pdfWidth - margin - 20, pdfHeight - 5)
      }

      // 下载PDF
      const defaultFileName = fileName || `${pageTitle.replace(/[^\w\s-]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(defaultFileName)
      
      setProgress(`PDF生成完成！共 ${pageCount} 页`)
      
      setTimeout(() => {
        setProgress('')
      }, 3000)
      
    } catch (error) {
      console.error('PDF生成失败:', error)
      alert(`PDF生成失败：${error instanceof Error ? error.message : '未知错误'}`)
      setProgress('生成失败')
      setTimeout(() => {
        setProgress('')
      }, 3000)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className={className}>
      <Button
        onClick={generatePDF}
        disabled={isGenerating}
        className="flex items-center gap-2"
        variant={buttonVariant}
        size={buttonSize}
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span className="text-xs">{progress || '生成中...'}</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            导出PDF
          </>
        )}
      </Button>
      
      {/* 进度提示 */}
      {progress && (
        <div className="mt-2 text-xs text-muted-foreground">
          {progress}
        </div>
      )}
    </div>
  )
} 