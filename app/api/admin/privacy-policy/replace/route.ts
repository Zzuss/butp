import { NextRequest, NextResponse } from 'next/server'
import { getStorageSupabase } from '@/lib/storageSupabase'
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

      // 获取 Supabase 客户端
      const storageSupabase = getStorageSupabase()

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

      // 🔥 新方案：文件上传成功后，清空主数据库中的所有用户同意记录
      // 这样所有用户都需要重新同意新的隐私条款
      try {
        console.log('🗑️ 开始清空用户同意记录...')
        
        // 先查询现有记录数量
        const { count: beforeCount, error: countError } = await supabase
          .from('user_privacy_agreements')
          .select('*', { count: 'exact', head: true })

        if (countError) {
          console.error('❌ 查询记录数量失败:', countError)
        } else {
          console.log(`📊 清空前记录数量: ${beforeCount}`)
        }

        // 使用最简单的清空方式 - 先查询所有记录然后删除
        const { data: allRecords, error: queryError } = await supabase
          .from('user_privacy_agreements')
          .select('user_id')

        if (queryError) {
          console.error('❌ 查询现有记录失败:', queryError)
          return NextResponse.json({
            success: false,
            error: '文件上传成功，但查询用户同意记录失败: ' + queryError.message
          }, { status: 500 })
        }

        if (allRecords && allRecords.length > 0) {
          console.log(`🗑️ 找到 ${allRecords.length} 条记录，开始逐条删除...`)
          
          // 逐条删除记录
          let deletedCount = 0
          for (const record of allRecords) {
            const { error: deleteError } = await supabase
              .from('user_privacy_agreements')
              .delete()
              .eq('user_id', record.user_id)

            if (deleteError) {
              console.error(`❌ 删除记录失败 (user_id: ${record.user_id}):`, deleteError)
            } else {
              deletedCount++
            }
          }

          console.log(`✅ 成功删除 ${deletedCount}/${allRecords.length} 条记录`)
          
          if (deletedCount < allRecords.length) {
            console.warn(`⚠️ 警告：有 ${allRecords.length - deletedCount} 条记录删除失败`)
          }
        } else {
          console.log('📝 没有找到需要删除的记录')
        }

        console.log(`✅ 用户同意记录清空操作完成`)
          
        // 验证清空结果
        const { count: afterCount, error: verifyError } = await supabase
          .from('user_privacy_agreements')
          .select('*', { count: 'exact', head: true })

        if (!verifyError) {
          console.log(`🔍 清空后记录数量: ${afterCount}`)
          if (afterCount === 0) {
            console.log('✅ 确认：所有用户同意记录已成功清空')
          } else {
            console.warn(`⚠️ 警告：仍有 ${afterCount} 条记录未被清空`)
          }
        }
      } catch (clearUserError) {
        console.error('❌ 清空用户同意记录异常:', clearUserError)
        return NextResponse.json({
          success: false,
          error: '文件上传成功，但清空用户同意记录时发生异常: ' + (clearUserError as Error).message
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