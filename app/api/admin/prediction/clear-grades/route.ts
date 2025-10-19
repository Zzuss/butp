import { NextRequest, NextResponse } from 'next/server'

// 清除成绩表数据
export async function POST() {
  try {
    const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'
    
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 先查询现有记录数
    const { count: beforeCount } = await supabase
      .from('academic_results')
      .select('*', { count: 'exact', head: true })

    // 删除所有成绩表记录
    const { error } = await supabase
      .from('academic_results')
      .delete()
      .neq('SNH', 'dummy_value_that_should_not_exist') // 删除所有记录

    if (error) {
      console.error('清除成绩表失败:', error)
      return NextResponse.json(
        { success: false, error: `数据库操作失败: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedRecords: beforeCount || 0
      }
    })

  } catch (error) {
    console.error('清除成绩表时发生错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
