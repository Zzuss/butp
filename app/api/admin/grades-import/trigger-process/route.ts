import { NextResponse } from 'next/server'

export const maxDuration = 5

export async function POST() {
  try {
    // 触发队列处理（异步调用，不等待结果）
    const processUrl = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/admin/grades-import/process-queue`
    
    // 使用fetch异步调用，不等待结果
    fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(error => {
      console.error('触发队列处理失败:', error)
    })

    return NextResponse.json({
      success: true,
      message: '已触发队列处理'
    })

  } catch (error) {
    console.error('触发队列处理失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '触发队列处理失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
