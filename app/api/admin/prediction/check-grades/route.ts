import { NextRequest, NextResponse } from 'next/server'

// 检查成绩表状态
export async function GET() {
  try {
    const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'
    
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 查询成绩表记录数量
    const { count, error } = await supabase
      .from('academic_results')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('查询成绩表失败:', error)
      return NextResponse.json(
        { success: false, error: `数据库查询失败: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRecords: count || 0
      }
    })

  } catch (error) {
    console.error('检查成绩表时发生错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
