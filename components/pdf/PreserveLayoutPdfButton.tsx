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

      // 使用客户端截图并将切片上传到后端合成 PDF（保证与客户端渲染一致）
      // 捕获整个文档（而非仅可视区域），以确保包含所有内容
      const contentElement = document.documentElement || document.querySelector('main') || document.querySelector('#root') || document.body
      if (!contentElement) throw new Error('未找到要导出的内容')

      // 临时记录：用于在截图后恢复页面样式
      const tempStyleIds: string[] = []
      const modifiedInlineList: Array<{ el: HTMLElement, original: string }> = []
      const modifiedPropsList: Array<{ el: HTMLElement, prop: string, original: string }> = []

      // 在截图前修复浏览器/样式中不被 html2canvas 支持的现代颜色函数（如 oklch/lch/lab）
      const fixModernColors = (root: HTMLElement) => {
        try {
          // 1) 尝试替换可访问的样式表中的现代颜色函数
          const styleSheets = Array.from(document.styleSheets)
          let problematic = false
          styleSheets.forEach(sheet => {
            try {
              const rules = Array.from((sheet as CSSStyleSheet).cssRules || [])
              rules.forEach((rule: any) => {
                if (rule.cssText && /oklch\(|oklab\(|lch\(|lab\(/i.test(rule.cssText)) {
                  problematic = true
                }
              })
            } catch (e) {
              // 跨域样式表可能无法访问，忽略
            }
          })

          // 2) 如果发现问题，在 root 中添加覆盖样式以替换常见类颜色
          if (problematic) {
            const style = document.createElement('style')
            const sid = 'fix-modern-colors-override'
            style.id = sid
            tempStyleIds.push(sid)
            style.textContent = `
              /* 覆盖可能使用现代颜色函数的类 */
              .text-blue-600 { color: #2563eb !important; }
              .text-blue-500 { color: #3b82f6 !important; }
              .bg-blue-600 { background-color: #2563eb !important; }
              .bg-blue-500 { background-color: #3b82f6 !important; }
              .text-slate-900 { color: #0f172a !important; }
              .text-slate-800 { color: #1e293b !important; }
            `
            root.appendChild(style)
          }

          // 3) 遍历元素，替换内联样式里的现代颜色函数
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null)
          const elems: Element[] = []
          let n = walker.nextNode()
          while (n) { elems.push(n as Element); n = walker.nextNode() }

          elems.forEach(el => {
            const htmlEl = el as HTMLElement
            if (htmlEl.style && htmlEl.style.cssText && /oklch\(|oklab\(|lch\(|lab\(/i.test(htmlEl.style.cssText)) {
              // 记录原始 inline cssText 以便恢复
              modifiedInlineList.push({ el: htmlEl, original: htmlEl.style.cssText })
              let s = htmlEl.style.cssText
              s = s.replace(/oklch\([^)]*\)/gi, '#6c757d')
              s = s.replace(/oklab\([^)]*\)/gi, '#6c757d')
              s = s.replace(/lch\([^)]*\)/gi, '#6c757d')
              s = s.replace(/lab\([^)]*\)/gi, '#6c757d')
              htmlEl.style.cssText = s
            }
          })
        } catch (e) {
          // 忽略任何替换错误，继续截图
          console.warn('fixModernColors error', e)
        }
      }

      // 在截图前运行修复
      try { fixModernColors(contentElement as HTMLElement) } catch (e) { /* ignore */ }

      // 进一步防护：把关键颜色/填充样式从计算样式写入内联样式（将 oklch 等现代函数解析为浏览器计算后的 rgb）
      const inlineComputedColors = (root: HTMLElement) => {
        const props = [
          'color','background-color','border-color','border-top-color','border-right-color','border-bottom-color','border-left-color','fill','stroke'
        ]
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null)
        const elems: Element[] = []
        let node = walker.nextNode()
        while (node) { elems.push(node as Element); node = walker.nextNode() }

        elems.forEach(el => {
          try {
            const cs = window.getComputedStyle(el as Element)
            props.forEach(p => {
              const v = cs.getPropertyValue(p)
              if (v && v !== 'transparent' && v !== 'rgba(0, 0, 0, 0)') {
                try {
                  const orig = (el as HTMLElement).style.getPropertyValue(p)
                  modifiedPropsList.push({ el: el as HTMLElement, prop: p, original: orig })
                  // 如果 computed value 中包含现代颜色函数，使用安全回退色
                  if (/oklch\(|oklab\(|lch\(|lab\(/i.test(v)) {
                    (el as HTMLElement).style.setProperty(p, '#6c757d', 'important')
                  } else {
                    (el as HTMLElement).style.setProperty(p, v, 'important')
                  }
                } catch (e) {}
              }
            })
            // SVG special: set attributes
            if ((el as SVGElement).tagName && (el as SVGElement).getAttribute) {
              const fill = cs.getPropertyValue('fill')
              const stroke = cs.getPropertyValue('stroke')
              if (fill) try { (el as SVGElement).setAttribute('fill', fill) } catch (e) {}
              if (stroke) try { (el as SVGElement).setAttribute('stroke', stroke) } catch (e) {}
            }
          } catch (e) {
            // ignore
          }
        })
      }

      try { inlineComputedColors(contentElement as HTMLElement) } catch (e) { /* ignore */ }

      // 再一步：尝试把可访问的样式表中的现代颜色函数替换为安全值，追加到页面末尾覆盖原规则
      const sanitizeStyleSheets = () => {
        try {
          let sanitized = ''
          Array.from(document.styleSheets).forEach(sheet => {
            try {
              const rules = (sheet as CSSStyleSheet).cssRules || []
              Array.from(rules).forEach((r: any) => {
                if (r.cssText && /oklch\(|oklab\(|lch\(|lab\(/i.test(r.cssText)) {
                  // 将现代颜色函数替换为中性灰，并增加 !important
                  let text = r.cssText.replace(/oklch\([^)]*\)/gi, '#6c757d')
                  text = text.replace(/oklab\([^)]*\)/gi, '#6c757d')
                  text = text.replace(/lch\([^)]*\)/gi, '#6c757d')
                  text = text.replace(/lab\([^)]*\)/gi, '#6c757d')
                  // 尝试在属性值后添加 !important（粗暴处理）
                  text = text.replace(/(:\s*#[0-9a-fA-F]{3,6}\s*)(;|})/g, '$1!important$2')
                  sanitized += text + '\n'
                }
              })
            } catch (e) {
              // 跨域样式表可能无法访问
            }
          })

          if (sanitized) {
            const el = document.createElement('style')
            el.id = 'sanitized-modern-colors'
            tempStyleIds.push(el.id)
            el.textContent = sanitized
            document.head.appendChild(el)
          }
        } catch (e) {
          // 忽略任何错误
        }
      }

      try { sanitizeStyleSheets() } catch (e) { /* ignore */ }

      // 结束后恢复被修改的内联样式/覆盖样式
      const restoreTempStyles = () => {
        try {
          // 恢复覆盖样式
          tempStyleIds.forEach(id => {
            const el = document.getElementById(id)
            if (el) el.remove()
          })
          // 恢复 inline cssText
          modifiedInlineList.forEach(item => {
            try { item.el.style.cssText = item.original } catch (e) {}
          })
          // 恢复单个属性（若原始值为空则移除该内联属性）
          modifiedPropsList.forEach(item => {
            try {
              if (item.original === null || item.original === undefined || item.original === '') {
                item.el.style.removeProperty(item.prop)
              } else {
                item.el.style.setProperty(item.prop, item.original)
              }
            } catch (e) {}
          })
        } catch (e) {}
      }

      // 动态导入 html2canvas
      const { default: html2canvas } = await import('html2canvas')

      // 使用较高的 scale 保证清晰度，并强制 html2canvas 使用整个文档的宽高进行渲染
      const globalScale = Math.max(2, window.devicePixelRatio || 1)
      const contentWidth = Math.max((contentElement as HTMLElement).scrollWidth, document.documentElement.scrollWidth || 0)
      const contentHeight = Math.max((contentElement as HTMLElement).scrollHeight, document.documentElement.scrollHeight || 0)

      // 确保滚动到顶部，避免部分内容未渲染
      try { window.scrollTo(0, 0) } catch (e) {}

      const canvas = await html2canvas(contentElement as HTMLElement, {
        scale: globalScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: contentWidth,
        height: contentHeight,
        windowWidth: contentWidth,
        windowHeight: contentHeight,
        scrollX: 0,
        scrollY: 0
      })

      // 将 canvas 切成 A4 比例的图片切片
      const A4_RATIO = 841.89 / 595.28 // 高/宽
      const pageWidth = canvas.width
      const pageHeight = Math.floor(pageWidth * A4_RATIO)

      const slices: string[] = []
      // 智能分页：优先在不切割块级元素的位置分页
      const contentRect = (contentElement as HTMLElement).getBoundingClientRect()
      const allElems = Array.from((contentElement as HTMLElement).querySelectorAll('*')) as HTMLElement[]
      const elementPositions = allElems.map(el => {
        const r = el.getBoundingClientRect()
        const top = r.top - contentRect.top + (contentElement as HTMLElement).scrollTop
        const height = r.height
        return { top, height }
      }).filter(p => p.height > 2) // 忽略极小元素

      // scale: css px -> canvas px
      const cssWidth = (contentElement as HTMLElement).scrollWidth || contentRect.width
      const scaleCssToCanvas = canvas.width / cssWidth

      const pageHeightPx = pageHeight // already in canvas px

      // 改为分段克隆并对每页进行截图（避免一次性超大 canvas 导致丢失/截断）
      const pageScale = Math.max(2, window.devicePixelRatio || 1)
      const contentWidthCss = Math.max((contentElement as HTMLElement).scrollWidth, document.documentElement.scrollWidth || 0)
      const contentHeightCss = Math.max((contentElement as HTMLElement).scrollHeight, document.documentElement.scrollHeight || 0)
      const pageHeightCss = Math.floor(contentWidthCss * A4_RATIO)

      // helper: copy computed styles from source subtree to destination subtree
      const copyComputedStylesRecursive = (srcRoot: HTMLElement, destRoot: HTMLElement) => {
        const copyStyle = (src: Element, dest: Element) => {
          try {
            const cs = window.getComputedStyle(src as Element)
            for (let i = 0; i < cs.length; i++) {
              const prop = cs[i]
              try { (dest as HTMLElement).style.setProperty(prop, cs.getPropertyValue(prop), cs.getPropertyPriority(prop)) } catch (e) {}
            }
          } catch (e) {}
        }

        // copy root
        copyStyle(srcRoot, destRoot)
        const srcEls = Array.from(srcRoot.querySelectorAll('*'))
        const destEls = Array.from(destRoot.querySelectorAll('*'))
        if (srcEls.length === destEls.length) {
          for (let i = 0; i < srcEls.length; i++) {
            copyStyle(srcEls[i], destEls[i])
          }
        }
      }

      // 确保页面完整渲染：滚动触发懒加载并等待资源
      try {
        // 1) 触发滚动到页面底部再回到顶部以加载懒加载内容
        await new Promise(r => {
          try { window.scrollTo(0, document.body.scrollHeight); } catch (e) {}
          setTimeout(() => { try { window.scrollTo(0, 0); } catch (e) {} ; r(null) }, 300)
        })

        // 2) 等待 webfont 与图片加载完毕
        try { await (document as any).fonts.ready } catch (e) {}
        const imgs = Array.from(document.images || []) as HTMLImageElement[]
        await Promise.all(imgs.map(i => i.decode ? i.decode().catch(() => {}) : Promise.resolve()))
      } catch (e) {
        // ignore
      }

      // 对每一页截图（按视窗裁切，处理 fixed 元素）
      // 处理 fixed 元素：将所有 fixed 元素在截图时改为 absolute 并记录原值以便恢复
      const fixedEls = Array.from(document.querySelectorAll('*')).filter((el: any) => getComputedStyle(el).position === 'fixed') as HTMLElement[]
      const fixedBackup: { el: HTMLElement, cssText: string }[] = []
      fixedEls.forEach(el => {
        fixedBackup.push({ el, cssText: el.style.cssText })
        // convert to absolute keeping same rect
        try {
          const r = el.getBoundingClientRect()
          el.style.position = 'absolute'
          el.style.left = r.left + 'px'
          el.style.top = r.top + 'px'
          el.style.right = 'auto'
        } catch (e) {}
      })

      for (let top = 0; top < contentHeightCss; top += pageHeightCss) {
        try { window.scrollTo(0, top) } catch (e) {}
        await new Promise(r => setTimeout(r, 400))

        const pageCanvas = await html2canvas(document.documentElement as HTMLElement, {
          scale: pageScale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: contentWidthCss,
          height: pageHeightCss,
          windowWidth: contentWidthCss,
          windowHeight: pageHeightCss,
          scrollX: 0,
          scrollY: top
        })

        slices.push(pageCanvas.toDataURL('image/png'))
      }

      // 恢复 fixed 元素样式
      fixedBackup.forEach(b => { b.el.style.cssText = b.cssText })

      // 恢复之前临时修改的样式/属性
      try { restoreTempStyles() } catch (e) { console.warn('restoreTempStyles failed', e) }

      // 上传图片切片到后端合成
      const composeResp = await fetch('/api/pdf/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: slices, filename: filename || `export_${new Date().toISOString().slice(0,10)}.pdf` })
      })

      if (!composeResp.ok) {
        const txt = await composeResp.text().catch(() => '')
        throw new Error(`合成失败: ${composeResp.status} ${txt}`)
      }

      const blob = await composeResp.blob()
      const urlObj = URL.createObjectURL(blob)
      setPreviewUrl(urlObj)
      setPreviewBlob(blob)
      setFilename(filename || `export_${new Date().toISOString().slice(0,10)}.pdf`)
    } catch (err) {
      try { restoreTempStyles() } catch (e) { console.warn('restoreTempStyles failed', e) }
      console.error(err)
      alert(err instanceof Error ? err.message : '导出失败')
    } finally {
      try { restoreTempStyles() } catch (e) { /* ignore */ }
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
    // close preview then reload page to restore colors/styles
    try {
      closePreview()
    } catch (e) {}
    try {
      if (typeof window !== 'undefined') {
        // slight delay to ensure download initiated
        setTimeout(() => { try { window.location.reload() } catch (e) {} }, 300)
      }
    } catch (e) {}
  }

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl('')
    setPreviewBlob(null)
    // reload page to restore any temporary style changes
    try {
      if (typeof window !== 'undefined') {
        setTimeout(() => { try { window.location.reload() } catch (e) {} }, 100)
      }
    } catch (e) {}
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


