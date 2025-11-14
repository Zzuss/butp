import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getStorageSupabase } from '@/lib/storageSupabase'

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

    // 验证优先级范围（如果提供了priority）
    if (body.priority !== undefined && (body.priority < 1 || body.priority > 10)) {
      return NextResponse.json(
        { error: '优先级必须在1到10之间' },
        { status: 400 }
      )
    }

    // 验证结束时间必须在开始时间之后（如果都提供了值）
    if (body.end_date && body.start_date) {
      const startDateTime = new Date(body.start_date)
      const endDateTime = new Date(body.end_date)
      
      if (endDateTime <= startDateTime) {
        return NextResponse.json(
          { error: '结束时间必须在开始时间之后' },
          { status: 400 }
        )
      }
    }

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
    if (body.image_url !== undefined) updateData.image_url = body.image_url

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

// 删除通知图片
async function deleteNotificationImage(fileName: string) {
  console.log('🗑️ 开始删除通知图片:', fileName)
  
  const storageSupabase = getStorageSupabase()
  const { data, error } = await storageSupabase.storage
    .from('notification-images')
    .remove([fileName])

  if (error) {
    console.error('❌ 通知图片删除失败:', error)
    throw error
  }

  // 额外检查文件是否真的被删除
  const { data: checkData, error: checkError } = await storageSupabase.storage
    .from('notification-images')
    .list()

  console.log('[DELETE-SINGLE] 桶中文件列表:', checkData)

  const stillExists = checkData?.some(file => file.name === fileName)
  
  if (stillExists) {
    throw new Error(`文件 ${fileName} 删除失败，仍然存在`)
  }

  console.log('✅ 通知图片删除成功:', fileName)
  return data
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
    // 获取通知详情，特别是图片URL
    const { data: notificationData, error: fetchError } = await supabase
      .from('system_notifications')
      .select('image_url')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('[DELETE-SINGLE] 获取通知详情失败:', fetchError)
      return NextResponse.json(
        { 
          error: '获取通知详情失败',
          details: fetchError.message,
          code: fetchError.code
        },
        { status: 500 }
      )
    }

    // 先删除与该通知关联的所有已读记录
    const { error: deleteReadsError } = await supabase
      .from('user_notification_reads')
      .delete()
      .eq('notification_id', id)

    if (deleteReadsError) {
      console.error('[DELETE-SINGLE] 删除已读记录失败:', deleteReadsError)
      return NextResponse.json(
        { 
          error: '删除关联已读记录失败',
          details: deleteReadsError.message,
          code: deleteReadsError.code
        },
        { status: 500 }
      )
    }

    // 删除通知
    const { error } = await supabase
      .from('system_notifications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[DELETE-SINGLE] 删除通知失败:', error)
      return NextResponse.json(
        { 
          error: '删除通知失败',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    // 如果通知有图片，删除存储中的图片文件
    if (notificationData.image_url) {
      console.log('[DELETE-SINGLE] 通知图片URL:', notificationData.image_url)

      // 从 URL 中提取文件名，处理 Supabase 存储的公开 URL
      const urlParts = notificationData.image_url.split('/')
      const fileNameIndex = urlParts.findIndex(part => part === 'notification-images') + 1
      const fileName = fileNameIndex > 0 ? urlParts[fileNameIndex] : urlParts.pop()
      
      console.log('[DELETE-SINGLE] 提取的文件名:', fileName)

      if (fileName) {
        try {
          // 删除图片文件
          await deleteNotificationImage(fileName)
        } catch (catchError) {
          console.error('[DELETE-SINGLE] 图片删除过程中发生异常:', catchError)
          // 记录错误，但不阻止通知删除
          console.warn(`未能删除图片文件: ${fileName}`)
        }
      } else {
        console.warn('[DELETE-SINGLE] 无法从URL提取文件名:', notificationData.image_url)
      }
    }

    console.log('[DELETE-SINGLE] 删除通知成功')
    return NextResponse.json({ 
      success: true, 
      message: '通知及其已读记录和图片文件删除成功'
    })

  } catch (error) {
    console.error('[DELETE-SINGLE] 删除通知错误:', error)
    return NextResponse.json(
      { 
        error: '服务器错误',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
