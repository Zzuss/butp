'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface EnhancedPDFExportProps {
  pageTitle?: string
  fileName?: string
  contentSelector?: string
  className?: string
  buttonSize?: 'sm' | 'default' | 'lg'
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost'
  includeMetadata?: boolean
}

export function EnhancedPDFExport({ 
  pageTitle = '页面导出',
  fileName,
  contentSelector = '.dashboard-content, .analysis-content, main',
  className = '',
  buttonSize = 'sm',
  buttonVariant = 'outline',
  includeMetadata = true
}: EnhancedPDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState('')

  const generatePDF = async () => {
    setIsGenerating(true)
    setProgress('正在准备导出...')
    
    try {
      // 查找要导出的内容元素
      const selectors = contentSelector.split(',').map(s => s.trim())
      let contentElement: HTMLElement | null = null
      
      for (const selector of selectors) {
        contentElement = document.querySelector(selector) as HTMLElement
        if (contentElement) break
      }
      
      if (!contentElement) {
        // 如果找不到指定选择器，尝试查找主要内容区域
        contentElement = document.querySelector('main') as HTMLElement ||
                        document.querySelector('[role="main"]') as HTMLElement ||
                        document.querySelector('.container') as HTMLElement ||
                        document.querySelector('.content') as HTMLElement ||
                        document.body
      }

      if (!contentElement) {
        alert('未找到要导出的内容')
        return
      }

      setProgress('正在处理页面内容...')
      console.log('开始生成PDF，内容元素:', contentElement)

      // 创建临时容器用于PDF渲染
      const tempContainer = document.createElement('div')
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        background: white;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #000;
        line-height: 1.5;
        overflow: visible;
        box-sizing: border-box;
        transform: none;
        z-index: -1;
      `
      
      // 深度克隆内容
      const clonedContent = contentElement.cloneNode(true) as HTMLElement
      
      // 递归处理所有元素，确保PDF渲染正确
      const processElement = (element: HTMLElement) => {
        // 基础样式重置
        element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        element.style.color = '#000'
        element.style.lineHeight = '1.5'
        
        // 背景处理
        const computedStyle = window.getComputedStyle(element)
        const bgColor = computedStyle.backgroundColor
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          element.style.backgroundColor = bgColor
        } else {
          element.style.backgroundColor = 'white'
        }
        
        // 确保元素可见
        element.style.display = element.style.display === 'none' ? 'block' : (element.style.display || 'block')
        element.style.visibility = 'visible'
        element.style.opacity = '1'
        element.style.overflow = 'visible'
        element.style.maxHeight = 'none'
        element.style.height = 'auto'
        element.style.minHeight = 'auto'
        
        // 处理定位问题
        if (computedStyle.position === 'fixed' || computedStyle.position === 'absolute') {
          element.style.position = 'relative'
          element.style.top = 'auto'
          element.style.left = 'auto'
          element.style.right = 'auto'
          element.style.bottom = 'auto'
        }
        
        // 处理特殊元素
        const tagName = element.tagName.toLowerCase()
        
        // 图表和画布处理
        if (tagName === 'canvas') {
          const canvas = element as HTMLCanvasElement
          try {
            const dataURL = canvas.toDataURL('image/png')
            const img = document.createElement('img')
            img.src = dataURL
            img.style.width = canvas.style.width || `${canvas.width}px`
            img.style.height = canvas.style.height || `${canvas.height}px`
            img.style.maxWidth = '100%'
            element.parentNode?.replaceChild(img, element)
            return
          } catch (e) {
            console.warn('无法转换canvas:', e)
          }
        }
        
        // SVG处理
        if (tagName === 'svg') {
          element.style.width = element.style.width || '100%'
          element.style.height = element.style.height || 'auto'
          element.style.maxWidth = '100%'
        }
        
        // 表格处理
        if (tagName === 'table') {
          element.style.width = '100%'
          element.style.borderCollapse = 'collapse'
          element.style.marginBottom = '16px'
        }
        
        if (tagName === 'td' || tagName === 'th') {
          element.style.border = '1px solid #ddd'
          element.style.padding = '8px'
          element.style.textAlign = 'left'
        }
        
        // 卡片和容器处理
        if (element.classList.contains('card') || element.classList.contains('Card')) {
          element.style.border = '1px solid #e5e7eb'
          element.style.borderRadius = '8px'
          element.style.marginBottom = '16px'
          element.style.padding = '16px'
          element.style.backgroundColor = 'white'
        }
        
        // 移除可能影响PDF渲染的类和样式
        const problematicClasses = ['sticky', 'fixed', 'absolute', 'no-print']
        problematicClasses.forEach(cls => element.classList.remove(cls))
        
        // 处理子元素
        Array.from(element.children).forEach(child => {
          if (child instanceof HTMLElement) {
            processElement(child)
          }
        })
      }
      
      processElement(clonedContent)
      
      // 添加标题（如果需要）
      if (includeMetadata) {
        const titleElement = document.createElement('div')
        titleElement.innerHTML = `
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
            <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin: 0 0 10px 0;">${pageTitle}</h1>
            <p style="font-size: 14px; color: #6b7280; margin: 0;">生成时间：${new Date().toLocaleString('zh-CN')}</p>
          </div>
        `
        tempContainer.appendChild(titleElement)
      }
      
      tempContainer.appendChild(clonedContent)
      document.body.appendChild(tempContainer)

      // 等待DOM更新和样式应用
      await new Promise(resolve => setTimeout(resolve, 500))

      setProgress('正在生成图像...')
      
      // 获取实际内容高度
      const actualHeight = Math.max(
        tempContainer.scrollHeight,
        tempContainer.offsetHeight,
        tempContainer.clientHeight
      )
      
      console.log('内容尺寸:', {
        scrollWidth: tempContainer.scrollWidth,
        scrollHeight: tempContainer.scrollHeight,
        offsetHeight: tempContainer.offsetHeight,
        clientHeight: tempContainer.clientHeight,
        actualHeight
      })

      // 使用html2canvas生成高质量图像
      const canvas = await html2canvas(tempContainer, {
        scale: 2, // 高分辨率
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: tempContainer.scrollWidth,
        height: actualHeight,
        logging: false,
        imageTimeout: 0,
        removeContainer: false,
        foreignObjectRendering: true,
        onclone: (clonedDoc) => {
          // 确保克隆文档中的样式正确
          const clonedElements = clonedDoc.querySelectorAll('*')
          clonedElements.forEach(el => {
            if (el instanceof HTMLElement) {
              el.style.display = el.style.display === 'none' ? 'block' : el.style.display
              el.style.visibility = 'visible'
              el.style.opacity = '1'
              el.style.overflow = 'visible'
            }
          })
        }
      })

      console.log('Canvas生成完成:', { width: canvas.width, height: canvas.height })

      // 清理临时元素
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer)
      }

      setProgress('正在生成PDF...')

      // 创建PDF文档
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
      
      // 计算需要的页数
      const totalPages = Math.ceil(imgHeight / contentHeight)
      
      console.log('PDF分页信息:', { 
        pdfWidth, 
        pdfHeight, 
        imgWidth, 
        imgHeight, 
        contentHeight,
        totalPages
      })

      setProgress(`正在生成PDF (共${totalPages}页)...`)

      // 生成PDF页面
      let remainingHeight = imgHeight
      let currentY = 0
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage()
        }
        
        // 计算当前页面要显示的图像部分
        const sourceY = page * contentHeight * (canvas.height / imgHeight)
        const sourceHeight = Math.min(contentHeight * (canvas.height / imgHeight), canvas.height - sourceY)
        
        // 创建当前页面的canvas片段
        const pageCanvas = document.createElement('canvas')
        const pageCtx = pageCanvas.getContext('2d')!
        
        pageCanvas.width = canvas.width
        pageCanvas.height = sourceHeight
        
        // 绘制当前页面的内容
        pageCtx.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, canvas.width, sourceHeight
        )
        
        // 添加到PDF
        const pageImgData = pageCanvas.toDataURL('image/png')
        const pageImgHeight = (sourceHeight * imgWidth) / canvas.width
        
        pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageImgHeight)
        
        // 添加页码
        pdf.setFontSize(8)
        pdf.setTextColor(128, 128, 128)
        pdf.text(`第 ${page + 1} 页，共 ${totalPages} 页`, pdfWidth - margin - 30, pdfHeight - 5)
        
        remainingHeight -= contentHeight
      }

      // 添加PDF元数据
      pdf.setProperties({
        title: pageTitle,
        subject: '页面导出',
        author: 'BuTP学生管理系统',
        creator: 'BuTP PDF Export'
      })

      // 下载PDF
      const defaultFileName = fileName || `${pageTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(defaultFileName)
      
      setProgress(`PDF生成完成！共 ${totalPages} 页`)
      
      // 显示成功消息
      setTimeout(() => {
        setProgress('')
      }, 2000)
      
    } catch (error) {
      console.error('PDF生成失败:', error)
      alert(`PDF生成失败：${error instanceof Error ? error.message : '未知错误'}`)
      setProgress('生成失败')
      setTimeout(() => {
        setProgress('')
      }, 2000)
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