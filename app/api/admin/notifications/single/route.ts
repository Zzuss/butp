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
    console.error('权限检查失败:', error)
    return { isValid: false }
  }
}

// GET - 获取单个通知
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  
  console.log('[GET-SINGLE] 获取通知请求, ID:', id)
  
  if (!id) {
    return NextResponse.json({ error: '缺少通知ID参数' }, { status: 400 })
  }

  const { isValid } = checkAdminPermission(request)
  if (!isValid) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })
  }

  try {
    const { data: notification, error } = await supabase
      .from('system_notifications')
      .select(`
        *,
        admin_accounts(username, full_name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('[GET-SINGLE] 获取通知失败:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '通知不存在' }, { status: 404 })
      }
      return NextResponse.json({ error: '获取通知失败' }, { status: 500 })
    }

    console.log('[GET-SINGLE] 获取通知成功')
    return NextResponse.json(notification)

  } catch (error) {
    console.error('[GET-SINGLE] 获取通知错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// PATCH - 更新通知
export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  
  console.log('[PATCH-SINGLE] 更新通知请求, ID:', id)
  
  if (!id) {
    return NextResponse.json({ error: '缺少通知ID参数' }, { status: 400 })
  }

  const { isValid } = checkAdminPermission(request)
  if (!isValid) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('[PATCH-SINGLE] 请求体:', body)

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

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
      console.error('[PATCH-SINGLE] 更新通知失败:', error)
      return NextResponse.json({ error: '更新通知失败' }, { status: 500 })
    }

    if (!notification) {
      return NextResponse.json({ error: '通知不存在' }, { status: 404 })
    }

    console.log('[PATCH-SINGLE] 更新通知成功')
    return NextResponse.json(notification)

  } catch (error) {
    console.error('[PATCH-SINGLE] 更新通知错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// DELETE - 删除通知
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  
  console.log('[DELETE-SINGLE] 删除通知请求, ID:', id)
  
  if (!id) {
    return NextResponse.json({ error: '缺少通知ID参数' }, { status: 400 })
  }

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
      console.error('[DELETE-SINGLE] 删除通知失败:', error)
      return NextResponse.json({ error: '删除通知失败' }, { status: 500 })
    }

    console.log('[DELETE-SINGLE] 删除通知成功')
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[DELETE-SINGLE] 删除通知错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
