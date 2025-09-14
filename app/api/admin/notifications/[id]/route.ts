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

// PATCH - 更新通知
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isValid } = checkAdminPermission(request)
    
    if (!isValid) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, type, priority, is_active, start_date, end_date } = body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (type !== undefined) updateData.type = type
    if (priority !== undefined) updateData.priority = priority
    if (is_active !== undefined) updateData.is_active = is_active
    if (start_date !== undefined) updateData.start_date = start_date
    if (end_date !== undefined) updateData.end_date = end_date

    const { data: notification, error } = await supabase
      .from('system_notifications')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('更新通知失败:', error)
      return NextResponse.json(
        { error: '更新通知失败' },
        { status: 500 }
      )
    }

    if (!notification) {
      return NextResponse.json(
        { error: '通知不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(notification)

  } catch (error) {
    console.error('更新通知错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// DELETE - 删除通知
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isValid } = checkAdminPermission(request)
    
    if (!isValid) {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from('system_notifications')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('删除通知失败:', error)
      return NextResponse.json(
        { error: '删除通知失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('删除通知错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
