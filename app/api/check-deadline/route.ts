import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - 检查是否超过截止时间
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('deadline_config')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // 如果没有配置或未启用，返回未超时
    if (!data || !data.is_enabled || !data.deadline) {
      return NextResponse.json({
        success: true,
        isPastDeadline: false,
        deadline: null
      })
    }

    // 检查是否超过截止时间
    const deadline = new Date(data.deadline)
    const now = new Date()
    const isPastDeadline = now > deadline

    return NextResponse.json({
      success: true,
      isPastDeadline,
      deadline: data.deadline
    })
  } catch (error) {
    console.error('检查截止时间失败:', error)
    return NextResponse.json({
      success: false,
      message: '检查截止时间失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}
