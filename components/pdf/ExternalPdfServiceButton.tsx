"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function ExternalPdfServiceButton({
  serviceUrl = '/api/generate-pdf-proxy'
}: { serviceUrl?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [viewport, setViewport] = useState<number>(1366)
  const [filename, setFilename] = useState<string>('')

  const handleExport = async () => {
    try {
      setIsLoading(true)
      const url = typeof window !== 'undefined' ? window.location.href : ''

      const body = {
        url,
        viewportWidth: viewport,
        filename: filename ? filename.replace(/\s+/g, '_').replace(/[^\w.-]/g, '') : undefined
      }

      const headers: Record<string,string> = { 'Content-Type': 'application/json' }
      // Optional: if you expose a key via window.PDF_SERVICE_KEY, include it
      try {
        const key = (window as any).PDF_SERVICE_KEY
        if (key) headers['x-pdf-key'] = key
      } catch (e) {}

      const resp = await fetch(serviceUrl, {
        method: 'POST',
        headers,
        // do not include browser cookies by default; the service will fetch the URL server-side
        body: JSON.stringify(body)
      })

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '')
        throw new Error(`服务返回错误: ${resp.status} ${txt}`)
      }

      const blob = await resp.blob()
      const a = document.createElement('a')
      const u = URL.createObjectURL(blob)
      a.href = u
      const outName = filename && filename.trim() !== '' ? filename : `export_${new Date().toISOString().slice(0,10)}.pdf`
      a.download = outName.endsWith('.pdf') ? outName : outName + '.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(u)
    } catch (err) {
      console.error('外部 PDF 服务导出失败', err)
      alert(err instanceof Error ? err.message : '导出失败')
    } finally {
      setIsLoading(false)
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
          {isLoading ? '导出中...' : '导出（内部服务）'}
        </Button>
      </div>
      <div className="text-xs text-muted-foreground mt-1">使用校内 PDF 服务生成（{serviceUrl}）。</div>
    </div>
  )
}


