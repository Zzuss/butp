import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 简化的权限检查
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
    const loginTime = new Date(adminSession.loginTime)
    const now = new Date()
    const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)
    if (hoursSinceLogin > 24) {
      return { isValid: false }
    }
    return { isValid: true, adminId: adminSession.id }
  } catch (error) {
    console.error('权限检查失败:', error)
    return { isValid: false }
  }
}

// GET 方法 - 测试路由是否工作
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[GET-SIMPLE] 路由正常工作! ID:', id)
  
  const { isValid } = checkAdminPermission(request)
  if (!isValid) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    message: '路由工作正常',
    id,
    method: 'GET',
    timestamp: new Date().toISOString()
  })
}

// PATCH 方法 - 更新通知
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[PATCH-SIMPLE] 更新请求, ID:', id)
  
  const { isValid } = checkAdminPermission(request)
  if (!isValid) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('[PATCH-SIMPLE] 请求体:', body)

    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (body.title !== undefined) updateData.title = body.title
    if (body.content !== undefined) updateData.content = body.content
    if (body.type !== undefined) updateData.type = body.type
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.start_date !== undefined) updateData.start_date = body.start_date
    if (body.end_date !== undefined) updateData.end_date = body.end_date

    const { data: notification, error } = await supabase
      .from('system_notifications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[PATCH-SIMPLE] 更新失败:', error)
      return NextResponse.json({ error: '更新通知失败' }, { status: 500 })
    }

    if (!notification) {
      return NextResponse.json({ error: '通知不存在' }, { status: 404 })
    }

    console.log('[PATCH-SIMPLE] 更新成功')
    return NextResponse.json(notification)
  } catch (error) {
    console.error('[PATCH-SIMPLE] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// DELETE 方法 - 删除通知
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[DELETE-SIMPLE] 删除请求, ID:', id)
  
  const { isValid } = checkAdminPermission(request)
  if (!isValid) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })
  }

  try {
    const { error } = await supabase
      .from('system_notifications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[DELETE-SIMPLE] 删除失败:', error)
      return NextResponse.json({ error: '删除通知失败' }, { status: 500 })
    }

    console.log('[DELETE-SIMPLE] 删除成功')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE-SIMPLE] 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
