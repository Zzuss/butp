import { NextRequest, NextResponse } from 'next/server'
import { getDirectVisitorStats } from '@/lib/umami-api'

// API 端点处理
export async function GET(request: NextRequest) {
  try {
    console.log('📊 收到统计数据请求')
    
    // 直接使用lib中的函数获取数据
    const result = await getDirectVisitorStats()

    // 设置缓存头
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', // 5分钟缓存
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    })

    if (result) {
      console.log('✅ 成功返回统计数据')
      return new NextResponse(JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }), { 
        status: 200, 
        headers 
      })
    } else {
      console.log('⚠️ 返回空数据')
      return new NextResponse(JSON.stringify({
        success: false,
        error: '无法获取统计数据',
        timestamp: new Date().toISOString()
      }), { 
        status: 500, 
        headers 
      })
    }

  } catch (error) {
    console.error('❌ API 处理失败:', error)
    
    // 返回错误响应
    return new NextResponse(JSON.stringify({
      success: false,
      error: `服务器内部错误: ${error}`,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
} 