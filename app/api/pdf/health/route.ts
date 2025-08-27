import { NextResponse } from 'next/server'

// 校内PDF服务健康检查代理端点
export async function GET() {
  // 根据部署环境动态选择健康检查地址
  const campusHealthUrl = process.env.CAMPUS_PDF_SERVICE_URL?.replace('/generate-pdf', '/health') || 'http://139.159.233.180/health';
  
  console.log('🏥 健康检查请求:', {
    isProduction: process.env.NODE_ENV === 'production',
    hostname: process.env.VERCEL_URL || 'localhost',
    healthCheckUrl: campusHealthUrl
  });

  try {
    // 检查校内PDF服务状态，优先使用环境变量
    const campusHealthUrl = process.env.CAMPUS_PDF_SERVICE_HEALTH_URL || (process.env.CAMPUS_PDF_SERVICE_URL ? new URL('/health', process.env.CAMPUS_PDF_SERVICE_URL).toString() : 'http://139.159.233.180/health')
    // 检查校内PDF服务状态
    const healthResponse = await fetch(campusHealthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5秒超时
    })
    
    const healthData = await healthResponse.json()
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      proxy: 'butp-pdf-proxy',
      version: '1.0.0',
      campusService: {
        status: healthResponse.status,
        data: healthData
      }
    })
    
  } catch (error) {
    console.error('❌ 校内PDF服务健康检查失败:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      proxy: 'butp-pdf-proxy',
      version: '1.0.0',
      error: error instanceof Error ? error.message : 'Unknown error',
      campusService: {
        status: 'unreachable',
        error: '无法连接校内PDF服务'
      }
    }, { status: 503 })
  }
}
