import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 创建响应并清除管理员会话 cookie
    const response = NextResponse.json({
      success: true,
      message: '管理员已成功退出登录'
    })

    response.cookies.set('admin-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('管理员退出登录错误:', error)
    return NextResponse.json(
      { error: '退出登录失败' },
      { status: 500 }
    )
  }
}
