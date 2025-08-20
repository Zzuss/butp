"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function CampusPdfServiceButton({
  campusServiceUrl = 'http://10.3.58.3:8000/generate-pdf'
}: { campusServiceUrl?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [viewport, setViewport] = useState<number>(1366)
  const [filename, setFilename] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string>('')

  // 检测校园VPN连接（避免Mixed Content问题）
  const checkCampusVPNConnection = async (): Promise<boolean> => {
    try {
      // 对于HTTPS页面，我们不能直接检测HTTP服务
      // 改为基于环境智能判断
      const hostname = window.location.hostname
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
      const isIntranet = hostname.includes('10.') || hostname.includes('192.168.') || hostname.includes('bupt')
      
      // 如果是本地开发或内网环境，假设可以访问校内服务
      if (isLocal || isIntranet) {
        return true
      }
      
      // 对于外网HTTPS，由于Mixed Content限制，无法直接测试HTTP校内服务
      // 我们让用户尝试，如果失败会自动降级到客户端
      return false
    } catch (error) {
      return false
    }
  }

  const handleExport = async () => {
    setIsLoading(true)
    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''

      // 智能检测用户环境
      const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1'
      const isIntranet = hostname.includes('10.') || hostname.includes('192.168.')
      const isCampusVPN = await checkCampusVPNConnection()
      
      const canUseCampusService = isLocalDev || isIntranet || isCampusVPN
      const campusService = campusServiceUrl

      const body = { viewportWidth: viewport }
      if (filename && filename.trim() !== '') body.filename = filename.replace(/\s+/g, '_').replace(/[^\w.-]/g, '')

      // If local dev, send HTML; otherwise prefer URL
      const useHtml = hostname === 'localhost' || hostname === '127.0.0.1' || window.location.protocol === 'file:'
      if (useHtml) {
        let html = document.documentElement.outerHTML || '<html></html>'
        if (!/<base\b/i.test(html)) {
          if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${origin}">`)
          else html = `<head><base href="${origin}"></head>` + html
        }
        body.html = html
      } else {
        body.url = currentUrl
      }

      // 1) 浏览器直接调用校内PDF服务（用户需要在校园网或VPN环境）
      if (canUseCampusService) {
        try {
          setStatusMessage('尝试连接校内PDF服务...')
          
          // 对于HTTPS站点访问HTTP校内服务，需要用户允许Mixed Content
          if (window.location.protocol === 'https:' && campusService.startsWith('http:')) {
            const userConfirm = confirm(
              '检测到您在HTTPS站点尝试使用校内PDF服务。\n\n' +
              '由于浏览器安全限制，您需要：\n' +
              '1. 允许此页面的"不安全内容"（Mixed Content）\n' +
              '2. 或者在浏览器地址栏点击"盾牌"图标，选择"允许不安全内容"\n\n' +
              '是否继续尝试连接校内服务？\n' +
              '（如果失败会自动使用客户端导出）'
            )
            
            if (!userConfirm) {
              setStatusMessage('用户取消，使用客户端导出...')
              throw new Error('用户取消校内服务')
            }
            
            setStatusMessage('正在尝试连接校内服务（可能需要允许Mixed Content）...')
          }
          
          // 获取当前页面的完整HTML内容（保留所有样式和状态）
          const getPageHTML = () => {
            // 克隆整个文档
            const docClone = document.cloneNode(true) as Document
            
            // 收集所有内联CSS样式
            const styleSheets = Array.from(document.styleSheets)
            let allCSS = ''
            
            styleSheets.forEach(sheet => {
              try {
                if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
                  // 跨域样式表，添加链接
                  const linkElement = docClone.createElement('link')
                  linkElement.rel = 'stylesheet'
                  linkElement.href = sheet.href
                  docClone.head.appendChild(linkElement)
                } else {
                  // 同域样式表，内联CSS规则
                  const rules = Array.from(sheet.cssRules || sheet.rules || [])
                  rules.forEach(rule => {
                    allCSS += rule.cssText + '\n'
                  })
                }
              } catch (e) {
                // 无法访问的样式表，尝试添加链接
                if (sheet.href) {
                  const linkElement = docClone.createElement('link')
                  linkElement.rel = 'stylesheet'
                  linkElement.href = sheet.href
                  docClone.head.appendChild(linkElement)
                }
              }
            })
            
            // 添加收集到的内联样式
            if (allCSS) {
              const styleElement = docClone.createElement('style')
              styleElement.textContent = allCSS
              docClone.head.appendChild(styleElement)
            }
            
            // 添加基础URL以确保相对路径资源正确加载
            const baseElement = docClone.createElement('base')
            baseElement.href = window.location.origin + '/'
            docClone.head.insertBefore(baseElement, docClone.head.firstChild)
            
            // 添加视口优化
            const viewportMeta = docClone.createElement('meta')
            viewportMeta.name = 'viewport'
            viewportMeta.content = `width=${viewport}, initial-scale=1`
            docClone.head.appendChild(viewportMeta)
            
            // 返回完整HTML
            return '<!DOCTYPE html>' + docClone.documentElement.outerHTML
          }

          // 构建请求体 - 发送完整HTML内容而不是URL（避免网络问题，质量更好）
          const pdfRequestBody = {
            html: getPageHTML(), // 发送完整HTML内容，包含所有样式和当前状态
            viewportWidth: viewport,
            filename: filename && filename.trim() !== '' ? filename : `export_${new Date().toISOString().slice(0,10)}.pdf`,
            pdfOptions: {
              printBackground: true,
              format: 'A4',
              preferCSSPageSize: false, // 允许内容超出单页
              height: null, // 自动高度，支持多页
              pageRanges: '', // 生成所有页面
              margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
            }
          }

          setStatusMessage('正在生成PDF...')
          const controller = new AbortController()
          const id = setTimeout(() => controller.abort(), 30000) // 30秒超时
          
          const resp = await fetch(campusService, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'x-pdf-key': 'campus-pdf-2024-1755617095',
              // 转发用户的认证信息到校内服务
              'Cookie': document.cookie
            },
            body: JSON.stringify(pdfRequestBody),
            signal: controller.signal,
            credentials: 'include' // 包含认证信息
          })
          
          clearTimeout(id)
          
          if (resp.ok) {
            setStatusMessage('下载中...')
            const blob = await resp.blob()
            const a = document.createElement('a')
            const u = URL.createObjectURL(blob)
            a.href = u
            const outName = filename && filename.trim() !== '' ? filename : `export_campus_${new Date().toISOString().slice(0,10)}.pdf`
            a.download = outName.endsWith('.pdf') ? outName : outName + '.pdf'
            document.body.appendChild(a)
            a.click()
            a.remove(); URL.revokeObjectURL(u)
            setIsLoading(false)
            setStatusMessage('')
            return
          } else {
            const errorText = await resp.text().catch(() => '')
            throw new Error(`校内服务错误: ${resp.status} ${errorText}`)
          }
        } catch (err) {
          console.warn('校内PDF服务调用失败:', err)
          setStatusMessage('校内服务不可用，使用客户端导出...')
          // 不要return，继续执行客户端导出
        }
      }

      // 2) 如果校内服务不可用，直接使用客户端生成
      setStatusMessage('使用客户端生成PDF...')
      
      // 使用改进的客户端PDF生成逻辑（类似ClientPdfButton）
      const contentElement = document.querySelector('main') || document.querySelector('#root') || document.body
      if (!contentElement) {
        throw new Error('未找到要导出的内容')
      }

      // 创建临时容器进行客户端PDF生成
      const tempContainer = document.createElement('div')
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: ${viewport}px;
        background: white;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #000;
        overflow: visible;
      `
      
      const clonedContent = contentElement.cloneNode(true) as HTMLElement
      
      // 修复oklch颜色函数问题 - 将不支持的颜色替换为fallback
      const fixModernColors = (element: HTMLElement) => {
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_ELEMENT,
          null
        )
        
        const elementsToFix: Element[] = []
        let node = walker.nextNode()
        while (node) {
          elementsToFix.push(node as Element)
          node = walker.nextNode()
        }
        
        elementsToFix.forEach(el => {
          const htmlEl = el as HTMLElement
          const computedStyle = window.getComputedStyle(htmlEl)
          
          // 替换可能包含oklch的样式属性
          const styleProps = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke']
          styleProps.forEach(prop => {
            const value = computedStyle.getPropertyValue(prop)
            if (value && (value.includes('oklch') || value.includes('lch') || value.includes('lab'))) {
              // 使用计算后的RGB值替换
              const rgb = computedStyle.getPropertyValue(prop)
              if (rgb && rgb !== value) {
                htmlEl.style.setProperty(prop, rgb, 'important')
              } else {
                // fallback到安全颜色
                if (prop === 'backgroundColor') htmlEl.style.setProperty(prop, '#ffffff', 'important')
                else if (prop === 'color') htmlEl.style.setProperty(prop, '#000000', 'important')
                else htmlEl.style.setProperty(prop, 'transparent', 'important')
              }
            }
          })
        })
      }
      
      fixModernColors(clonedContent)
      tempContainer.appendChild(clonedContent)
      document.body.appendChild(tempContainer)
      
      // 等待渲染
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 动态导入html2canvas和jsPDF
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ])
      
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // 在克隆文档中也应用颜色修复
          const clonedBody = clonedDoc.body
          if (clonedBody) {
            fixModernColors(clonedBody)
          }
        }
      })
      
      // 清理临时元素
      document.body.removeChild(tempContainer)
      
      // 生成PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
      
      // 下载
      const outName = filename && filename.trim() !== '' ? filename : `export_client_${new Date().toISOString().slice(0,10)}.pdf`
      const finalName = outName.endsWith('.pdf') ? outName : outName + '.pdf'
      pdf.save(finalName)
      setStatusMessage('')
    } catch (err) {
      console.error('外部 PDF 服务导出失败', err)
      alert(err instanceof Error ? err.message : '导出失败')
    } finally {
      setIsLoading(false)
      setStatusMessage('')
    }
  }

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <select value={viewport} onChange={e => setViewport(Number(e.target.value))} className="border px-2 py-1 text-sm">
          <option value={1920}>1920</option>
          <option value={1366}>1366</option>
          <option value={1280}>1280</option>
          <option value={1024}>1024</option>
          <option value={800}>800</option>
        </select>
        <input className="border px-2 py-1 text-sm" placeholder="文件名（可选）" value={filename} onChange={e => setFilename(e.target.value)} />
        <Button onClick={handleExport} disabled={isLoading} size="sm">
          {isLoading ? (statusMessage || '导出中...') : '导出（校内服务）'}
        </Button>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {statusMessage ? statusMessage : `使用校内 PDF 服务生成高质量PDF，需要校园网或VPN连接。HTTPS站点可能需要允许Mixed Content。`}
      </div>
    </div>
  )
}


