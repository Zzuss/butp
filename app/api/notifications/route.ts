import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - 获取用户的未读通知
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      )
    }

    // 获取所有活跃的通知
    const now = new Date().toISOString()
    const { data: activeNotifications, error: notificationsError } = await supabase
      .from('system_notifications')
      .select(`
        *,
        created_by:admin_accounts!fk_created_by(username, full_name)
      `)
      .eq('is_active', true)
      .lte('start_date', now)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (notificationsError) {
      console.error('获取通知失败:', notificationsError)
      return NextResponse.json(
        { 
          error: '获取通知失败',
          details: notificationsError.message,
          hint: notificationsError.hint
        },
        { status: 500 }
      )
    }

    if (!activeNotifications || activeNotifications.length === 0) {
      return NextResponse.json([])
    }

    // 获取用户已读的通知ID列表
    const { data: readNotifications, error: readError } = await supabase
      .from('user_notification_reads')
      .select('notification_id')
      .eq('user_id', userId)
      .in('notification_id', activeNotifications.map(n => n.id))

    if (readError) {
      console.error('获取已读通知失败:', readError)
      return NextResponse.json(
        { 
          error: '获取已读通知失败',
          details: readError.message 
        },
        { status: 500 }
      )
    }

    const readNotificationIds = new Set(
      readNotifications?.map(r => r.notification_id) || []
    )

    // 过滤出未读通知
    const unreadNotifications = activeNotifications.filter(
      notification => !readNotificationIds.has(notification.id)
    )

    return NextResponse.json(unreadNotifications)

  } catch (error) {
    console.error('获取通知错误:', error)
    return NextResponse.json(
      { 
        error: '服务器错误',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
