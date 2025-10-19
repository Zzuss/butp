import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('开始查询成绩表记录数...')
    
    // 直接使用Supabase客户端查询（和导入成绩表相同的方式）
    const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'
    
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    try {
      console.log('执行数据库查询...')
      
      // 获取总记录数
      const { count: totalCount, error: countError } = await supabase
        .from('academic_results')
        .select('*', { count: 'exact', head: true })
      
      if (countError) {
        throw new Error(`查询总数失败: ${countError.message}`)
      }
      
      console.log(`查询结果: 总计 ${totalCount} 条记录`)
      
      return NextResponse.json({
        success: true,
        count: totalCount,
        lastUpdated: new Date().toISOString()
      })
      
    } catch (dbError) {
      console.error('数据库查询错误:', dbError)
      
      // 如果直接查询失败，返回错误信息而不是固定数字
      return NextResponse.json({
        success: false,
        error: `数据库查询失败: ${dbError instanceof Error ? dbError.message : '未知错误'}`,
        suggestion: '请检查数据库连接或使用MCP工具直接查询'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('查询成绩表记录数失败:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `查询失败: ${error instanceof Error ? error.message : '未知错误'}` 
      },
      { status: 500 }
    )
  }
}