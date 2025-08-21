import { NextRequest, NextResponse } from 'next/server'

// 校内PDF服务代理端点 - 生成PDF
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('📄 接收到PDF生成请求:', {
      hasUrl: !!body.url,
      hasHtml: !!body.html,
      viewportWidth: body.viewportWidth,
      userAgent: request.headers.get('user-agent')
    })
    
    // 根据部署环境动态选择PDF服务地址
    const campusServiceUrl = process.env.CAMPUS_PDF_SERVICE_URL || 'http://139.159.233.180/generate-pdf'
    
    console.log('🏢 当前环境:', {
      isProduction: process.env.NODE_ENV === 'production',
      hostname: process.env.VERCEL_URL || 'localhost',
      pdfServiceUrl: campusServiceUrl
    })
    
    // 转发请求头（包括认证信息）
    const forwardHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'x-pdf-key': 'huawei-pdf-2024-secure-key',
      'User-Agent': request.headers.get('user-agent') || 'BuTP-PDF-Proxy/1.0'
    }
    
    // 转发Cookie（如果有）
    const cookies = request.headers.get('cookie')
    if (cookies) {
      forwardHeaders['Cookie'] = cookies
    }
    
    console.log('🔄 转发请求到校内PDF服务:', campusServiceUrl)
    
    // 发送到校内PDF服务
    const campusResponse = await fetch(campusServiceUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(body),
      // 设置超时
      signal: AbortSignal.timeout(60000) // 60秒超时
    })
    
    console.log('📥 校内PDF服务响应:', {
      status: campusResponse.status,
      statusText: campusResponse.statusText,
      contentType: campusResponse.headers.get('content-type')
    })
    
    if (!campusResponse.ok) {
      const errorText = await campusResponse.text()
      console.error('❌ 校内PDF服务错误:', errorText)
      
      return NextResponse.json({
        error: 'Campus PDF service error',
        status: campusResponse.status,
        message: errorText
      }, { status: campusResponse.status })
    }
    
    // 获取PDF数据
    const pdfBuffer = await campusResponse.arrayBuffer()
    
    console.log('✅ PDF生成成功:', {
      size: pdfBuffer.byteLength,
      sizeKB: Math.round(pdfBuffer.byteLength / 1024)
    })
    
    // 设置响应头
    const filename = body.filename || `campus_export_${new Date().toISOString().slice(0,10)}.pdf`
    
    const response = new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
    return response
    
  } catch (error) {
    console.error('❌ PDF代理服务错误:', error)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({
          error: 'Request timeout',
          message: '校内PDF服务响应超时，请稍后重试'
        }, { status: 504 })
      }
      
      if (error.message.includes('fetch')) {
        return NextResponse.json({
          error: 'Campus service unavailable', 
          message: '无法连接校内PDF服务，请检查网络连接'
        }, { status: 503 })
      }
    }
    
    return NextResponse.json({
      error: 'Internal server error',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}
