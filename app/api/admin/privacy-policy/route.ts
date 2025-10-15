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

// GET - 获取当前活跃的隐私条款
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
      // 查询当前活跃的隐私条款
      const { data: privacyPolicy, error } = await supabase
        .from('privacy_policy')
        .select('id, title, file_name, file_path, file_size, file_type, version, effective_date, created_at, updated_at, is_active, created_by')
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('❌ 查询隐私条款失败:', error)
        return NextResponse.json({
          success: false,
          error: '查询隐私条款失败: ' + error.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: privacyPolicy
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

// POST方法已移除，文件上传功能请使用 /api/admin/privacy-policy/upload
