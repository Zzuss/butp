import { NextRequest, NextResponse } from 'next/server'

// 明确使用 Node.js 运行时，确保可在请求时读取 process.env
export const runtime = 'nodejs'

type FeatureValues = Record<string, number>

function getErrorDiagnostics(error: any) {
  const cause = error?.cause

  return {
    errorName: error?.name || null,
    errorMessage: error?.message || null,
    errorCode: error?.code || null,
    causeName: cause?.name || null,
    causeMessage: cause?.message || null,
    causeCode: cause?.code || null
  }
}

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
  const requestId = crypto.randomUUID()
  const requestStartedAt = Date.now()

  try {
    const { featureValues } = await request.json()

    if (!featureValues || typeof featureValues !== 'object') {
      console.warn('[proba-predict] Invalid request payload', {
        requestId,
        elapsedMs: Date.now() - requestStartedAt
      })
      return NextResponse.json({
        error: 'featureValues is required',
        diagnostics: { requestId, elapsedMs: Date.now() - requestStartedAt }
      }, { status: 400 })
    }

    // 将前端使用的 C1~C23 字段名映射到后端期望的 Ability_1~Ability_23
    const mappedFeatureValues: Record<string, number> = {}
    for (const [key, value] of Object.entries(featureValues)) {
      // 如果键名是 C1, C2, ..., C23，映射为 Ability_1, Ability_2, ..., Ability_23
      const cMatch = key.match(/^C(\d+)$/)
      if (cMatch) {
        const num = cMatch[1]
        mappedFeatureValues[`Ability_${num}`] = value as number
      } else {
        // 如果不是 C1~C23 格式，保持原样
        mappedFeatureValues[key] = value as number
      }
    }

    // 直接调用后端（无本地回退），失败则返回错误
    const backendUrl = process.env.PROBA_BACKEND_URL
    if (!backendUrl) {
      console.error('[proba-predict] Backend URL is not configured', {
        requestId,
        elapsedMs: Date.now() - requestStartedAt
      })
      return NextResponse.json({
        error: 'Backend URL is not configured (PROBA_BACKEND_URL)',
        diagnostics: { requestId, elapsedMs: Date.now() - requestStartedAt }
      }, { status: 500 })
    }

    const timeoutMs = Number(process.env.PROBA_BACKEND_TIMEOUT_MS || 15000)
    let backendHost = 'invalid-url'
    try {
      backendHost = new URL(backendUrl).host
    } catch {
      // fetch 会返回具体的 URL 错误；这里只避免日志处理再次抛错
    }

    console.info('[proba-predict] Request started', {
      requestId,
      backendHost,
      timeoutMs,
      featureCount: Object.keys(mappedFeatureValues).length,
      hasApiKey: Boolean(process.env.PROBA_BACKEND_API_KEY)
    })

    const backendStartedAt = Date.now()
    let timer: ReturnType<typeof setTimeout> | undefined

    try {
      const controller = new AbortController()
      timer = setTimeout(() => controller.abort(), timeoutMs)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      }
      if (process.env.PROBA_BACKEND_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.PROBA_BACKEND_API_KEY}`
      }

      const resp = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ featureValues: mappedFeatureValues }),
        signal: controller.signal
      })

      const backendElapsedMs = Date.now() - backendStartedAt
      console.info('[proba-predict] Backend response received', {
        requestId,
        backendHost,
        backendStatus: resp.status,
        backendStatusText: resp.statusText,
        backendElapsedMs,
        totalElapsedMs: Date.now() - requestStartedAt
      })

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
        console.error('[proba-predict] Backend returned an error response', {
          requestId,
          backendHost,
          backendStatus: resp.status,
          backendStatusText: resp.statusText,
          backendElapsedMs,
          responsePreview: text.slice(0, 1000)
        })
        return NextResponse.json({
          error: 'Backend request failed',
          ...errorDetail,
          diagnostics: {
            requestId,
            backendElapsedMs,
            totalElapsedMs: Date.now() - requestStartedAt
          }
        }, { status: 502 })
      }

      const backendData = await resp.json().catch(() => ({}))

      // 后端返回格式: { "success": True, "data": { "probabilities": [...] } }
      const probabilities = Array.isArray(backendData?.probabilities)
        ? backendData.probabilities
        : Array.isArray(backendData?.data?.probabilities)
        ? backendData.data.probabilities
        : undefined

      if (!Array.isArray(probabilities)) {
        console.error('[proba-predict] Invalid backend response format', {
          requestId,
          backendHost,
          backendElapsedMs,
          responseKeys: backendData && typeof backendData === 'object' ? Object.keys(backendData) : []
        })
        return NextResponse.json({ 
          error: 'Invalid response from backend', 
          raw: backendData,
          expectedFormat: '{ "success": true, "data": { "probabilities": [...] } }',
          diagnostics: {
            requestId,
            backendElapsedMs,
            totalElapsedMs: Date.now() - requestStartedAt
          }
        }, { status: 502 })
      }

      const totalElapsedMs = Date.now() - requestStartedAt
      console.info('[proba-predict] Request completed', {
        requestId,
        backendHost,
        backendElapsedMs,
        totalElapsedMs,
        probabilityCount: probabilities.length
      })

      return NextResponse.json({
        success: true,
        data: { probabilities },
        diagnostics: { requestId, backendElapsedMs, totalElapsedMs }
      })
    } catch (err: any) {
      const diagnostics = getErrorDiagnostics(err)
      const backendElapsedMs = Date.now() - backendStartedAt
      const message = err?.name === 'AbortError' ? 'Backend request timeout' : (err?.message || 'Backend request error')

      console.error('[proba-predict] Backend fetch failed', {
        requestId,
        backendHost,
        timeoutMs,
        backendElapsedMs,
        totalElapsedMs: Date.now() - requestStartedAt,
        ...diagnostics
      })

      return NextResponse.json({
        error: message,
        diagnostics: {
          requestId,
          backendElapsedMs,
          totalElapsedMs: Date.now() - requestStartedAt,
          ...diagnostics
        }
      }, { status: 502 })
    } finally {
      if (timer) clearTimeout(timer)
    }
  } catch (error: any) {
    const diagnostics = getErrorDiagnostics(error)
    console.error('[proba-predict] Request handling failed', {
      requestId,
      totalElapsedMs: Date.now() - requestStartedAt,
      ...diagnostics
    })
    return NextResponse.json({
      error: error?.message || 'Internal error',
      diagnostics: {
        requestId,
        totalElapsedMs: Date.now() - requestStartedAt,
        ...diagnostics
      }
    }, { status: 500 })
  }
}


