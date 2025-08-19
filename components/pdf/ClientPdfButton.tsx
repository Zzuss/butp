"use client"

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function ClientPdfButton({
  defaultViewport = 1366
}: {
  defaultViewport?: number
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [viewport, setViewport] = useState<number>(defaultViewport)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [filename, setFilename] = useState<string>('')

  const handleExport = async () => {
    try {
      setIsLoading(true)
      
      // 查找要导出的内容
      const contentElement = document.querySelector('main') || document.querySelector('#root') || document.body
      if (!contentElement) {
        alert('未找到要导出的内容')
        return
      }

      console.log('开始生成PDF，内容元素:', contentElement)

      // 创建临时容器，设置为指定的视窗宽度
      const tempContainer = document.createElement('div')
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: ${viewport}px;
        background: white;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #000;
        overflow: visible;
        transform: none;
        box-sizing: border-box;
        line-height: 1.4;
      `
      
      // 克隆内容
      const clonedContent = contentElement.cloneNode(true) as HTMLElement
      
      // 递归应用样式，确保所有内容可见并适应指定宽度
      const applyStyles = (element: HTMLElement) => {
        element.style.maxWidth = 'none'
        element.style.width = 'auto'
        element.style.height = 'auto'
        element.style.maxHeight = 'none'
        element.style.overflow = 'visible'
        element.style.display = element.style.display === 'none' ? 'block' : element.style.display
        element.style.visibility = 'visible'
        element.style.opacity = '1'
        
        // 处理定位
        if (element.style.position === 'fixed' || element.style.position === 'absolute') {
          element.style.position = 'relative'
          element.style.left = 'auto'
          element.style.top = 'auto'
          element.style.right = 'auto'
          element.style.bottom = 'auto'
        }
        
        // 递归处理子元素
        Array.from(element.children).forEach(child => {
          if (child instanceof HTMLElement) {
            applyStyles(child)
          }
        })
      }
      
      applyStyles(clonedContent)
      tempContainer.appendChild(clonedContent)
      document.body.appendChild(tempContainer)
      
      // 等待布局稳定
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const finalHeight = Math.max(tempContainer.scrollHeight, tempContainer.offsetHeight)
      console.log('最终使用高度:', finalHeight)

      // 使用html2canvas捕获完整内容
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: viewport,
        height: finalHeight,
        logging: false,
        removeContainer: false,
        foreignObjectRendering: false,
        imageTimeout: 0
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

      // 创建blob用于预览
      const pdfBlob = pdf.output('blob')
      const urlObj = URL.createObjectURL(pdfBlob)
      setPreviewUrl(urlObj)
      setPreviewBlob(pdfBlob)
      setFilename(filename || `export_${viewport}px_${new Date().toISOString().slice(0,10)}.pdf`)
      
      console.log(`PDF生成完成，共${pageCount}页，视窗宽度: ${viewport}px`)
      
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '导出失败')
    } finally {
      setIsLoading(false)
    }
  }

  // Download preview blob with current filename
  const downloadPreview = () => {
    if (!previewBlob) return
    const a = document.createElement('a')
    const u = URL.createObjectURL(previewBlob)
    a.href = u
    a.download = filename || `export_client_${new Date().toISOString().slice(0,10)}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(u)
    // close preview
    closePreview()
  }

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl('')
    setPreviewBlob(null)
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          value={viewport}
          onChange={e => setViewport(Number(e.target.value))}
          className="border px-2 py-1 text-sm bg-white"
          aria-label="选择布局宽度"
          style={{ minWidth: 92 }}
        >
          <option value={1920}>Desktop 1920</option>
          <option value={1366}>Desktop 1366</option>
          <option value={1280}>Desktop 1280</option>
          <option value={1024}>Tablet 1024</option>
          <option value={800}>Narrow 800</option>
        </select>

        <Button onClick={handleExport} disabled={isLoading} size="sm">
          {isLoading ? '导出中...' : '导出（客户端）'}
        </Button>
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closePreview} />
          <div className="relative w-[90vw] h-[90vh] bg-white rounded shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <span className="font-medium">预览 PDF</span>
                <input
                  className="border px-2 py-1 text-sm ml-3"
                  value={filename}
                  onChange={e => setFilename(e.target.value)}
                  placeholder="文件名 (带 .pdf)"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={closePreview}>取消</Button>
                <Button onClick={downloadPreview} size="sm">下载</Button>
              </div>
            </div>

            <div className="w-full h-full">
              <iframe
                src={previewUrl}
                title="PDF Preview"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
