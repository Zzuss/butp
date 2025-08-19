// app/api/generate-pdf-proxy/route.ts
// App route proxy: forwards requests to internal PDF service

const PDF_SERVICE = process.env.PDF_SERVICE_URL || 'http://10.3.58.3:8000/generate-pdf'
const PDF_KEY = process.env.PDF_SERVICE_KEY || ''

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Forward browser cookie so upstream can render authenticated pages
    const cookie = req.headers.get('cookie')
    if (cookie) headers['cookie'] = cookie
    if (PDF_KEY) headers['x-pdf-key'] = PDF_KEY

    const upstream = await fetch(PDF_SERVICE, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!upstream.ok) {
      const txt = await upstream.text().catch(() => '')
      return new Response(JSON.stringify({ error: 'upstream failed', detail: txt }), { status: 502 })
    }

    const arrayBuf = await upstream.arrayBuffer()
    const contentDisposition = upstream.headers.get('content-disposition') || 'attachment; filename="export.pdf"'
    const contentType = upstream.headers.get('content-type') || 'application/pdf'

    return new Response(arrayBuf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition
      }
    })
  } catch (err: any) {
    console.error('generate-pdf-proxy error', err && (err.stack || err.message || err))
    return new Response(JSON.stringify({ error: String(err && err.message) }), { status: 500 })
  }
}

// Handle CORS preflight from browser (if needed)
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,x-pdf-key',
      'Access-Control-Allow-Credentials': 'true'
    }
  })
}