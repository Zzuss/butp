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

// GET - 检查用户隐私条款同意记录状态
export async function GET(request: NextRequest) {
  try {
    // 检查管理员权限
    const { isValid, adminId } = checkAdminPermission(request)

    if (!isValid) {
      return NextResponse.json({ 
        success: false, 
        error: '权限不足，仅管理员可访问' 
      }, { status: 403 })
    }

    console.log('🔍 管理员检查用户隐私条款同意记录状态:', adminId)

    // 查询所有用户同意记录
    const { data: agreements, error: agreementsError, count } = await supabase
      .from('user_privacy_agreements')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (agreementsError) {
      console.error('❌ 查询用户同意记录失败:', agreementsError)
      return NextResponse.json({
        success: false,
        error: '查询用户同意记录失败: ' + agreementsError.message
      }, { status: 500 })
    }

    console.log(`📊 用户同意记录统计: 总计 ${count} 条记录`)

    // 按文件分组统计
    const fileStats: { [key: string]: number } = {}
    agreements?.forEach(agreement => {
      const fileName = agreement.privacy_policy_file || 'unknown'
      fileStats[fileName] = (fileStats[fileName] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      data: {
        totalCount: count,
        agreements: agreements?.slice(0, 10), // 只返回前10条记录作为示例
        fileStats,
        summary: {
          totalRecords: count,
          uniqueFiles: Object.keys(fileStats).length,
          latestAgreement: agreements?.[0]?.created_at || null
        }
      }
    })

  } catch (error) {
    console.error('❌ 检查用户同意记录状态失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 })
  }
}
