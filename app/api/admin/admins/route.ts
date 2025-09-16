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

    let currentAdmin
    try {
      currentAdmin = JSON.parse(adminSessionCookie.value)
    } catch (e) {
      return NextResponse.json(
        { error: '无效的session' },
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

    // 验证用户名格式
    if (username.trim().length < 3) {
      return NextResponse.json(
        { error: '用户名至少需要3个字符' },
        { status: 400 }
      )
    }

    // 验证密码强度
    if (password.trim().length < 6) {
      return NextResponse.json(
        { error: '密码至少需要6个字符' },
        { status: 400 }
      )
    }

    // 权限检查：只有超级管理员可以创建超级管理员
    const targetRole = role || 'admin'
    if (targetRole === 'super_admin' && currentAdmin.role !== 'super_admin') {
      return NextResponse.json(
        { error: '只有超级管理员可以创建超级管理员' },
        { status: 403 }
      )
    }

    // 检查用户名是否已存在
    const { data: existingUser } = await supabase
      .from('admin_accounts')
      .select('id')
      .eq('username', username.trim())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 400 }
      )
    }

    // 检查邮箱是否已存在（如果提供了邮箱）
    if (email && email.trim()) {
      const { data: existingEmail } = await supabase
        .from('admin_accounts')
        .select('id')
        .eq('email', email.trim())
        .single()

      if (existingEmail) {
        return NextResponse.json(
          { error: '邮箱已存在' },
          { status: 400 }
        )
      }
    }

    // 使用数据库函数创建管理员
    const { data: result, error } = await supabase
      .rpc('create_admin_user', {
        p_username: username.trim(),
        p_password: password.trim(),
        p_email: email?.trim() || null
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

    // 更新管理员的额外信息
    const { error: updateError } = await supabase
      .from('admin_accounts')
      .update({
        full_name: full_name?.trim() || null,
        role: targetRole,
        updated_at: new Date().toISOString()
      })
      .eq('username', username.trim())

    if (updateError) {
      console.error('更新管理员信息失败:', updateError)
      // 不返回错误，因为基本信息已经创建成功
    }

    // 获取创建的管理员信息返回
    const { data: newAdmin } = await supabase
      .from('admin_accounts')
      .select('id, username, email, full_name, role, is_active, created_at')
      .eq('username', username.trim())
      .single()

    return NextResponse.json({
      success: true,
      message: `${targetRole === 'super_admin' ? '超级管理员' : '管理员'}创建成功`,
      data: newAdmin
    })

  } catch (error) {
    console.error('创建管理员API错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
