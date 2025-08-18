import { NextRequest } from 'next/server'

// Proxy endpoint: Next.js server validates user session then forwards request to internal pdf-service
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    // Basic auth check: forward cookies to internal auth endpoint to verify session
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://butp.tech'
    const authRes = await fetch(`${siteUrl}/api/auth/user`, {
      headers: { cookie: req.headers.get('cookie') || '' }
    })

    if (authRes.status !== 200) {
      return new Response(JSON.stringify({ error: '未认证' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    // Forward to pdf-service (configured via env or default to localhost)
    const pdfServiceUrl = process.env.PDF_SERVICE_URL || 'http://127.0.0.1:3001/generate-pdf'

    const forwardRes = await fetch(pdfServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // forward cookie so pdf-service renders with the same session
        cookie: req.headers.get('cookie') || ''
      },
      body: JSON.stringify(body)
    })

    const arrayBuffer = await forwardRes.arrayBuffer()

    const headers = new Headers()
    const contentType = forwardRes.headers.get('content-type')
    if (contentType) headers.set('Content-Type', contentType)
    const contentDisp = forwardRes.headers.get('content-disposition')
    if (contentDisp) headers.set('Content-Disposition', contentDisp)

    return new Response(arrayBuffer, { status: forwardRes.status, headers })
  } catch (err: any) {
    console.error('PDF proxy error', err)
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}


