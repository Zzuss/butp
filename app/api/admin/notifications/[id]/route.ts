import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 验证管理员权限的辅助函数
function checkAdminPermission(request: NextRequest): { isValid: boolean, adminId?: string, error?: string } {
  try {
    console.log('[权限检查] 开始验证管理员权限')
    
    const adminSessionCookie = request.cookies.get('admin-session')
    console.log('[权限检查] Cookie存在:', !!adminSessionCookie?.value)
    
    if (!adminSessionCookie?.value) {
      console.log('[权限检查] 失败: 没有admin-session cookie')
      return { isValid: false, error: '没有管理员会话Cookie' }
    }

    const adminSession = JSON.parse(adminSessionCookie.value)
    console.log('[权限检查] Session数据:', {
      hasId: !!adminSession.id,
      hasUsername: !!adminSession.username,
      hasLoginTime: !!adminSession.loginTime,
      username: adminSession.username
    })
    
    if (!adminSession.id || !adminSession.username || !adminSession.loginTime) {
      console.log('[权限检查] 失败: Session数据不完整')
      return { isValid: false, error: '管理员会话数据不完整' }
    }

    // 检查会话是否过期（24小时）
    const loginTime = new Date(adminSession.loginTime)
    const now = new Date()
    const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)

    console.log('[权限检查] 时间验证:', {
      loginTime: loginTime.toISOString(),
      now: now.toISOString(),
      hoursSinceLogin,
      isExpired: hoursSinceLogin > 24
    })

    if (hoursSinceLogin > 24) {
      console.log('[权限检查] 失败: Session已过期')
      return { isValid: false, error: '管理员会话已过期' }
    }

    console.log('[权限检查] 成功: 管理员权限验证通过')
    return { isValid: true, adminId: adminSession.id }
  } catch (error) {
    console.error('[权限检查] 异常:', error)
    return { isValid: false, error: `权限验证异常: ${error instanceof Error ? error.message : String(error)}` }
  }
}

// PATCH - 更新通知
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[PATCH] 接收到通知更新请求, ID:', id)
  console.log('[PATCH] 请求方法:', request.method)
  console.log('[PATCH] 请求URL:', request.url)
  
  try {
    const permissionResult = checkAdminPermission(request)
    console.log('[PATCH] 权限检查结果:', permissionResult)
    
    if (!permissionResult.isValid) {
      console.log('[PATCH] 权限验证失败:', permissionResult.error)
      return NextResponse.json(
        { 
          error: permissionResult.error || '需要管理员权限',
          details: '权限验证失败'
        },
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
      .eq('id', id)
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[DELETE] 接收到通知删除请求, ID:', id)
  console.log('[DELETE] 请求方法:', request.method)
  console.log('[DELETE] 请求URL:', request.url)
  
  try {
    const permissionResult = checkAdminPermission(request)
    console.log('[DELETE] 权限检查结果:', permissionResult)
    
    if (!permissionResult.isValid) {
      console.log('[DELETE] 权限验证失败:', permissionResult.error)
      return NextResponse.json(
        { 
          error: permissionResult.error || '需要管理员权限',
          details: '权限验证失败'
        },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from('system_notifications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('删除通知失败:', error)
      return NextResponse.json(
        { error: '删除通知失败' },
        { status: 500 }
      )
    }

    console.log('[DELETE] 删除操作成功完成')
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[DELETE] 删除通知错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// GET - 获取单个通知 (用于测试路由)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[GET] 接收到获取通知请求, ID:', id)
  console.log('[GET] 请求方法:', request.method)
  console.log('[GET] 请求URL:', request.url)
  
  try {
    const permissionResult = checkAdminPermission(request)
    console.log('[GET] 权限检查结果:', permissionResult)
    
    if (!permissionResult.isValid) {
      console.log('[GET] 权限验证失败:', permissionResult.error)
      return NextResponse.json(
        { 
          error: permissionResult.error || '需要管理员权限',
          details: '权限验证失败'
        },
        { status: 401 }
      )
    }

    const { data: notification, error } = await supabase
      .from('system_notifications')
      .select(`
        *,
        admin_accounts(username, full_name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('[GET] 获取通知失败:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '通知不存在' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: '获取通知失败' },
        { status: 500 }
      )
    }

    console.log('[GET] 获取通知成功')
    return NextResponse.json(notification)

  } catch (error) {
    console.error('[GET] 获取通知错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
