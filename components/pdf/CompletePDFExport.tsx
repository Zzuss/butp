'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface CompletePDFExportProps {
  pageTitle?: string
  fileName?: string
  className?: string
}

export function CompletePDFExport({ 
  pageTitle = 'Page Export',
  fileName,
  className = ''
}: CompletePDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState('')

  const generatePDF = async () => {
    console.log('🚀 Starting viewport-independent PDF generation')
    
    setIsGenerating(true)
    setProgress('Creating virtual environment...')
    
    try {
      // 保存原始状态
      const originalScrollTop = window.pageYOffset
      const originalScrollLeft = window.pageXOffset
      
      // 创建一个完全独立的虚拟环境
      await createVirtualEnvironment()
      
      setProgress('Analyzing content in virtual space...')
      
      // 在虚拟环境中获取真实尺寸
      const dimensions = await getVirtualDimensions()
      console.log('📐 Virtual environment dimensions:', dimensions)
      
      setProgress('Capturing in virtual environment...')
      
      // 在虚拟环境中进行截图
      const canvas = await captureInVirtualEnvironment(dimensions)
      
      // 恢复原始环境
      await restoreOriginalEnvironment()
      
      console.log('✅ Virtual capture complete:', {
        width: canvas.width,
        height: canvas.height,
        dataSize: Math.round(canvas.toDataURL('image/png', 0.1).length / 1024) + 'KB'
      })
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Generated canvas is empty')
      }
      
      setProgress('Creating PDF...')
      
      // 创建PDF
      await createPDFFromCanvas(canvas)
      
      // 恢复滚动位置
      window.scrollTo(originalScrollLeft, originalScrollTop)
      
      console.log('🎉 PDF Generation Complete!')
      setProgress('PDF generated successfully!')
      
      setTimeout(() => {
        setProgress('')
      }, 3000)
      
    } catch (error) {
      console.error('❌ PDF Generation Failed:', error)
      alert(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setProgress('Generation failed')
      
      setTimeout(() => {
        setProgress('')
      }, 3000)
    } finally {
      setIsGenerating(false)
    }
  }

  // 创建虚拟环境，不受当前视窗影响
  const createVirtualEnvironment = async () => {
    // 注入虚拟环境CSS
    const virtualStyle = document.createElement('style')
    virtualStyle.id = 'virtual-pdf-env'
    virtualStyle.textContent = `
      /* 虚拟环境样式 - 完全独立于视窗 */
      html.pdf-virtual-env {
        width: 1920px !important;
        min-width: 1920px !important;
        max-width: none !important;
        height: auto !important;
        overflow: visible !important;
        position: relative !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      body.pdf-virtual-env {
        width: 1920px !important;
        min-width: 1920px !important;
        max-width: none !important;
        height: auto !important;
        overflow: visible !important;
        position: relative !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* 强制所有容器使用虚拟尺寸 */
      .pdf-virtual-env .container,
      .pdf-virtual-env .wrapper,
      .pdf-virtual-env main,
      .pdf-virtual-env .dashboard-content {
        width: auto !important;
        max-width: none !important;
        min-width: auto !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }
      
      /* 确保所有内容可见 */
      .pdf-virtual-env * {
        max-height: none !important;
        max-width: none !important;
        overflow: visible !important;
      }
      
      /* 修复特殊显示类型 */
      .pdf-virtual-env .grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important;
        gap: 1rem !important;
      }
      
      .pdf-virtual-env .flex {
        display: flex !important;
        flex-wrap: wrap !important;
      }
      
      .pdf-virtual-env .inline,
      .pdf-virtual-env .inline-block {
        display: inline-block !important;
      }
      
      /* 移除固定定位 */
      .pdf-virtual-env [style*="position: fixed"],
      .pdf-virtual-env [style*="position: absolute"] {
        position: relative !important;
        left: auto !important;
        top: auto !important;
        right: auto !important;
        bottom: auto !important;
      }
      
      /* 颜色修复 */
      .pdf-virtual-env .bg-primary, 
      .pdf-virtual-env [class*="bg-primary"] { background-color: #3b82f6 !important; }
      .pdf-virtual-env .bg-secondary, 
      .pdf-virtual-env [class*="bg-secondary"] { background-color: #f1f5f9 !important; }
      .pdf-virtual-env .text-primary, 
      .pdf-virtual-env [class*="text-primary"] { color: #1e293b !important; }
      .pdf-virtual-env .text-muted-foreground, 
      .pdf-virtual-env [class*="text-muted"] { color: #64748b !important; }
      .pdf-virtual-env .border, 
      .pdf-virtual-env [class*="border"] { border-color: #e2e8f0 !important; }
    `
    document.head.appendChild(virtualStyle)
    
    // 应用虚拟环境类
    document.documentElement.classList.add('pdf-virtual-env')
    document.body.classList.add('pdf-virtual-env')
    
    // 等待样式应用
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // 在虚拟环境中获取尺寸
  const getVirtualDimensions = async () => {
    // 滚动到顶部
    window.scrollTo(0, 0)
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 获取虚拟环境中的真实尺寸
    const body = document.body
    const html = document.documentElement
    
    // 滚动到底部以确保所有内容加载
    const maxHeight = Math.max(body.scrollHeight, html.scrollHeight)
    window.scrollTo(0, maxHeight)
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 重新计算最终尺寸
    const finalWidth = 1920 // 固定宽度
    const finalHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.scrollHeight,
      html.offsetHeight,
      window.pageYOffset + window.innerHeight
    )
    
    // 回到顶部
    window.scrollTo(0, 0)
    await new Promise(resolve => setTimeout(resolve, 200))
    
    return { width: finalWidth, height: finalHeight }
  }

  // 在虚拟环境中进行截图
  const captureInVirtualEnvironment = async (dimensions: { width: number, height: number }) => {
    console.log('📸 Capturing with virtual dimensions:', dimensions)
    
    const canvas = await html2canvas(document.body, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      
      // 使用虚拟环境的固定尺寸
      width: dimensions.width,
      height: dimensions.height,
      
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      
      // 使用固定的虚拟窗口，完全独立于真实视窗
      windowWidth: Math.max(1920, dimensions.width),
      windowHeight: Math.max(1080, dimensions.height),
      
      logging: true,
      foreignObjectRendering: true,
      imageTimeout: 0,
      
      ignoreElements: (element) => {
        const style = window.getComputedStyle(element)
        return style.position === 'fixed' || 
               element.classList.contains('no-print') ||
               element.classList.contains('no-export')
      },
      
      onclone: (clonedDoc, element) => {
        console.log('🔄 Setting up cloned virtual environment')
        
        // 在克隆文档中应用相同的虚拟环境
        const clonedStyle = clonedDoc.createElement('style')
        clonedStyle.textContent = `
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
            max-height: none !important;
            max-width: none !important;
            overflow: visible !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          html, body {
            width: ${dimensions.width}px !important;
            height: ${dimensions.height}px !important;
            min-height: ${dimensions.height}px !important;
            min-width: ${dimensions.width}px !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            position: relative !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          /* 强制显示所有内容 */
          .hidden, .collapse, [style*="display: none"] {
            display: block !important;
          }
          
          [style*="max-height"], [style*="height"] {
            max-height: none !important;
            height: auto !important;
          }
          
          /* 布局元素 */
          .sidebar, nav, aside, .navigation, 
          main, .main-content, .dashboard-content,
          .container, .wrapper {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: relative !important;
            width: auto !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          
          .grid { 
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important;
            gap: 1rem !important;
          }
          .flex { 
            display: flex !important;
            flex-wrap: wrap !important;
          }
          
          /* 颜色 */
          .bg-primary, [class*="bg-primary"] { background-color: #3b82f6 !important; }
          .bg-secondary, [class*="bg-secondary"] { background-color: #f1f5f9 !important; }
          .text-primary, [class*="text-primary"] { color: #1e293b !important; }
          .text-muted-foreground, [class*="text-muted"] { color: #64748b !important; }
          .border, [class*="border"] { border-color: #e2e8f0 !important; }
          
          [style*="position: fixed"], [style*="position: absolute"] {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            right: auto !important;
            bottom: auto !important;
          }
        `
        clonedDoc.head.appendChild(clonedStyle)
        
        // 设置克隆根元素
        const clonedElement = element as HTMLElement
        clonedElement.style.width = dimensions.width + 'px'
        clonedElement.style.height = dimensions.height + 'px'
        clonedElement.style.minHeight = dimensions.height + 'px'
        clonedElement.style.overflow = 'visible'
        clonedElement.style.position = 'relative'
        clonedElement.style.margin = '0'
        clonedElement.style.padding = '0'
        clonedElement.style.visibility = 'visible'
        clonedElement.style.opacity = '1'
      }
    })
    
    return canvas
  }

  // 恢复原始环境
  const restoreOriginalEnvironment = async () => {
    // 移除虚拟环境样式
    const virtualStyle = document.getElementById('virtual-pdf-env')
    if (virtualStyle) {
      virtualStyle.remove()
    }
    
    // 移除虚拟环境类
    document.documentElement.classList.remove('pdf-virtual-env')
    document.body.classList.remove('pdf-virtual-env')
    
    // 等待恢复
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  // 创建PDF
  const createPDFFromCanvas = async (canvas: HTMLCanvasElement) => {
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const margin = 15
    const contentWidth = pdfWidth - (margin * 2)
    const contentHeight = pdfHeight - (margin * 2) - 20

    // 计算图片尺寸
    const imgRatio = canvas.width / canvas.height
    const pdfRatio = contentWidth / contentHeight

    let imgWidth, imgHeight
    if (imgRatio > pdfRatio) {
      imgWidth = contentWidth
      imgHeight = contentWidth / imgRatio
    } else {
      imgHeight = contentHeight
      imgWidth = contentHeight * imgRatio
    }

    const totalPages = Math.ceil(imgHeight / contentHeight)
    const imgData = canvas.toDataURL('image/png', 0.85)

    console.log('📄 PDF layout:', {
      totalPages,
      imgDimensions: { width: imgWidth, height: imgHeight },
      canvasDimensions: { width: canvas.width, height: canvas.height }
    })

    // 生成多页PDF
    let remainingHeight = imgHeight
    let currentY = 0

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (pageNum > 1) {
        pdf.addPage()
      }

      // 页眉
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)
      pdf.text(pageTitle, margin, margin + 8)

      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text(`Page ${pageNum} of ${totalPages}`, pdfWidth - margin - 25, margin + 8)
      pdf.text(`Generated: ${new Date().toLocaleString('en-US')}`, pdfWidth - margin - 50, margin + 15)

      const pageHeight = Math.min(remainingHeight, contentHeight)
      const sourceY = (currentY / imgHeight) * canvas.height
      const sourceHeight = (pageHeight / imgHeight) * canvas.height

      console.log(`📑 Page ${pageNum}: sourceY=${Math.round(sourceY)}, sourceHeight=${Math.round(sourceHeight)}`)

      // 创建页面片段
      const pageCanvas = document.createElement('canvas')
      const pageCtx = pageCanvas.getContext('2d')!

      pageCanvas.width = canvas.width
      pageCanvas.height = sourceHeight

      pageCtx.fillStyle = '#ffffff'
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)

      pageCtx.drawImage(
        canvas,
        0, sourceY, canvas.width, sourceHeight,
        0, 0, canvas.width, sourceHeight
      )

      const pageImgData = pageCanvas.toDataURL('image/png', 0.85)
      const xPosition = (pdfWidth - imgWidth) / 2
      const yPosition = margin + 20

      pdf.addImage(pageImgData, 'PNG', xPosition, yPosition, imgWidth, pageHeight)

      remainingHeight -= pageHeight
      currentY += pageHeight
    }

    // 保存PDF
    const defaultFileName = fileName || `${pageTitle.replace(/[^\w\s-]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(defaultFileName)
  }

  const handleClick = () => {
    console.log('🖱️ PDF Export button clicked!')
    generatePDF().catch(err => {
      console.error('❌ PDF generation error:', err)
    })
  }

  return (
    <div className={className}>
      <Button
        onClick={handleClick}
        disabled={isGenerating}
        className={`flex items-center gap-2 transition-all duration-200 ${
          className?.includes('sidebar-collapsed') 
            ? 'w-8 h-8' 
            : className?.includes('sidebar')
            ? 'w-full justify-start'
            : className?.includes('fixed') 
            ? 'w-full justify-start shadow-lg hover:shadow-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg px-4 py-2' 
            : ''
        }`}
        variant="ghost"
        size={className?.includes('sidebar-collapsed') ? 'icon' : 'sm'}
        title={className?.includes('sidebar-collapsed') ? '导出PDF' : undefined}
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            {!className?.includes('sidebar-collapsed') && (
              <span className="text-sm">
                {className?.includes('sidebar') ? '生成中...' : (progress || 'Generating...')}
              </span>
            )}
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            {!className?.includes('sidebar-collapsed') && (
              <span className="text-sm">
                {className?.includes('sidebar') ? '导出PDF' : 'Export Complete PDF'}
              </span>
            )}
          </>
        )}
      </Button>
      
      {progress && !className?.includes('sidebar') && !className?.includes('fixed') && (
        <div className="mt-2 text-xs text-muted-foreground">
          {progress}
        </div>
      )}
    </div>
  )
} 