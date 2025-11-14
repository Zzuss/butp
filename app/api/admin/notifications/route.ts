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
        created_by:admin_accounts!fk_created_by(id, username, full_name)
      `)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取通知失败:', error)
      console.error('详细错误信息:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { 
          error: '获取通知失败',
          details: error.message,
          hint: error.hint
        },
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
    const { title, content, type = 'info', priority = 1, start_date, end_date, image_url } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: '标题和内容不能为空' },
        { status: 400 }
      )
    }

    // 验证优先级范围
    if (priority < 1 || priority > 10) {
      return NextResponse.json(
        { error: '优先级必须在1到10之间' },
        { status: 400 }
      )
    }

    // 验证结束时间必须在开始时间之后
    if (end_date && start_date) {
      const startDateTime = new Date(start_date)
      const endDateTime = new Date(end_date)
      
      if (endDateTime <= startDateTime) {
        return NextResponse.json(
          { error: '结束时间必须在开始时间之后' },
          { status: 400 }
        )
      }
    }

    const { data: notification, error } = await supabase
      .from('system_notifications')
      .insert({
        title,
        content,
        type,
        priority,
        // 如果没有提供开始时间，默认为当前时间
        start_date: start_date || new Date().toISOString(),
        end_date,
        // 确保图片 URL 被正确保存
        image_url: image_url || null,
        created_by: adminId,
        // 根据开始和结束时间设置是否活跃
        is_active: start_date ? 
          (!end_date || new Date(start_date) <= new Date() && new Date() <= new Date(end_date)) : 
          true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('创建通知失败:', error)
      console.error('详细错误信息:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { 
          error: '创建通知失败',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    // 额外检查返回的通知
    if (!notification || !notification.id) {
      console.error('创建通知后未返回有效ID:', notification)
      return NextResponse.json(
        { 
          error: '创建通知失败',
          details: '未返回有效的通知ID'
        },
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
