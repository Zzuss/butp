import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST - 标记通知为已读
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, notificationId } = body

    if (!userId || !notificationId) {
      return NextResponse.json(
        { error: '用户ID和通知ID不能为空' },
        { status: 400 }
      )
    }

    // 使用 upsert 避免重复记录
    const { data, error } = await supabase
      .from('user_notification_reads')
      .upsert({
        user_id: userId,
        notification_id: notificationId,
        read_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,notification_id'
      })
      .select()

    if (error) {
      console.error('标记通知已读失败:', error)
      return NextResponse.json(
        { error: '标记通知已读失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('标记通知已读错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
