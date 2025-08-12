'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Bug } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface DebugPDFExportProps {
  pageTitle?: string
  contentSelector?: string
}

export function DebugPDFExport({ 
  pageTitle = 'Debug Export',
  contentSelector = '.dashboard-content'
}: DebugPDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  const debugElements = () => {
    const selectors = [
      '.dashboard-content',
      '.analysis-content',
      '.grades-content',
      'main',
      '[role="main"]',
      '.container'
    ]
    
    let info = 'DOM 元素调试信息:\n\n'
    
    selectors.forEach(selector => {
      const element = document.querySelector(selector)
      if (element) {
        const rect = element.getBoundingClientRect()
        info += `✅ ${selector}:\n`
        info += `  - 存在: 是\n`
        info += `  - 尺寸: ${rect.width}x${rect.height}\n`
        info += `  - 子元素: ${element.children.length}\n`
        info += `  - 文本长度: ${element.textContent?.length || 0}\n`
        info += `  - 样式可见: ${window.getComputedStyle(element).visibility}\n`
        info += `  - 样式显示: ${window.getComputedStyle(element).display}\n\n`
      } else {
        info += `❌ ${selector}: 不存在\n\n`
      }
    })
    
    setDebugInfo(info)
    console.log(info)
  }

  const testSimplePDF = async () => {
    setIsGenerating(true)
    try {
      // 创建一个简单的测试PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      // 添加英文标题
      pdf.setFontSize(20)
      pdf.text('Test PDF Export', 20, 30)
      
      // 添加时间
      pdf.setFontSize(12)
      pdf.text(`Generated: ${new Date().toLocaleString('en-US')}`, 20, 50)
      
      // 添加一些测试内容
      pdf.setFontSize(10)
      pdf.text('This is a test PDF to verify basic functionality.', 20, 70)
      pdf.text('If you can see this text, PDF generation works.', 20, 85)
      
      // 查找页面内容
      const element = document.querySelector(contentSelector)
      if (element) {
        pdf.text(`Found element: ${contentSelector}`, 20, 100)
        pdf.text(`Element size: ${element.scrollWidth}x${element.scrollHeight}`, 20, 115)
        pdf.text(`Children count: ${element.children.length}`, 20, 130)
        pdf.text(`Text length: ${element.textContent?.length || 0}`, 20, 145)
      } else {
        pdf.text(`Element not found: ${contentSelector}`, 20, 100)
      }
      
      pdf.save('test-pdf-export.pdf')
      alert('测试PDF生成成功！')
    } catch (error) {
      console.error('测试PDF失败:', error)
      alert(`测试PDF失败: ${error}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const testCanvasCapture = async () => {
    setIsGenerating(true)
    try {
      const element = document.querySelector(contentSelector) as HTMLElement
      if (!element) {
        alert('找不到目标元素')
        return
      }
      
      console.log('开始截图测试，元素:', element)
      
      const canvas = await html2canvas(element, {
        scale: 1,
        logging: true,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
      })
      
      console.log('截图完成:', canvas.width, 'x', canvas.height)
      
      // 显示截图结果
      const imgData = canvas.toDataURL()
      const newWindow = window.open()
      if (newWindow) {
        newWindow.document.write(`<img src="${imgData}" style="max-width:100%">`)
        newWindow.document.write(`<p>Canvas size: ${canvas.width} x ${canvas.height}</p>`)
      }
      
    } catch (error) {
      console.error('截图测试失败:', error)
      alert(`截图测试失败: ${error}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-yellow-50">
      <h3 className="font-bold text-lg">PDF导出调试工具</h3>
      
      <div className="flex gap-2 flex-wrap">
        <Button onClick={debugElements} variant="outline" size="sm">
          <Bug className="h-4 w-4 mr-2" />
          检查DOM元素
        </Button>
        
        <Button onClick={testSimplePDF} disabled={isGenerating} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          测试基础PDF
        </Button>
        
        <Button onClick={testCanvasCapture} disabled={isGenerating} variant="outline" size="sm">
          📷 测试截图
        </Button>
      </div>
      
      {debugInfo && (
        <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-60">
          {debugInfo}
        </pre>
      )}
      
      <p className="text-sm text-gray-600">
        目标选择器: <code>{contentSelector}</code>
      </p>
    </div>
  )
} 