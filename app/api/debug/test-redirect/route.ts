import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🧪 测试重定向到隐私条款页面')
  
  // 模拟CAS callback的重定向逻辑
  const redirectResponse = NextResponse.redirect(new URL('/privacy-agreement?from=test', request.url))
  
  console.log('🧪 重定向URL:', redirectResponse.headers.get('location'))
  
  return redirectResponse
}
