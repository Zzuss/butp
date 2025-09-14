import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 获取所有管理员列表
export async function GET(request: NextRequest) {
  try {
    // 检查当前用户是否为管理员
    const adminSessionCookie = request.cookies.get('admin-session');
    if (!adminSessionCookie?.value) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const { data: admins, error } = await supabase
      .from('admin_accounts')
      .select('id, username, email, full_name, role, is_active, created_at, updated_at, last_login')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取管理员列表失败:', error)
      return NextResponse.json(
        { error: '获取管理员列表失败' },
        { status: 500 }
      )
    }

    return NextResponse.json(admins)

  } catch (error) {
    console.error('管理员列表API错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// 创建新管理员
export async function POST(request: NextRequest) {
  try {
    // 检查当前用户是否为管理员
    const adminSessionCookie = request.cookies.get('admin-session');
    if (!adminSessionCookie?.value) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const { username, password, email, full_name, role } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      )
    }

    // 使用数据库函数创建管理员
    const { data: result, error } = await supabase
      .rpc('create_admin_user', {
        p_username: username,
        p_password: password,
        p_email: email || null
      })

    if (error) {
      console.error('创建管理员失败:', error)
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: '用户名已存在' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: '创建管理员失败' },
        { status: 500 }
      )
    }

    // 如果提供了额外信息，更新记录
    if (full_name || role !== 'admin') {
      const { error: updateError } = await supabase
        .from('admin_accounts')
        .update({
          full_name: full_name || null,
          role: role || 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('username', username)

      if (updateError) {
        console.error('更新管理员信息失败:', updateError)
      }
    }

    return NextResponse.json({
      success: true,
      message: '管理员创建成功'
    })

  } catch (error) {
    console.error('创建管理员API错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
