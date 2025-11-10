import { NextRequest, NextResponse } from 'next/server'
import { storageSupabase } from '@/lib/storageSupabase'

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

// POST - 上传隐私条款文件到Supabase Storage
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

      // 验证必填字段
      if (!file) {
        return NextResponse.json(
          { error: '请选择文件' },
          { status: 400 }
        )
      }

      // 验证文件类型
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'application/msword', 
        'application/pdf', 
        'text/plain', 
        'text/html'
      ]
      const allowedExtensions = /\.(docx|doc|pdf|txt|html)$/i
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.test(file.name)) {
        return NextResponse.json(
          { error: '仅支持 .docx, .doc, .pdf, .txt, .html 文件格式' },
          { status: 400 }
        )
      }

      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: '文件大小不能超过 10MB' },
          { status: 400 }
        )
      }

      // 生成文件名
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'docx'
      const fileName = `privacy-policy-latest.${fileExtension}`
      
      // 转换文件为Buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      // 上传文件到Supabase Storage
      const { data: uploadData, error: uploadError } = await storageSupabase.storage
        .from('privacy-files')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true // 覆盖同名文件
        })

      if (uploadError) {
        console.error('❌ 文件上传到Supabase Storage失败:', uploadError)
        return NextResponse.json({
          success: false,
          error: '文件上传失败: ' + uploadError.message
        }, { status: 500 })
      }

      // 更新数据库记录（仅存储元数据）
      try {
        // 将所有现有记录设为非活跃状态
        const { error: deactivateError } = await storageSupabase
          .from('privacy_policy')
          .update({ is_active: false })
          .eq('is_active', true)

        // 创建新的隐私条款记录（只存储元数据）
        const { data: newRecord, error: insertError } = await storageSupabase
          .from('privacy_policy')
          .insert({
            title: '隐私政策与用户数据使用条款',
            file_name: fileName,
            file_path: `privacy-files/${fileName}`,
            file_size: file.size,
            file_type: file.type,
            version: new Date().toISOString().substring(0, 10), // 使用日期作为版本号
            effective_date: new Date().toISOString().split('T')[0],
            created_by: adminId,
            is_active: true
          })
          .select()
          .single()

        if (insertError) {
          console.error('❌ 数据库记录创建失败:', insertError)
          return NextResponse.json({
            success: false,
            error: '数据库记录创建失败: ' + insertError.message
          }, { status: 500 })
        }

        console.log('✅ 隐私条款文件上传成功', {
          adminId: adminId,
          fileName: fileName,
          fileSize: file.size,
          storagePath: uploadData.path,
          timestamp: new Date().toISOString()
        })

        return NextResponse.json({
          success: true,
          message: '隐私条款文件上传成功，所有用户需要重新同意',
          data: {
            fileName: fileName,
            fileSize: file.size,
            storagePath: uploadData.path,
            uploadedAt: new Date().toISOString()
          }
        })

      } catch (dbError) {
        console.error('❌ 数据库操作失败:', dbError)
        return NextResponse.json({
          success: false,
          error: '数据库操作失败: ' + dbError.message
        }, { status: 500 })
      }

    } catch (uploadError) {
      console.error('❌ 文件处理失败:', uploadError)
      return NextResponse.json({
        success: false,
        error: '文件处理失败'
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