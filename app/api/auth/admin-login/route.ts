import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      )
    }

    // 使用数据库函数验证管理员密码
    const { data: verificationResult, error } = await supabase
      .rpc('verify_admin_password', {
        p_username: username,
        p_password: password
      })

    if (error) {
      console.error('管理员密码验证错误:', error)
      return NextResponse.json(
        { error: '登录验证失败，请重试' },
        { status: 500 }
      )
    }

    // 检查验证结果
    if (!verificationResult || verificationResult.length === 0 || !verificationResult[0]?.is_valid) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      )
    }

    const adminAccount = verificationResult[0]

    // 更新最后登录时间
    await supabase
      .from('admin_accounts')
      .update({ 
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', adminAccount.id)

    // 创建管理员会话 - 使用不同的 session key 来区分普通用户和管理员
    const response = NextResponse.json({
      success: true,
      admin: {
        id: adminAccount.id,
        username: adminAccount.username,
        fullName: adminAccount.full_name,
        email: adminAccount.email,
        role: adminAccount.role
      }
    })

    // 设置管理员会话 cookie（24小时过期）
    const maxAge = 24 * 60 * 60 // 24 hours in seconds
    response.cookies.set('admin-session', JSON.stringify({
      id: adminAccount.id,
      username: adminAccount.username,
      fullName: adminAccount.full_name,
      email: adminAccount.email,
      role: adminAccount.role,
      loginTime: new Date().toISOString()
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('管理员登录错误:', error)
    return NextResponse.json(
      { error: '登录失败，请重试' },
      { status: 500 }
    )
  }
}
