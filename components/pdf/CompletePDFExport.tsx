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
    setIsGenerating(true)
    setProgress('Preparing print-like capture...')

    try {
      // 目标元素：优先尝试 main，其次 body
      const target = document.querySelector('main') || document.body
      if (!target) throw new Error('未找到要导出的页面内容')

      // 保存原始滚动位置
      const originalScrollTop = window.pageYOffset
      const originalScrollLeft = window.pageXOffset

      // 克隆到 iframe，并内联所有计算样式，确保布局与渲染一致
      setProgress('Cloning page into offscreen iframe...')
      const iframe = document.createElement('iframe')
      iframe.style.position = 'absolute'
      iframe.style.left = '-99999px'
      iframe.style.top = '0'
      iframe.style.width = `${Math.max(document.documentElement.scrollWidth, 1920)}px`
      iframe.style.height = `${Math.max(document.documentElement.scrollHeight, 1080)}px`
      iframe.setAttribute('aria-hidden', 'true')
      document.body.appendChild(iframe)

      const idoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!idoc) throw new Error('无法创建 iframe 文档')

      // 基础 head（保留 base），并注入必要样式
      const base = document.querySelector('base')
      idoc.open()
      idoc.write('<!doctype html><html><head>' + (base ? base.outerHTML : '') + '</head><body></body></html>')
      idoc.close()

      // 克隆目标节点
      const cloned = target.cloneNode(true) as HTMLElement
      // 将克隆的根元素加入 iframe
      idoc.body.style.margin = '0'
      idoc.body.appendChild(cloned)

      // 递归将计算样式内联到克隆节点
      const inlineComputedStyles = (sourceElem: Element, destElem: Element) => {
        const computed = window.getComputedStyle(sourceElem)
        // 复制所有可枚举的计算样式属性
        for (let i = 0; i < computed.length; i++) {
          const prop = computed[i]
          try {
            (destElem as HTMLElement).style.setProperty(prop, computed.getPropertyValue(prop), computed.getPropertyPriority(prop))
          } catch (e) {
            // 某些只读属性可能会抛错，忽略
          }
        }

        // 递归子节点
        const srcChildren = Array.from(sourceElem.children)
        const dstChildren = Array.from(destElem.children)
        for (let i = 0; i < srcChildren.length; i++) {
          if (dstChildren[i]) inlineComputedStyles(srcChildren[i], dstChildren[i])
        }
      }

      inlineComputedStyles(target, cloned)

      // 等待字体和外部资源加载
      setProgress('Waiting for fonts and images to load...')
      await (document.fonts ? document.fonts.ready : Promise.resolve())
      // 等待 iframe 内部图片加载
      const imgs = Array.from(idoc.images || []) as HTMLImageElement[]
      await Promise.all(imgs.map(img => new Promise<void>(resolve => {
        if (img.complete) return resolve()
        img.onload = () => resolve()
        img.onerror = () => resolve()
      })))

      // 计算 iframe 内容尺寸
      const contentWidth = Math.max(idoc.documentElement.scrollWidth, idoc.body.scrollWidth)
      const contentHeight = Math.max(idoc.documentElement.scrollHeight, idoc.body.scrollHeight)

      setProgress('Capturing iframe content to canvas (segmented)...')

      // 分段截图以避免单个 canvas 超过浏览器限制
      const scale = 2
      const MAX_CANVAS = 32767 // 浏览器画布尺寸上限（近似）
      const maxSegmentHeightDomPx = Math.floor(MAX_CANVAS / scale)

      const segments: HTMLCanvasElement[] = []
      let capturedHeight = 0
      let index = 0

      while (capturedHeight < contentHeight) {
        const segHeight = Math.min(maxSegmentHeightDomPx, contentHeight - capturedHeight)
        setProgress(`Capturing segment ${index + 1} (height ${segHeight}px)...`)

        const segCanvas = await html2canvas(idoc.documentElement as any, {
          scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: contentWidth,
          height: segHeight,
          x: 0,
          y: capturedHeight,
          windowWidth: contentWidth,
          windowHeight: segHeight,
          logging: true,
          foreignObjectRendering: true,
          imageTimeout: 0,
          onclone: (clonedDoc) => {
            const all = clonedDoc.querySelectorAll('*')
            all.forEach(el => {
              if (el instanceof HTMLElement) el.style.visibility = 'visible'
            })
          }
        })

        if (segCanvas.width === 0 || segCanvas.height === 0) throw new Error('Segment canvas generated empty')
        segments.push(segCanvas)

        capturedHeight += segHeight
        index += 1
      }

      // 清理 iframe
      iframe.remove()

      setProgress('Generating PDF from segments...')
      await createPDFFromCanvases(segments)

      // 恢复滚动位置
      window.scrollTo(originalScrollLeft, originalScrollTop)
      setProgress('PDF generated successfully!')
      setTimeout(() => setProgress(''), 2000)
    } catch (err) {
      console.error('❌ Print-like PDF generation failed:', err)
      alert(`导出失败: ${err instanceof Error ? err.message : String(err)}`)
      setProgress('Generation failed')
      setTimeout(() => setProgress(''), 2000)
    } finally {
      setIsGenerating(false)
    }
  }

  // 从多段 canvas 生成 PDF（用于分段截图）
  const createPDFFromCanvases = async (canvases: HTMLCanvasElement[]) => {
    // 将分段的 canvas 当作一个长画布来处理，但按页按需拼接每页图像，避免创建超大 canvas
    const canvasFullWidth = canvases[0].width
    const canvasFullHeight = canvases.reduce((s, c) => s + c.height, 0)

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const margin = 15
    const contentWidth = pdfWidth - (margin * 2)
    const contentHeight = pdfHeight - (margin * 2) - 20

    const imgRatio = canvasFullWidth / canvasFullHeight
    const pdfRatio = contentWidth / contentHeight

    let imgWidthPdfUnits: number
    let imgHeightPdfUnits: number
    if (imgRatio > pdfRatio) {
      imgWidthPdfUnits = contentWidth
      imgHeightPdfUnits = contentWidth / imgRatio
    } else {
      imgHeightPdfUnits = contentHeight
      imgWidthPdfUnits = contentHeight * imgRatio
    }

    const pixelsPerPdfUnit = canvasFullWidth / imgWidthPdfUnits
    const totalPages = Math.ceil(imgHeightPdfUnits / contentHeight)

    console.log('📄 Segments -> PDF layout:', { totalPages, canvasFullWidth, canvasFullHeight, pixelsPerPdfUnit })

    let remainingHeightPdf = imgHeightPdfUnits
    let currentYPdf = 0

    // 预计算段的起始 offset
    const segmentOffsets: number[] = []
    let acc = 0
    for (const c of canvases) {
      segmentOffsets.push(acc)
      acc += c.height
    }

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (pageNum > 1) pdf.addPage()

      // 页眉
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)
      pdf.text(pageTitle, margin, margin + 8)
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text(`Page ${pageNum} of ${totalPages}`, pdfWidth - margin - 25, margin + 8)
      pdf.text(`Generated: ${new Date().toLocaleString('en-US')}`, pdfWidth - margin - 50, margin + 15)

      const pageHeightPdf = Math.min(remainingHeightPdf, contentHeight)
      const sourceYpx = Math.round(currentYPdf * pixelsPerPdfUnit)
      const sourceHeightPx = Math.max(1, Math.round(pageHeightPdf * pixelsPerPdfUnit))

      // 创建页面片段 canvas（像素为单位）
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvasFullWidth
      pageCanvas.height = sourceHeightPx
      const pageCtx = pageCanvas.getContext('2d')!
      pageCtx.fillStyle = '#ffffff'
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)

      // 将需要的像素区域从各段中逐个复制到 pageCanvas
      let remainingToCopy = sourceHeightPx
      let destY = 0
      // 找到第一个包含 sourceYpx 的段
      let segIndex = segmentOffsets.findIndex((off, idx) => {
        const start = off
        const end = off + canvases[idx].height
        return sourceYpx >= start && sourceYpx < end
      })
      if (segIndex === -1) segIndex = 0

      let readY = sourceYpx - segmentOffsets[segIndex]

      while (remainingToCopy > 0 && segIndex < canvases.length) {
        const seg = canvases[segIndex]
        const available = seg.height - readY
        const take = Math.min(available, remainingToCopy)

        // draw from seg: srcX=0, srcY=readY, srcW=seg.width, srcH=take, destX=0, destY
        pageCtx.drawImage(seg, 0, readY, seg.width, take, 0, destY, pageCanvas.width, take)

        remainingToCopy -= take
        destY += take
        segIndex += 1
        readY = 0
      }

      const pageImgData = pageCanvas.toDataURL('image/png', 0.92)
      const xPosition = (pdfWidth - imgWidthPdfUnits) / 2
      const yPosition = margin + 20
      pdf.addImage(pageImgData, 'PNG', xPosition, yPosition, imgWidthPdfUnits, pageHeightPdf)

      remainingHeightPdf -= pageHeightPdf
      currentYPdf += pageHeightPdf
    }

    const defaultFileName = fileName || `${pageTitle.replace(/[^\w\s-]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(defaultFileName)
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

    // 将 canvas 像素映射到 PDF 单位：先计算在 PDF 中显示时的图片尺寸（保持比例）
    const imgRatio = canvas.width / canvas.height
    const pdfRatio = contentWidth / contentHeight

    let imgWidthPdfUnits: number
    let imgHeightPdfUnits: number
    if (imgRatio > pdfRatio) {
      imgWidthPdfUnits = contentWidth
      imgHeightPdfUnits = contentWidth / imgRatio
    } else {
      imgHeightPdfUnits = contentHeight
      imgWidthPdfUnits = contentHeight * imgRatio
    }

    // 计算像素到 PDF 单位的缩放（pixels per PDF-unit）
    const pixelsPerPdfUnit = canvas.width / imgWidthPdfUnits

    // 总页数按 PDF 单位高度计算
    const totalPages = Math.ceil(imgHeightPdfUnits / contentHeight)

    console.log('📄 PDF layout:', {
      totalPages,
      imgDimensionsPdf: { width: imgWidthPdfUnits, height: imgHeightPdfUnits },
      canvasDimensionsPx: { width: canvas.width, height: canvas.height },
      pixelsPerPdfUnit
    })

    let remainingHeightPdf = imgHeightPdfUnits
    let currentYPdf = 0

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (pageNum > 1) pdf.addPage()

      // 页眉
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)
      pdf.text(pageTitle, margin, margin + 8)

      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text(`Page ${pageNum} of ${totalPages}`, pdfWidth - margin - 25, margin + 8)
      pdf.text(`Generated: ${new Date().toLocaleString('en-US')}`, pdfWidth - margin - 50, margin + 15)

      const pageHeightPdf = Math.min(remainingHeightPdf, contentHeight)

      // 将当前 PDF 单位坐标转换为 canvas 像素坐标
      const sourceYpx = Math.round(currentYPdf * pixelsPerPdfUnit)
      const sourceHeightPx = Math.max(1, Math.round(pageHeightPdf * pixelsPerPdfUnit))

      console.log(`📑 Page ${pageNum}: sourceYpx=${sourceYpx}, sourceHeightPx=${sourceHeightPx}`)

      // 创建页面切片 canvas（像素为单位）
      const pageCanvas = document.createElement('canvas')
      const pageCtx = pageCanvas.getContext('2d')!

      pageCanvas.width = canvas.width
      pageCanvas.height = sourceHeightPx

      pageCtx.fillStyle = '#ffffff'
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)

      pageCtx.drawImage(
        canvas,
        0, sourceYpx, canvas.width, sourceHeightPx,
        0, 0, pageCanvas.width, pageCanvas.height
      )

      const pageImgData = pageCanvas.toDataURL('image/png', 0.92)
      const xPosition = (pdfWidth - imgWidthPdfUnits) / 2
      const yPosition = margin + 20

      // 将切片以 PDF 单位尺寸插入（保持在 contentWidth/contentHeight 区域内）
      pdf.addImage(pageImgData, 'PNG', xPosition, yPosition, imgWidthPdfUnits, pageHeightPdf)

      remainingHeightPdf -= pageHeightPdf
      currentYPdf += pageHeightPdf
    }

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