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

export async function DELETE(request: NextRequest) {
  try {
    // 检查管理员权限
    const { isValid, adminId } = checkAdminPermission(request)

    if (!isValid) {
      return NextResponse.json({ 
        success: false, 
        error: '权限不足，仅管理员可访问' 
      }, { status: 403 })
    }

    console.log('🔧 管理员清空隐私条款记录 - 开始', {
      adminId: adminId,
      timestamp: new Date().toISOString()
    })

    try {
      // 清空所有用户的隐私条款同意记录
      const { data, error } = await supabase
        .from('privacy_policy')
        .delete()
        .not('SNH', 'is', null) // 删除所有记录（SNH不为null的记录）

      if (error) {
        console.error('❌ 清空隐私条款记录失败:', error)
        return NextResponse.json({
          success: false,
          error: '清空隐私条款记录失败: ' + error.message
        }, { status: 500 })
      }

      // 查询清空后的记录数量确认
      const { count, error: countError } = await supabase
        .from('privacy_policy')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        console.warn('⚠️ 无法确认清空结果:', countError)
      }

      console.log('✅ 隐私条款记录清空成功', {
        adminId: adminId,
        remainingRecords: count || 0,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        message: '所有用户的隐私条款同意记录已清空',
        remainingRecords: count || 0,
        clearedAt: new Date().toISOString(),
        clearedBy: adminId
      })

    } catch (dbError) {
      console.error('❌ 数据库操作失败:', dbError)
      return NextResponse.json({
        success: false,
        error: '数据库操作失败'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ 隐私条款管理API错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 })
  }
}

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

    try {
      // 查询隐私条款同意记录统计
      const { count, error } = await supabase
        .from('privacy_policy')
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('❌ 查询隐私条款记录失败:', error)
        return NextResponse.json({
          success: false,
          error: '查询隐私条款记录失败: ' + error.message
        }, { status: 500 })
      }

      // 查询最近的同意记录
      const { data: recentRecords, error: recentError } = await supabase
        .from('privacy_policy')
        .select('SNH')
        .limit(10)

      if (recentError) {
        console.error('❌ 查询最近记录失败:', recentError)
      }

      return NextResponse.json({
        success: true,
        totalAgreements: count || 0,
        recentAgreements: recentRecords || [],
        queriedAt: new Date().toISOString()
      })

    } catch (dbError) {
      console.error('❌ 数据库操作失败:', dbError)
      return NextResponse.json({
        success: false,
        error: '数据库操作失败'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ 隐私条款管理API错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 })
  }
}
