import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    console.log('开始清空成绩表数据...')
    
    // 直接使用Supabase客户端清空数据（和导入/查询相同的方式）
    const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co'
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'
    
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    try {
      // 先查询当前记录数（使用更可靠的方法）
      console.log('查询清空前的记录数...')
      let recordsBeforeDelete = 0
      
      try {
        // 方法1：使用count查询
        const { count, error: countError } = await supabase
          .from('academic_results')
          .select('*', { count: 'exact', head: true })
        
        if (!countError && count !== null && count !== undefined) {
          recordsBeforeDelete = count
        } else {
          // 方法2：如果count查询失败，使用select查询获取数组长度
          console.log('count查询异常，使用备用方法...')
          const { data, error: selectError } = await supabase
            .from('academic_results')
            .select('SNH')
          
          if (!selectError && data) {
            recordsBeforeDelete = data.length
          }
        }
      } catch (queryError) {
        console.warn('查询记录数时出现异常:', queryError)
        recordsBeforeDelete = 0
      }
      
      console.log(`清空前记录数: ${recordsBeforeDelete} 条`)
      
      // 执行清空操作
      console.log('执行清空操作...')
      const { error: deleteError } = await supabase
        .from('academic_results')
        .delete()
        .gte('year', 0) // 删除所有记录（year >= 0，覆盖所有年份）
      
      if (deleteError) {
        throw new Error(`清空操作失败: ${deleteError.message}`)
      }
      
      // 验证清空结果（使用更可靠的方法）
      console.log('验证清空结果...')
      let recordsAfterDelete = 0
      
      try {
        // 方法1：使用count查询
        const { count, error: countError } = await supabase
          .from('academic_results')
          .select('*', { count: 'exact', head: true })
        
        if (!countError && count !== null && count !== undefined) {
          recordsAfterDelete = count
        } else {
          // 方法2：如果count查询失败，使用select查询获取数组长度
          console.log('验证count查询异常，使用备用方法...')
          const { data, error: selectError } = await supabase
            .from('academic_results')
            .select('SNH')
          
          if (!selectError && data) {
            recordsAfterDelete = data.length
          }
        }
      } catch (queryError) {
        console.warn('验证清空结果时出现异常:', queryError)
        recordsAfterDelete = 0
      }
      
      console.log(`✅ 清空完成: ${recordsBeforeDelete} → ${recordsAfterDelete} 条记录`)
      
      return NextResponse.json({
        success: true,
        message: `成功清空成绩表！删除了 ${recordsBeforeDelete} 条记录`,
        beforeCount: recordsBeforeDelete,
        afterCount: recordsAfterDelete,
        executedAt: new Date().toISOString()
      })
      
    } catch (dbError) {
      console.error('数据库清空操作失败:', dbError)
      
      return NextResponse.json({
        success: false,
        error: `数据库清空失败: ${dbError instanceof Error ? dbError.message : '未知错误'}`,
        suggestion: '请检查数据库连接或权限设置'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('清空成绩表失败:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `清空失败: ${error instanceof Error ? error.message : '未知错误'}` 
      },
      { status: 500 }
    )
  }
}
