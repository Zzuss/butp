import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

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

    // 先检查通知是否存在且有效
    const now = new Date().toISOString()
    const { data: notificationCheck, error: notificationError } = await supabase
      .from('system_notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('is_active', true)
      .lte('start_date', now)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .single()

    if (notificationError || !notificationCheck) {
      return NextResponse.json(
        { error: '通知不存在或已过期', details: notificationError?.message },
        { status: 404 }
      )
    }

    // 尝试插入已读记录
    const { data, error } = await supabase
      .from('user_notification_reads')
      .upsert(
        {
          id: uuidv4(),
          user_id: userId,
          notification_id: notificationId,
          read_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,notification_id',
          updateColumns: ['read_at']
        }
      )
      .select()

    if (error) {
      console.error('标记通知已读失败:', error)
      
      // 处理唯一约束冲突
      if (error.code === '23505') {
        return NextResponse.json(
          { 
            success: true, 
            message: '通知已经被标记为已读' 
          },
          { status: 200 }
        )
      }

      return NextResponse.json(
        { 
          error: '标记通知已读失败',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: '通知标记已读成功',
      data 
    })

  } catch (error) {
    console.error('标记通知已读错误:', error)
    return NextResponse.json(
      { 
        error: '服务器错误',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
