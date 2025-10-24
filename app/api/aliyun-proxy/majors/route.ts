import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // 返回支持的专业列表
    const majors = [
      '智能科学与技术',
      '物联网工程', 
      '电信工程及管理',
      '电子信息工程'
    ]
    
    return NextResponse.json({
      success: true,
      data: {
        majors: majors,
        total: majors.length
      },
      majors: majors // 兼容性字段
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '获取专业列表失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}