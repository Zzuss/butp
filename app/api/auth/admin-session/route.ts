import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // 获取管理员会话 cookie
    const adminSessionCookie = request.cookies.get('admin-session')
    
    if (!adminSessionCookie) {
      return NextResponse.json({
        isAdmin: false,
        admin: null
      })
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json({
        isAdmin: false,
        admin: null
      })
    }

    // 验证会话是否过期（24小时）
    const loginTime = new Date(adminSession.loginTime)
    const now = new Date()
    const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)
    
    if (hoursDiff > 24) {
      // 会话已过期，清除 cookie
      const response = NextResponse.json({
        isAdmin: false,
        admin: null,
        expired: true
      })
      
      response.cookies.set('admin-session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
      
      return response
    }

    // 验证管理员账户是否仍然有效
    const { data: adminAccount, error } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('id', adminSession.id)
      .eq('is_active', true)
      .single()

    if (error || !adminAccount) {
      // 账户无效，清除 cookie
      const response = NextResponse.json({
        isAdmin: false,
        admin: null
      })
      
      response.cookies.set('admin-session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
      
      return response
    }

    return NextResponse.json({
      isAdmin: true,
      admin: {
        id: adminAccount.id,
        username: adminAccount.username,
        fullName: adminAccount.full_name,
        email: adminAccount.email,
        role: adminAccount.role
      }
    })

  } catch (error) {
    console.error('检查管理员会话错误:', error)
    return NextResponse.json(
      { error: '会话验证失败' },
      { status: 500 }
    )
  }
}
