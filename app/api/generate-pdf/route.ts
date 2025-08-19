import { NextRequest } from 'next/server'

// 注意：此 route 假定在有 Node 环境的 Next.js 服务器上运行（非 Edge）。
// 在 serverless 平台或 Vercel 的 Edge runtime 上可能无法启动 Chromium。

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { url, html, cookies = [], pdfOptions = {}, viewportWidth } = body as {
    url?: string
    html?: string
    cookies?: Array<{ name: string; value: string; domain?: string; path?: string }>
    pdfOptions?: Record<string, any>
    viewportWidth?: number
  }

  // 延迟加载 puppeteer，避免在不需要时将其打包/加载
  let puppeteer: any
  try {
    puppeteer = await import('puppeteer')
  } catch (err) {
    console.error('puppeteer import failed', err)
    return new Response(JSON.stringify({ error: 'Puppeteer not available on server' }), { status: 500 })
  }

  let browser: any = null
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    })

    const page = await browser.newPage()

    if (viewportWidth && typeof viewportWidth === 'number') {
      await page.setViewport({ width: viewportWidth, height: 900 })
    }

    // 如果请求携带认证头（例如前端把 cookie header 传过来），可设置额外 header
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      await page.setExtraHTTPHeaders({ Authorization: authHeader })
    }

    // 设置 cookies（如果提供）
    if (Array.isArray(cookies) && cookies.length) {
      // puppeteer 的 cookie format 要求 domain/path 等合法
      await page.setCookie(...cookies as any)
    }

    // 如果请求携带 cookie header（来自前端浏览器），将其注入到 Puppeteer 会话中，确保以登录态渲染
    try {
      const cookieHeader = req.headers.get('cookie')
      if (cookieHeader && url) {
        // 将 cookie 字符串解析为 name/value，并设置到目标域
        const domain = new URL(url).hostname
        const cookiePairs = cookieHeader.split(/;\s*/).map(pair => {
          const idx = pair.indexOf('=')
          const name = pair.substring(0, idx)
          const value = pair.substring(idx + 1)
          return { name, value, domain }
        })
        try {
          await page.setCookie(...(cookiePairs as any))
        } catch (e) {
          // 如果 setCookie 失败，回退到设置请求 header，至少资源请求会带上 cookie
          await page.setExtraHTTPHeaders({ cookie: cookieHeader })
        }
      } else if (req.headers.get('cookie')) {
        // 若没有目标 url，则仍设置 header，帮助加载资源
        await page.setExtraHTTPHeaders({ cookie: String(req.headers.get('cookie')) })
      }
    } catch (e) {
      console.warn('[PDF] inject cookies failed', e)
    }

    if (html) {
      await page.setContent(html, { waitUntil: 'networkidle0' })
    } else if (url) {
      // 跳转到目标 URL
      await page.goto(url, { waitUntil: 'networkidle0' })
    } else {
      return new Response(JSON.stringify({ error: '需要 url 或 html' }), { status: 400 })
    }

    // 设置视窗和 UA，确保页面按桌面渲染
    try {
      await page.setViewport({ width: viewportWidth || 1280, height: 900 })
    } catch (e) {
      // ignore
    }
    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      )
    } catch (e) {}

    // 优先使用 screen 样式，避免被 print 媒体查询隐藏主要内容
    try {
      await (page as any).emulateMediaType && await (page as any).emulateMediaType('screen')
    } catch (e) {}

    // 等待常见页面容器渲染完毕（多重尝试），提高渲染稳定性
    const possibleSelectors = ['main', '#root', '.dashboard-content', '.main-content']
    for (const sel of possibleSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 2000 })
        break
      } catch (e) {
        // try next
      }
    }

    // 等待 main 里有一定文本长度，表示数据已渲染
    try {
      await page.waitForFunction(() => {
        const el = document.querySelector('main') || document.querySelector('#root') || document.querySelector('.dashboard-content')
        return !!el && el.innerText && el.innerText.trim().length > 50
      }, { timeout: 5000 })
    } catch (e) {
      // 超时也继续，后端会记录高度用于调试
    }

    // 打印调试信息：页面高度
    try {
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
      console.log('[PDF] page.scrollHeight =', pageHeight)
    } catch (e) {}

    // 等待字体加载
    try {
      await page.evaluate(() => (document.fonts ? (document.fonts as any).ready : Promise.resolve()))
    } catch (e) {
      // ignore
    }

    const defaultPdfOptions = {
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
    }

    const finalOptions = Object.assign({}, defaultPdfOptions, pdfOptions)

    // 注入覆盖样式，展开所有可能的 100vh / 固定高度 / 可滚动容器，避免在打印/生成 PDF 时内容被裁剪
    try {
      await page.addStyleTag({
        content: `
          html, body {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          * {
            max-height: none !important;
            max-width: none !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          [style*="100vh"], [style*="height: 100vh"], [style*="min-height: 100vh"] {
            height: auto !important;
            min-height: auto !important;
          }
          /* 将固定定位转为相对，避免分页遮挡 */
          [style*="position: fixed"], [style*="position: absolute"] {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            right: auto !important;
            bottom: auto !important;
          }
          /* 隐藏非内容的浮动控件（如悬浮按钮） */
          .no-export, .hide-on-pdf, .floating-action { display: none !important; }
        `
      })

      // 额外在 DOM 层面强制展开常见容器
      await page.evaluate(() => {
        try {
          document.querySelectorAll<HTMLElement>('*').forEach(el => {
            try {
              const cs = window.getComputedStyle(el as Element);
              if (cs.position === 'fixed' || cs.position === 'absolute') {
                (el as HTMLElement).style.position = 'relative';
              }
              if ((el as HTMLElement).style.height && /vh|px/.test((el as HTMLElement).style.height)) {
                (el as HTMLElement).style.height = 'auto';
              }
              (el as HTMLElement).style.overflow = 'visible';
              (el as HTMLElement).style.maxHeight = 'none';
            } catch (e) {
              // ignore element-specific errors
            }
          })
        } catch (e) {
          // ignore
        }
      })

      // 等待重绘与资源加载（兼容不同 Puppeteer 版本）
      await new Promise(resolve => setTimeout(resolve, 400))
    } catch (e) {
      console.warn('[PDF] inject style failed', e)
    }

    const buffer = await page.pdf(finalOptions)

    const filename = `export_${new Date().toISOString().slice(0,10)}.pdf`

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length)
      }
    })
  } catch (err: any) {
    console.error('PDF generation failed', err)
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 })
  } finally {
    if (browser) await browser.close()
  }
}


