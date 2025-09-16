import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 验证管理员权限的辅助函数
function checkAdminPermission(request: NextRequest): { isValid: boolean, adminId?: string } {
  try {
    const adminSessionCookie = request.cookies.get('admin-session')
    
    if (!adminSessionCookie?.value) {
      return { isValid: false }
    }

    const adminSession = JSON.parse(adminSessionCookie.value)
    
    if (!adminSession.id || !adminSession.username || !adminSession.loginTime) {
      return { isValid: false }
    }

    // 检查会话是否过期（24小时）
    const loginTime = new Date(adminSession.loginTime)
    const now = new Date()
    const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)

    if (hoursSinceLogin > 24) {
      return { isValid: false }
    }

    return { isValid: true, adminId: adminSession.id }
  } catch (error) {
    console.error('检查管理员权限失败:', error)
    return { isValid: false }
  }
}

// GET - 获取所有系统通知
export async function GET(request: NextRequest) {
  try {
    const { isValid } = checkAdminPermission(request)
    
    if (!isValid) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const { data: notifications, error } = await supabase
      .from('system_notifications')
      .select(`
        *,
        admin_accounts(username, full_name)
      `)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取通知失败:', error)
      return NextResponse.json(
        { error: '获取通知失败' },
        { status: 500 }
      )
    }

    return NextResponse.json(notifications)

  } catch (error) {
    console.error('获取通知错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// POST - 创建新通知
export async function POST(request: NextRequest) {
  try {
    const { isValid, adminId } = checkAdminPermission(request)
    
    if (!isValid) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, type = 'info', priority = 0, start_date, end_date } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      )
    }

    const { data: notification, error } = await supabase
      .from('system_notifications')
      .insert({
        title,
        content,
        type,
        priority,
        start_date: start_date || new Date().toISOString(),
        end_date,
        created_by: adminId
      })
      .select()
      .single()

    if (error) {
      console.error('创建通知失败:', error)
      return NextResponse.json(
        { error: '创建通知失败' },
        { status: 500 }
      )
    }

    return NextResponse.json(notification, { status: 201 })

  } catch (error) {
    console.error('创建通知错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
