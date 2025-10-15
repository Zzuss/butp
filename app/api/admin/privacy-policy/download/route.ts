import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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

// GET - 下载隐私条款文件
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少隐私条款ID参数' },
        { status: 400 }
      )
    }

    try {
      // 查询隐私条款记录
      const { data: privacyPolicy, error } = await supabase
        .from('privacy_policy')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !privacyPolicy) {
        return NextResponse.json({
          success: false,
          error: '隐私条款不存在'
        }, { status: 404 })
      }

      // 构建文件路径
      const filePath = join(process.cwd(), privacyPolicy.file_path)

      if (!existsSync(filePath)) {
        return NextResponse.json({
          success: false,
          error: '文件不存在或已被删除'
        }, { status: 404 })
      }

      // 读取文件
      const fileBuffer = await readFile(filePath)

      // 确定 MIME 类型
      let contentType = privacyPolicy.file_type || 'application/octet-stream'
      if (privacyPolicy.file_name.endsWith('.pdf')) {
        contentType = 'application/pdf'
      } else if (privacyPolicy.file_name.endsWith('.html')) {
        contentType = 'text/html'
      } else if (privacyPolicy.file_name.endsWith('.md')) {
        contentType = 'text/markdown'
      } else if (privacyPolicy.file_name.endsWith('.txt')) {
        contentType = 'text/plain'
      }

      console.log('✅ 隐私条款文件下载', {
        adminId: adminId,
        policyId: privacyPolicy.id,
        fileName: privacyPolicy.file_name,
        fileSize: privacyPolicy.file_size,
        timestamp: new Date().toISOString()
      })

      // 返回文件
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${privacyPolicy.file_name}"`,
          'Content-Length': privacyPolicy.file_size.toString()
        }
      })

    } catch (fileError) {
      console.error('❌ 文件读取失败:', fileError)
      return NextResponse.json({
        success: false,
        error: '文件读取失败'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ 隐私条款下载API错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 })
  }
}
