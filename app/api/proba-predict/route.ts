import { NextRequest, NextResponse } from 'next/server'

// 明确使用 Node.js 运行时，确保可在请求时读取 process.env
export const runtime = 'nodejs'

type FeatureValues = Record<string, number>

export async function GET() {
  const url = process.env.PROBA_BACKEND_URL || ''
  const masked = url ? url.replace(/(?<=^https?:\/\/)[^/]+/, (m) => m.replace(/.(?=.{3})/g, '*')) : ''
  const timeout = process.env.PROBA_BACKEND_TIMEOUT_MS || ''
  const hasKey = Boolean(process.env.PROBA_BACKEND_API_KEY)
  return NextResponse.json({
    runtime,
    hasBackendUrl: Boolean(url),
    backendUrlMasked: masked,
    timeoutMs: timeout,
    hasApiKey: hasKey
  })
}

export async function POST(request: NextRequest) {
  try {
    const { featureValues } = await request.json()

    if (!featureValues || typeof featureValues !== 'object') {
      return NextResponse.json({ error: 'featureValues is required' }, { status: 400 })
    }

    // 直接调用后端（无本地回退），失败则返回错误
    const backendUrl = process.env.PROBA_BACKEND_URL
    if (!backendUrl) {
      return NextResponse.json({ error: 'Backend URL is not configured (PROBA_BACKEND_URL)' }, { status: 500 })
    }

    try {
      const controller = new AbortController()
      const timeoutMs = Number(process.env.PROBA_BACKEND_TIMEOUT_MS || 15000)
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (process.env.PROBA_BACKEND_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.PROBA_BACKEND_API_KEY}`
      }

      const resp = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ featureValues }),
        signal: controller.signal
      })
      clearTimeout(timer)

      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        let errorDetail: any = { detail: text, statusCode: resp.status }
        // 尝试解析错误响应为JSON
        try {
          const errorJson = JSON.parse(text)
          errorDetail = { ...errorDetail, ...errorJson }
        } catch {
          // 如果不是JSON，保持原文本
        }
        return NextResponse.json({ error: 'Backend request failed', ...errorDetail }, { status: 502 })
      }

      const backendData = await resp.json().catch(() => ({}))

      // 后端返回格式: { "success": True, "data": { "probabilities": [...] } }
      const probabilities = Array.isArray(backendData?.probabilities)
        ? backendData.probabilities
        : Array.isArray(backendData?.data?.probabilities)
        ? backendData.data.probabilities
        : undefined

      if (!Array.isArray(probabilities)) {
        return NextResponse.json({ 
          error: 'Invalid response from backend', 
          raw: backendData,
          expectedFormat: '{ "success": true, "data": { "probabilities": [...] } }'
        }, { status: 502 })
      }

      return NextResponse.json({ success: true, data: { probabilities } })
    } catch (err: any) {
      const message = err?.name === 'AbortError' ? 'Backend request timeout' : (err?.message || 'Backend request error')
      return NextResponse.json({ error: message }, { status: 502 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}


