"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function ExternalPdfServiceButton({
  serviceUrl = '/api/generate-pdf-proxy'
}: { serviceUrl?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [viewport, setViewport] = useState<number>(1366)
  const [filename, setFilename] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string>('')

  const handleExport = async () => {
    setIsLoading(true)
    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''

      // 检测环境：只在本地或内网环境尝试直连
      const isLocalOrIntranet = hostname === 'localhost' || 
                                hostname === '127.0.0.1' || 
                                hostname.includes('10.') || 
                                hostname.includes('192.168.') ||
                                window.location.protocol === 'file:'
      const useDirectInternal = isLocalOrIntranet
      const internalService = 'http://10.3.58.3:8000/generate-pdf'

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

      // 1) 尝试直接请求内网服务（仅在内网环境）
      if (useDirectInternal) {
        try {
          setStatusMessage('正在尝试内网服务...')
          const controller = new AbortController()
          const id = setTimeout(() => controller.abort(), 5000)
          const resp = await fetch(internalService, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-pdf-key': (window as any).PDF_SERVICE_KEY || '' },
            body: JSON.stringify(body),
            signal: controller.signal
          })
          clearTimeout(id)
          if (resp.ok) {
            setStatusMessage('下载中...')
            const blob = await resp.blob()
            const a = document.createElement('a')
            const u = URL.createObjectURL(blob)
            a.href = u
            const outName = filename && filename.trim() !== '' ? filename : `export_${new Date().toISOString().slice(0,10)}.pdf`
            a.download = outName.endsWith('.pdf') ? outName : outName + '.pdf'
            document.body.appendChild(a)
            a.click()
            a.remove(); URL.revokeObjectURL(u)
            setIsLoading(false)
            setStatusMessage('')
            return
          }
        } catch (err) {
          console.warn('Direct internal service failed, fallback to proxy:', err)
          setStatusMessage('内网服务不可用，使用备用方案...')
        }
      }

      // 2) 回退到同源代理
      setStatusMessage('正在生成PDF...')
      const headers2: Record<string,string> = { 'Content-Type': 'application/json' }
      const resp2 = await fetch(serviceUrl, {
        method: 'POST',
        headers: headers2,
        credentials: 'same-origin',
        body: JSON.stringify(body)
      })
      if (!resp2.ok) {
        const txt = await resp2.text().catch(() => '')
        throw new Error(`代理服务错误: ${resp2.status} ${txt}`)
      }
      setStatusMessage('下载中...')
      const blob2 = await resp2.blob()
      const a2 = document.createElement('a')
      const u2 = URL.createObjectURL(blob2)
      a2.href = u2
      const out2 = filename && filename.trim() !== '' ? filename : `export_${new Date().toISOString().slice(0,10)}.pdf`
      a2.download = out2.endsWith('.pdf') ? out2 : out2 + '.pdf'
      document.body.appendChild(a2)
      a2.click()
      a2.remove()
      URL.revokeObjectURL(u2)
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
          {isLoading ? (statusMessage || '导出中...') : '导出（内部服务）'}
        </Button>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {statusMessage ? statusMessage : `使用校内 PDF 服务生成（${serviceUrl}）。`}
      </div>
    </div>
  )
}


