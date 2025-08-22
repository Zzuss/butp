"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function CampusPdfServiceButton({
  campusServiceUrl = '/api/pdf/generate'
}: { campusServiceUrl?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [viewport, setViewport] = useState<number>(1366)
  const [filename, setFilename] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string>('')

  // 检测校园VPN连接（通过后端代理，避免浏览器直接访问内网）
  const checkCampusVPNConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2500)
      const resp = await fetch('/api/pdf/health', { method: 'GET', signal: controller.signal })
      clearTimeout(timeoutId)
      return resp.ok
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
          setStatusMessage('检测校园网连接...')
          
          // 构建请求体 - 发送当前页面URL给校内服务
          const pdfRequestBody = {
            url: currentUrl, // 让校内服务访问butp.tech来渲染PDF
            viewportWidth: viewport,
            filename: filename && filename.trim() !== '' ? filename : `export_${new Date().toISOString().slice(0,10)}.pdf`,
            pdfOptions: {
              printBackground: true,
              format: 'A4',
              margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
            }
          }

          setStatusMessage('正在生成PDF...')
          const controller = new AbortController()
          const id = setTimeout(() => controller.abort(), 30000) // 30秒超时
          
          // 通过后端代理发起请求，后端会把 Cookie 和 API Key 一并转发到实际服务
          const resp = await fetch(campusService, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pdfRequestBody),
            signal: controller.signal,
            credentials: 'include'
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
        backgroundColor: '#ffffff'
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
        {statusMessage ? statusMessage : `使用校内 PDF 服务生成，需要校园网或VPN连接。`}
      </div>
    </div>
  )
}


