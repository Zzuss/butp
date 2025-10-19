import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { writeFile, mkdir } from 'fs/promises'
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

// POST - 上传隐私条款文件
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

    try {
      const formData = await request.formData()
      const file = formData.get('file') as File
      const version = formData.get('version') as string
      const title = formData.get('title') as string

      // 验证必填字段
      if (!file) {
        return NextResponse.json(
          { error: '请选择文件' },
          { status: 400 }
        )
      }

      if (!version) {
        return NextResponse.json(
          { error: '版本号不能为空' },
          { status: 400 }
        )
      }

      // 验证文件类型
      const allowedTypes = ['text/plain', 'text/markdown', 'text/html', 'application/pdf']
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|html|pdf)$/i)) {
        return NextResponse.json(
          { error: '仅支持 .txt, .md, .html, .pdf 文件格式' },
          { status: 400 }
        )
      }

      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: '文件大小不能超过 5MB' },
          { status: 400 }
        )
      }

      // 创建上传目录
      const uploadDir = join(process.cwd(), 'uploads', 'privacy-policy')
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      // 生成唯一文件名
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `privacy-policy-v${version}-${timestamp}.${fileExtension}`
      const filePath = join(uploadDir, fileName)
      const relativePath = `uploads/privacy-policy/${fileName}`

      // 保存文件到本地
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      // 读取文件内容（仅对文本文件）
      let originalContent = ''
      if (file.type.startsWith('text/') || file.name.match(/\.(txt|md|html)$/i)) {
        originalContent = buffer.toString('utf-8')
      }

      try {
        // 首先将所有现有的隐私条款设为非活跃状态
        const { error: deactivateError } = await supabase
          .from('privacy_policy')
          .update({ is_active: false })
          .eq('is_active', true)

        if (deactivateError) {
          console.error('❌ 停用现有隐私条款失败:', deactivateError)
          return NextResponse.json({
            success: false,
            error: '停用现有隐私条款失败: ' + deactivateError.message
          }, { status: 500 })
        }

        // 创建新的隐私条款记录
        const { data: newPrivacyPolicy, error } = await supabase
          .from('privacy_policy')
          .insert({
            title: title || '隐私政策与用户数据使用条款',
            file_name: fileName,
            file_path: relativePath,
            file_size: file.size,
            file_type: file.type,
            original_content: originalContent.substring(0, 10000), // 限制长度
            version: version,
            effective_date: new Date().toISOString().split('T')[0],
            created_by: adminId,
            is_active: true
          })
          .select()
          .single()

        if (error) {
          console.error('❌ 创建隐私条款记录失败:', error)
          return NextResponse.json({
            success: false,
            error: '创建隐私条款记录失败: ' + error.message
          }, { status: 500 })
        }

        console.log('✅ 隐私条款文件上传成功', {
          adminId: adminId,
          policyId: newPrivacyPolicy.id,
          fileName: fileName,
          fileSize: file.size,
          version: version,
          timestamp: new Date().toISOString()
        })

        return NextResponse.json({
          success: true,
          data: newPrivacyPolicy,
          message: '隐私条款文件上传成功'
        })

      } catch (dbError) {
        console.error('❌ 数据库操作失败:', dbError)
        return NextResponse.json({
          success: false,
          error: '数据库操作失败'
        }, { status: 500 })
      }

    } catch (uploadError) {
      console.error('❌ 文件上传失败:', uploadError)
      return NextResponse.json({
        success: false,
        error: '文件上传失败'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ 隐私条款上传API错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 })
  }
}
