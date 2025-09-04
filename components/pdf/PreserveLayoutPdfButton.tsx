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
  const [viewport] = useState<number>(defaultViewport)
  const [paperSizeKey, setPaperSizeKey] = useState<string>('A4')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [filename, setFilename] = useState<string>('')

  const handleExport = async () => {
    // 临时记录集合与恢复函数需要在 try/catch 外部可见，以便在异常路径恢复样式
    const tempStyleIds: string[] = []
    const modifiedInlineList: Array<{ el: HTMLElement, original: string }> = []
    const modifiedPropsList: Array<{ el: HTMLElement, prop: string, original: string }> = []
    function restoreTempStyles() {
      try {
        tempStyleIds.forEach(id => {
          const el = document.getElementById(id)
          if (el) el.remove()
        })
        modifiedInlineList.forEach(item => {
          try { item.el.style.cssText = item.original } catch (e) {}
        })
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

    try {
      setIsLoading(true)
      const url = getUrl()
      console.log('[pdf-export] start', { url, viewport })

      const paperSizes: Record<string, { width: number; height: number }> = {
        A4: { width: 595.28, height: 841.89 },
        A3: { width: 841.89, height: 1190.55 },
        Letter: { width: 612, height: 792 }
      }

      const pageSize = paperSizes[paperSizeKey] || paperSizes.A4

      const body = {
        url,
        viewportWidth: viewport,
        pageSize,
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
      try { console.log('[pdf-export] contentElement', contentElement.tagName, 'scrollWidth', (contentElement as HTMLElement).scrollWidth, 'scrollHeight', (contentElement as HTMLElement).scrollHeight) } catch (e) {}

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
              // 如果元素包含 canvas 或 svg（图表），不要把它的背景或颜色改为透明/深色，以免遮挡或不可读
              const hasChartDescendant = !!htmlEl.querySelector('canvas, svg')
              if (!hasChartDescendant) {
                // 对内联样式：将可能影响可见背景的现代颜色替换为透明
                s = s.replace(/(background[^:;{]*:\s*)oklch\([^)]*\)/gi, '$1transparent')
                s = s.replace(/(background[^:;{]*:\s*)oklab\([^)]*\)/gi, '$1transparent')
                s = s.replace(/(background[^:;{]*:\s*)lch\([^)]*\)/gi, '$1transparent')
                s = s.replace(/(background[^:;{]*:\s*)lab\([^)]*\)/gi, '$1transparent')
              }
              // 不对文本/边框等颜色强制替换为深色，其他颜色将由 inlineComputedColors 处理
              htmlEl.style.cssText = s
            }
          })
        } catch (e) {
          // 忽略任何替换错误，继续截图
          console.warn('fixModernColors error', e)
        }
      }

      // 在截图前运行修复
      try { fixModernColors(contentElement as HTMLElement); console.log('[pdf-export] fixModernColors applied') } catch (e) { console.warn('[pdf-export] fixModernColors error', e) }

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
                  // 如果 computed value 中包含现代颜色函数，尝试解析为浏览器可识别的值或使用安全回退
                  if (/oklch\(|oklab\(|lch\(|lab\(/i.test(v)) {
                    try {
                      const cvs = document.createElement('canvas')
                      const ctx = cvs.getContext('2d')
                      if (ctx) {
                        ctx.fillStyle = v
                        const resolved = ctx.fillStyle
                        if (resolved && resolved !== v) {
                          (el as HTMLElement).style.setProperty(p, resolved, 'important')
                        } else {
                          if (p.includes('background') || p === 'fill' || p === 'stroke') {
                            (el as HTMLElement).style.setProperty(p, 'transparent', 'important')
                          } else {
                            (el as HTMLElement).style.setProperty(p, '#111827', 'important')
                          }
                        }
                      } else {
                        if (p.includes('background') || p === 'fill' || p === 'stroke') {
                          (el as HTMLElement).style.setProperty(p, 'transparent', 'important')
                        } else {
                          (el as HTMLElement).style.setProperty(p, '#111827', 'important')
                        }
                      }
                    } catch (e) {
                      if (p.includes('background') || p === 'fill' || p === 'stroke') {
                        (el as HTMLElement).style.setProperty(p, 'transparent', 'important')
                      } else {
                        (el as HTMLElement).style.setProperty(p, '#111827', 'important')
                      }
                    }
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

      try { inlineComputedColors(contentElement as HTMLElement); console.log('[pdf-export] inlineComputedColors applied') } catch (e) { console.warn('[pdf-export] inlineComputedColors error', e) }

      // 再一步：尝试把可访问的样式表中的现代颜色函数替换为安全值，追加到页面末尾覆盖原规则
      const sanitizeStyleSheets = () => {
        try {
          let sanitized = ''
          Array.from(document.styleSheets).forEach(sheet => {
            try {
              const rules = (sheet as CSSStyleSheet).cssRules || []
              Array.from(rules).forEach((r: any) => {
                if (r.cssText && /oklch\(|oklab\(|lch\(|lab\(/i.test(r.cssText)) {
                  // 更保守地处理样式：对 background 系列属性使用 transparent 回退，
                  // 其他颜色属性保留计算值或由 inlineComputedColors 处理，避免将图表背景或文字替换为不可读的灰色
                  let text = r.cssText
                  // 背景相关属性 -> transparent
                  text = text.replace(/(background[^:;{]*:\s*)oklch\([^)]*\)/gi, '$1transparent')
                  text = text.replace(/(background[^:;{]*:\s*)oklab\([^)]*\)/gi, '$1transparent')
                  text = text.replace(/(background[^:;{]*:\s*)lch\([^)]*\)/gi, '$1transparent')
                  text = text.replace(/(background[^:;{]*:\s*)lab\([^)]*\)/gi, '$1transparent')
                  // 其他颜色函数替换为深色，避免视觉上变成浅灰遮罩
                  text = text.replace(/oklch\([^)]*\)/gi, '#111827')
                  text = text.replace(/oklab\([^)]*\)/gi, '#111827')
                  text = text.replace(/lch\([^)]*\)/gi, '#111827')
                  text = text.replace(/lab\([^)]*\)/gi, '#111827')
                  // 为替换的十六进制颜色添加 !important，防止被原样式覆盖
                  text = text.replace(/(:\s*#([0-9a-fA-F]{3,6}))(;|})/g, '$1!important$3')
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

      try { sanitizeStyleSheets(); console.log('[pdf-export] sanitizeStyleSheets applied') } catch (e) { console.warn('[pdf-export] sanitizeStyleSheets error', e) }

      // 结束后恢复被修改的内联样式/覆盖样式
      function restoreTempStyles() {
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
      console.log('[pdf-export] html2canvas loaded')

      // 使用合理的 scale 保证清晰度，避免生成过大的图片导致请求体过大
      const globalScale = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
      const contentWidth = Math.max((contentElement as HTMLElement).scrollWidth, document.documentElement.scrollWidth || 0)
      const contentHeight = Math.max((contentElement as HTMLElement).scrollHeight, document.documentElement.scrollHeight || 0)
      console.log('[pdf-export] content dims', { contentWidth, contentHeight, globalScale })

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
      // 单页截图 scale，限制最大值以控制每页图片体积
      const pageScale = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
      // contentWidthCss / contentHeightCss 将在识别出 scrollContainer 后计算

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

      // 在导出前通知页面组件切换到导出模式（会禁用虚拟化并渲染全部项）
      try { window.dispatchEvent(new Event('pdf-export-start')); console.log('[pdf-export] dispatched pdf-export-start') } catch (e) { console.warn('[pdf-export] dispatch start failed', e) }

      // 等待页面组件在 exportMode 下完成渲染：
      // 1) 监听 'pdf-export-ready' 事件（由列表组件在渲染完成后触发）
      // 2) 附加回退超时，避免永远等待
      const waitForExportReady = (timeout = 3000) => new Promise<void>((resolve) => {
        let resolved = false
        const onReady = () => { if (resolved) return; resolved = true; cleanup(); resolve() }
        const cleanup = () => {
          window.removeEventListener('pdf-export-ready', onReady)
        }
        window.addEventListener('pdf-export-ready', onReady)
        setTimeout(() => { if (resolved) return; resolved = true; cleanup(); resolve() }, timeout)
      })

      try {
        // 等待组件通知或超时
        console.log('[pdf-export] waiting for pdf-export-ready (max 3000ms)')
        await waitForExportReady(3000)
        console.log('[pdf-export] waitForExportReady done')
      } catch (e) {
        console.warn('[pdf-export] waitForExportReady error', e)
      }

      // 确保页面完整渲染：逐步滚动触发懒加载并等待资源（保留原有滚动逻辑）
      try {
        const totalH = document.body.scrollHeight || document.documentElement.scrollHeight || 0
        const step = Math.max(300, Math.floor(totalH / 10))
        for (let y = 0; y <= totalH; y += step) {
          try { window.scrollTo(0, y) } catch (e) {}
          // 等待一些时间让懒加载触发
          // eslint-disable-next-line no-await-in-loop
          await new Promise(r => setTimeout(r, 200))
        }

        // 额外：查找任何内部可滚动容器并逐个触发滚动，以促使虚拟化列表渲染全部子元素
        const scrollables = Array.from(document.querySelectorAll('*')).filter((el: Element) => {
          try {
            const s = getComputedStyle(el as Element)
            return (s.overflowY === 'auto' || s.overflowY === 'scroll') && (el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight
          } catch (e) { return false }
        }) as HTMLElement[]

        console.log('[pdf-export] found scrollable containers', scrollables.length)
        for (const sc of scrollables) {
          try {
            const h = sc.scrollHeight
            const stepInner = Math.max(200, Math.floor(h / 8))
            for (let y = 0; y <= h; y += stepInner) {
              sc.scrollTop = y
              // eslint-disable-next-line no-await-in-loop
              await new Promise(r => setTimeout(r, 120))
            }
            sc.scrollTop = 0
          } catch (e) {}
        }
        // 回到顶部
        try { window.scrollTo(0, 0) } catch (e) {}

        // 等待 webfont 与图片加载完毕
        try { await (document as any).fonts.ready } catch (e) {}
        const imgs = Array.from(document.images || []) as HTMLImageElement[]
        await Promise.all(imgs.map(i => i.decode ? i.decode().catch(() => {}) : Promise.resolve()))
        // 再短暂等待，确保渲染稳定
        await new Promise(r => setTimeout(r, 250))
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

      // Detect actual scroll container (some layouts use an inner scrollable container)
      const findDeepestScrollContainer = (root: HTMLElement) => {
        try {
          const all = Array.from(root.querySelectorAll('*')) as HTMLElement[]
          const candidates = all.filter(el => {
            try {
              return (el.scrollHeight > el.clientHeight) && getComputedStyle(el).overflowY.match(/auto|scroll/)
            } catch (e) { return false }
          })
          if (candidates.length === 0) return null
          // pick the one with largest scrollHeight
          candidates.sort((a, b) => b.scrollHeight - a.scrollHeight)
          return candidates[0]
        } catch (e) { return null }
      }

      let scrollContainer: HTMLElement | null = null
      try {
        // prefer explicit main or #root if they are scrollable
        const prefer = [document.querySelector('main'), document.querySelector('#root')].find(n => n && (n as HTMLElement).scrollHeight > (n as HTMLElement).clientHeight) as HTMLElement | undefined
        if (prefer) scrollContainer = prefer
        else scrollContainer = findDeepestScrollContainer(document.body) || document.documentElement
      } catch (e) {
        scrollContainer = document.documentElement
      }
      console.log('[pdf-export] scrollContainer', scrollContainer?.tagName || 'unknown', 'scrollHeight', (scrollContainer as HTMLElement)?.scrollHeight, 'clientHeight', (scrollContainer as HTMLElement)?.clientHeight)

      // Clone-only pagination: create a single offscreen clone of the scroll container and shift its marginTop per page
      const cloneRoot = (scrollContainer as HTMLElement || contentElement as HTMLElement).cloneNode(true) as HTMLElement
      copyComputedStylesRecursive(scrollContainer as HTMLElement, cloneRoot)
      cloneRoot.style.boxSizing = 'border-box'
      // 之后再设置宽高

      const wrapper = document.createElement('div')
      wrapper.style.position = 'absolute'
      wrapper.style.left = '-9999px'
      wrapper.style.top = '0'
      // wrapper 的宽高随后设置为 pageWidth/pageHeight
      wrapper.style.overflow = 'hidden'
      wrapper.style.background = 'white'

      wrapper.appendChild(cloneRoot)
      document.body.appendChild(wrapper)

      // 复制原始 DOM 中的 canvas 像素内容到 clone 中对应的 canvas，
      // cloneNode 不会拷贝 canvas 的 bitmap，所以需要手动拷贝以保证图表可见
      try {
        const srcRootEl = (scrollContainer as HTMLElement) || (contentElement as HTMLElement)
        const srcCanvases = Array.from(srcRootEl.querySelectorAll('canvas')) as HTMLCanvasElement[]
        const destCanvases = Array.from(cloneRoot.querySelectorAll('canvas')) as HTMLCanvasElement[]
        const count = Math.min(srcCanvases.length, destCanvases.length)
        for (let i = 0; i < count; i++) {
          try {
            const s = srcCanvases[i]
            const d = destCanvases[i]
            // 保持像素尺寸
            d.width = s.width
            d.height = s.height
            // 复制显示尺寸样式
            try { d.style.width = getComputedStyle(s).width } catch (e) {}
            try { d.style.height = getComputedStyle(s).height } catch (e) {}
            const dctx = d.getContext('2d')
            if (dctx) {
              dctx.clearRect(0, 0, d.width, d.height)
              dctx.drawImage(s, 0, 0)
            }
          } catch (e) {}
        }
      } catch (e) {}

      // 针对包含百分比/统计数值的小组件（如你贴的 HTML），优先保留/设置背景为白色并将内部文字颜色内联化，
      // 避免被其他遮罩或样式修改造成文字不可见。
      try {
        const statCandidates = Array.from(cloneRoot.querySelectorAll('*')).filter(el => {
          try {
            const html = (el as HTMLElement).innerText || ''
            if (/\d+%/.test(html)) return true
            const cls = (el as HTMLElement).className || ''
            if (/\btext-4xl\b|\bfont-bold\b|\btext-xl\b/.test(cls)) return true
            return false
          } catch (e) { return false }
        }) as HTMLElement[]

        for (const el of statCandidates) {
          try {
            // 找到最靠近的容器（向上到带有 padding 的元素）
            let container: HTMLElement | null = el
            for (let i = 0; i < 6 && container; i++) {
              const c = container as HTMLElement
              const cs = getComputedStyle(c)
              if (parseFloat(cs.paddingTop || '0') > 0 || parseFloat(cs.paddingLeft || '0') > 0) break
              container = c.parentElement
            }
            if (!container) container = el

            // 将容器背景设为白色（仅修改 clone）并去掉 box-shadow
            container.style.setProperty('background', '#ffffff', 'important')
            container.style.setProperty('background-color', '#ffffff', 'important')
            container.style.setProperty('box-shadow', 'none', 'important')

            // 内联化文本颜色，确保蓝色等不会被替换为深灰
            const textEls = Array.from(container.querySelectorAll('*')) as HTMLElement[]
            textEls.push(container)
            textEls.forEach(t => {
              try {
                const cs = getComputedStyle(t)
                const color = cs.getPropertyValue('color')
                if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') {
                  t.style.setProperty('color', color, 'important')
                }
              } catch (e) {}
            })
          } catch (e) {}
        }
      } catch (e) {}

      // 识别并中和 clone 中可能覆盖图表的深色遮罩/伪元素（仅修改 clone），避免遮挡图表文本
      try {
        const parseRgb = (v: string) => {
          try {
            v = v.trim()
            const m = v.match(/rgba?\(([^)]+)\)/i)
            if (m) {
              const parts = m[1].split(',').map(s => s.trim())
              const r = parseInt(parts[0], 10)
              const g = parseInt(parts[1], 10)
              const b = parseInt(parts[2], 10)
              return [r, g, b]
            }
            const mh = v.match(/^#([0-9a-f]{3,8})$/i)
            if (mh) {
              let hex = mh[1]
              if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
              if (hex.length >= 6) {
                const r = parseInt(hex.slice(0, 2), 16)
                const g = parseInt(hex.slice(2, 4), 16)
                const b = parseInt(hex.slice(4, 6), 16)
                return [r, g, b]
              }
            }
          } catch (e) {}
          return null
        }
        const luminance = (r: number, g: number, b: number) => {
          const srgb = [r/255, g/255, b/255].map(c => (c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4)))
          return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
        }

        const candidates = Array.from(cloneRoot.querySelectorAll('*')) as HTMLElement[]
        const overlays: HTMLElement[] = []
        for (const el of candidates) {
          try {
            const cs = getComputedStyle(el)
            const bg = cs.getPropertyValue('background-color') || cs.getPropertyValue('background')
            if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') continue
            const rgb = parseRgb(bg)
            if (!rgb) continue
            const lum = luminance(rgb[0], rgb[1], rgb[2])
            const opacity = parseFloat(cs.getPropertyValue('opacity') || '1') || 1
            const rect = el.getBoundingClientRect()
            const area = rect.width * rect.height
            const z = cs.getPropertyValue('z-index')
            const hasChart = !!el.querySelector('canvas, svg')
            // 深色、面积较大且不为图表本体的元素视为可能遮罩
            if (lum < 0.12 && opacity > 0.5 && area > 400 && !hasChart) {
              overlays.push(el)
            }
          } catch (e) {}
        }

        if (overlays.length > 0) {
          const sid = 'pdf-clone-skip-bg'
          const styleEl = document.createElement('style')
          styleEl.id = sid
          // 伪元素也可能造成遮挡，追加一个通用覆盖规则
          styleEl.textContent = `[data-pdf-skip-bg] { background: transparent !important; background-color: transparent !important; box-shadow: none !important; }
[data-pdf-skip-bg]::before, [data-pdf-skip-bg]::after { background: transparent !important; box-shadow: none !important; }
`
          document.head.appendChild(styleEl)
          tempStyleIds.push(sid)
          overlays.forEach(el => {
            try {
              el.setAttribute('data-pdf-skip-bg', '1')
              el.style.setProperty('background', 'transparent', 'important')
              el.style.setProperty('background-color', 'transparent', 'important')
              el.style.setProperty('box-shadow', 'none', 'important')
            } catch (e) {}
          })
        }
      } catch (e) {}

      // 计算 contentWidthCss/contentHeightCss/pageHeightCss 基于选中的 scrollContainer
      const contentWidthCss = Math.max(((scrollContainer as HTMLElement)?.scrollWidth) || (contentElement as HTMLElement).scrollWidth, document.documentElement.scrollWidth || 0)
      const contentHeightCss = Math.max(((scrollContainer as HTMLElement)?.scrollHeight) || (contentElement as HTMLElement).scrollHeight, document.documentElement.scrollHeight || 0)
      console.log('[pdf-export] contentWidthCss/contentHeightCss computed', contentWidthCss, contentHeightCss)
      const pageHeightCss = Math.floor(contentWidthCss * A4_RATIO)

      wrapper.style.width = contentWidthCss + 'px'
      wrapper.style.height = pageHeightCss + 'px'

      // 确保 cloneRoot 高度覆盖全部内容
      cloneRoot.style.width = contentWidthCss + 'px'
      cloneRoot.style.height = contentHeightCss + 'px'

      for (let top = 0; top < contentHeightCss; top += pageHeightCss) {
        cloneRoot.style.marginTop = `-${top}px`
        // 等待 clone 中的图片加载和布局稳定
        await new Promise(r => setTimeout(r, 400))
        const imgsInWrapper = Array.from(wrapper.querySelectorAll('img')) as HTMLImageElement[]
        await Promise.all(imgsInWrapper.map(i => i.decode ? i.decode().catch(() => {}) : Promise.resolve()))
        console.log('[pdf-export] rendering page top', top, 'pageHeightCss', pageHeightCss)
        const pageCanvas = await html2canvas(wrapper as HTMLElement, {
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
        // 基于 DOM 的裁切：定位 cloneRoot 内最可能的内容元素（避免像素误裁），并把那块从 pageCanvas 抽取出来
        const domCropFromCanvas = (pageCanvas: HTMLCanvasElement, wrapperEl: HTMLElement, cloneRootEl: HTMLElement) => {
          try {
            // 找到候选内容元素：优先常见选择器，否则选取 cloneRoot 中最大的元素
            const selectors = ['.report', '#report', '.dashboard', '.main-report', '.content', '#root', 'main']
            let contentEl: HTMLElement | null = null
            for (const s of selectors) {
              const found = cloneRootEl.querySelector(s) as HTMLElement | null
              if (found && typeof found.getBoundingClientRect === 'function' && found.offsetWidth > 50) { contentEl = found; break }
            }
            if (!contentEl) {
              // 选择 cloneRoot 中可见面积最大的子元素
              const children = Array.from(cloneRootEl.querySelectorAll('*')) as HTMLElement[]
              let best: HTMLElement | null = null
              let bestArea = 0
              children.forEach(ch => {
                try {
                  const r = ch.getBoundingClientRect()
                  const area = r.width * r.height
                  if (area > bestArea) { bestArea = area; best = ch }
                } catch (e) {}
              })
              contentEl = best || cloneRootEl
            }

            const wrapperRect = wrapperEl.getBoundingClientRect()
            const contentRect = contentEl.getBoundingClientRect()

            // 画布像素与 CSS px 的比例
            const scaleCanvas = pageCanvas.width / wrapperRect.width

            const sx = Math.max(0, Math.round((contentRect.left - wrapperRect.left) * scaleCanvas))
            const sy = Math.max(0, Math.round((contentRect.top - wrapperRect.top) * scaleCanvas))
            const sw = Math.max(1, Math.round(contentRect.width * scaleCanvas))
            const sh = Math.max(1, Math.round(contentRect.height * scaleCanvas))

            const out = document.createElement('canvas')
            out.width = sw
            out.height = sh
            const octx = out.getContext('2d')!
            octx.drawImage(pageCanvas, sx, sy, sw, sh, 0, 0, sw, sh)
            return out
          } catch (e) {
            return pageCanvas
          }
        }

        try {
          const cropped = domCropFromCanvas(pageCanvas, wrapper, cloneRoot)
          const JPEG_QUALITY = 0.8
          const dataUrl = cropped.toDataURL('image/jpeg', JPEG_QUALITY)
          slices.push(dataUrl)
          console.log('[pdf-export] page slice', slices.length, 'top', top, 'canvas', pageCanvas.width, pageCanvas.height, 'cropped', cropped.width, cropped.height, 'dataUrlLen', dataUrl.length)
        } catch (e) {
          console.warn('[pdf-export] page slice failed', e)
          slices.push('')
        }
      }

      document.body.removeChild(wrapper)

      // 恢复 fixed 元素样式
      fixedBackup.forEach(b => { b.el.style.cssText = b.cssText })

      // 恢复之前临时修改的样式/属性
      try { restoreTempStyles() } catch (e) { console.warn('restoreTempStyles failed', e) }

      // 通知页面组件恢复虚拟化渲染
      try { window.dispatchEvent(new Event('pdf-export-end')) } catch (e) {}

      // 上传图片切片到后端合成
      console.log('[pdf-export] slices count before upload', slices.length, 'firstLens', slices.slice(0,3).map(s=>s?.length))

      // 估算请求体大小，若超过阈值则尝试进一步压缩（逐步降低 JPEG 质量）
      const estimateBytes = (dataUrl: string) => {
        if (!dataUrl) return 0
        const idx = dataUrl.indexOf(',')
        const base64 = dataUrl.slice(idx + 1)
        return Math.ceil((base64.length * 3) / 4)
      }

      const totalBytes = slices.reduce((sum, s) => sum + estimateBytes(s || ''), 0)
      const MAX_BYTES = 5 * 1024 * 1024 // 5 MB conservative limit for serverless
      console.log('[pdf-export] estimated payload bytes', totalBytes, 'max', MAX_BYTES)

      if (totalBytes > MAX_BYTES) {
        console.warn('[pdf-export] payload too large, attempting recompression...')
        // 逐步降低质量并重编码
        const recompress = async (dataUrl: string, quality: number) => {
          return new Promise<string>((resolve) => {
            try {
              const img = new Image()
              img.onload = () => {
                try {
                  const c = document.createElement('canvas')
                  c.width = img.width
                  c.height = img.height
                  const ctx = c.getContext('2d')!
                  ctx.drawImage(img, 0, 0)
                  const out = c.toDataURL('image/jpeg', quality)
                  resolve(out)
                } catch (e) { resolve(dataUrl) }
              }
              img.onerror = () => resolve(dataUrl)
              img.src = dataUrl
            } catch (e) { resolve(dataUrl) }
          })
        }

        let quality = 0.7
        for (; quality >= 0.3; quality -= 0.2) {
          const newSlices: string[] = []
          for (const s of slices) {
            if (!s) { newSlices.push(s); continue }
            // eslint-disable-next-line no-await-in-loop
            const out = await recompress(s, quality)
            newSlices.push(out)
          }
          const newTotal = newSlices.reduce((sum, s) => sum + estimateBytes(s || ''), 0)
          console.log('[pdf-export] recompressed at', quality, 'totalBytes', newTotal)
          slices.splice(0, slices.length, ...newSlices)
          if (newTotal <= MAX_BYTES) break
        }
      }

      const composeResp = await fetch('/api/pdf/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: slices, filename: filename || `export_${new Date().toISOString().slice(0,10)}.pdf`, pageSize: pageSize })
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
        <Button onClick={handleExport} disabled={isLoading} size="sm">
          {isLoading ? '导出中...' : '导出 PDF'}
        </Button>

        <select
          value={paperSizeKey}
          onChange={e => setPaperSizeKey(e.target.value)}
          className="border px-2 py-1 text-sm bg-white"
          aria-label="选择纸张大小"
          style={{ minWidth: 120 }}
        >
          <option value="A4">A4 (210 × 297 mm)</option>
          <option value="A3">A3 (297 × 420 mm)</option>
          <option value="Letter">Letter (8.5 × 11 in)</option>
        </select>
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


