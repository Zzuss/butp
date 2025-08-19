"use client"

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export default function PreserveLayoutPdfButton({
  getUrl = () => (typeof window !== 'undefined' ? window.location.href : '/'),
  defaultViewport = 1366
}: {
  getUrl?: () => string
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
      const url = getUrl()

      const body = {
        url,
        viewportWidth: viewport,
        pdfOptions: {
          width: `${viewport}px`,
          printBackground: true,
          preferCSSPageSize: false
        }
      }

      const resp = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body)
      })

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '')
        throw new Error(`导出失败: ${resp.status} ${txt}`)
      }

      const blob = await resp.blob()
      // create preview URL and open modal
      const urlObj = URL.createObjectURL(blob)
      setPreviewUrl(urlObj)
      setPreviewBlob(blob)
      // default filename
      setFilename(filename || `export_${new Date().toISOString().slice(0,10)}.pdf`)
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
    a.download = filename || `export_${new Date().toISOString().slice(0,10)}.pdf`
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
          {isLoading ? '导出中...' : '导出（保留桌面布局）'}
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


