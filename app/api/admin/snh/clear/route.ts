import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 配置
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function DELETE() {
  try {
    console.log('Clearing all SNH mappings')
    
    // 先获取当前记录数
    const { count: currentCount } = await supabase
      .from('student_number_hash_mapping')
      .select('*', { count: 'exact', head: true })

    if (currentCount === 0) {
      return NextResponse.json({
        message: '没有需要清空的记录'
      })
    }

    // 删除所有记录
    const { error } = await supabase
      .from('student_number_hash_mapping')
      .delete()
      .gte('id', 0) // 删除所有记录

    if (error) {
      console.error('Database delete error:', error)
      return NextResponse.json(
        { error: '清空记录失败' },
        { status: 500 }
      )
    }

    console.log(`Successfully cleared ${currentCount} mapping records`)

    return NextResponse.json({
      message: `成功清空 ${currentCount} 条映射记录`
    })

  } catch (error) {
    console.error('Clear mappings error:', error)
    return NextResponse.json(
      { error: '清空记录失败' },
      { status: 500 }
    )
  }
}
