import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY!

export const maxDuration = 30

export async function POST() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // 检查是否有待处理的任务
    const { data: pendingTasks, error: taskQueryError } = await supabase
      .from('import_tasks')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5)

    if (taskQueryError) {
      throw new Error(`查询待处理任务失败: ${taskQueryError.message}`)
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有待处理的任务',
        processed: 0
      })
    }

    console.log(`找到 ${pendingTasks.length} 个待处理任务，将由ECS后台处理`)

    // 返回成功，让ECS后台服务自动处理
    return NextResponse.json({
      success: true,
      message: `已通知ECS处理 ${pendingTasks.length} 个任务`,
      processed: 0,
      note: 'ECS后台服务将在30秒内自动处理任务',
      tasks: pendingTasks.map(t => ({ id: t.id, status: t.status }))
    })

  } catch (error) {
    console.error('队列处理失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '队列处理失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
