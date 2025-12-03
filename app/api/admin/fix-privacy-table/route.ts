import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 验证管理员权限的辅助函数
function checkAdminPermission(request: NextRequest): { isValid: boolean, adminId?: string } {
  try {
    const adminSessionCookie = request.cookies.get('admin-session')
    
    if (!adminSessionCookie?.value) {
      return { isValid: false }
    }

    const adminSession = JSON.parse(adminSessionCookie.value)
    
    if (!adminSession.id || !adminSession.username || !adminSession.loginTime) {
      return { isValid: false }
    }

    // 检查会话是否过期（24小时）
    const loginTime = new Date(adminSession.loginTime)
    const now = new Date()
    const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)

    if (hoursSinceLogin > 24) {
      return { isValid: false }
    }

    return { isValid: true, adminId: adminSession.id }
  } catch (error) {
    console.error('检查管理员权限失败:', error)
    return { isValid: false }
  }
}

// POST - 修复隐私条款表结构
export async function POST(request: NextRequest) {
  try {
    // 检查管理员权限
    const { isValid, adminId } = checkAdminPermission(request)

    if (!isValid) {
      return NextResponse.json({ 
        success: false, 
        error: '权限不足，仅管理员可访问' 
      }, { status: 403 })
    }

    console.log('🔧 管理员开始修复隐私条款表结构:', adminId)

    const operations = []

    try {
      // 1. 删除所有现有记录
      console.log('🗑️ 步骤1: 清空现有记录...')
      const { data: existingRecords } = await supabase
        .from('user_privacy_agreements')
        .select('user_id')

      if (existingRecords && existingRecords.length > 0) {
        for (const record of existingRecords) {
          await supabase
            .from('user_privacy_agreements')
            .delete()
            .eq('user_id', record.user_id)
        }
        operations.push(`删除了 ${existingRecords.length} 条现有记录`)
      } else {
        operations.push('没有找到需要删除的记录')
      }

      // 2. 验证表结构
      console.log('🔍 步骤2: 验证表结构...')
      
      // 尝试插入一条测试记录来验证表结构
      const testRecord = {
        user_id: 'test_user_' + Date.now(),
        privacy_policy_file: 'test-file.docx',
        privacy_policy_version: new Date().toISOString(),
        agreed_at: new Date().toISOString(),
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        created_at: new Date().toISOString()
      }

      const { data: insertResult, error: insertError } = await supabase
        .from('user_privacy_agreements')
        .insert(testRecord)
        .select()

      if (insertError) {
        operations.push(`表结构验证失败: ${insertError.message}`)
        console.error('❌ 表结构验证失败:', insertError)
        
        return NextResponse.json({
          success: false,
          error: '表结构验证失败，请检查数据库表结构',
          details: insertError.message,
          operations
        }, { status: 500 })
      } else {
        operations.push('表结构验证成功')
        console.log('✅ 表结构验证成功')

        // 删除测试记录
        await supabase
          .from('user_privacy_agreements')
          .delete()
          .eq('user_id', testRecord.user_id)
        
        operations.push('已删除测试记录')
      }

      // 3. 最终验证
      console.log('🔍 步骤3: 最终验证...')
      const { count: finalCount } = await supabase
        .from('user_privacy_agreements')
        .select('*', { count: 'exact', head: true })

      operations.push(`最终记录数量: ${finalCount}`)

      return NextResponse.json({
        success: true,
        message: '隐私条款表结构修复完成',
        operations,
        finalRecordCount: finalCount
      })

    } catch (operationError) {
      console.error('❌ 修复操作失败:', operationError)
      return NextResponse.json({
        success: false,
        error: '修复操作失败: ' + (operationError as Error).message,
        operations
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ 修复隐私条款表结构失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 })
  }
}
