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

// GET - 下载隐私条款文件 (从Supabase Storage)
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
      // 尝试获取所有桶的列表
      const { data: buckets, error: bucketsError } = await storageSupabase.storage.listBuckets()
      console.log('🗃️ 可用的桶:', buckets?.map(bucket => bucket.name))
      if (bucketsError) {
        console.error('❌ 获取桶列表失败:', bucketsError)
      }

      // 获取当前活跃的隐私条款记录
      const { data: policyRecord, error: dbError } = await storageSupabase
        .from('privacy_policy')
        .select('file_name, file_path, file_type, file_size')
        .eq('is_active', true)
        .single()

      console.log('🔍 隐私条款记录:', {
        record: policyRecord,
        error: dbError
      })

      if (dbError || !policyRecord) {
        console.error('❌ 未找到活跃的隐私条款记录:', dbError)
        return NextResponse.json({ 
          success: false, 
          error: '当前没有可下载的隐私条款文件' 
        }, { status: 404 })
      }

      const storageFileName = policyRecord.file_path.replace('privacy-files/', '')

      console.log('🔍 尝试下载文件:', {
        bucket: 'privacy-files',
        fileName: storageFileName
      })

      // 从Supabase Storage下载文件
      const { data: fileData, error: downloadError } = await storageSupabase.storage
        .from('privacy-files')
        .download(storageFileName)

      console.log('📥 文件下载结果:', {
        fileData: fileData ? `文件大小: ${fileData.size} 字节` : '无文件数据',
        downloadError
      })

      if (downloadError) {
        console.error('❌ 从Supabase Storage下载文件失败:', downloadError)
        return NextResponse.json({
          success: false,
          error: '从Supabase Storage下载文件失败: ' + downloadError.message
        }, { status: 500 })
      }

      // 将Blob转换为Buffer
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      console.log('✅ 隐私条款文件下载成功', {
        adminId: adminId,
        fileName: policyRecord.file_name,
        fileSize: policyRecord.file_size,
        timestamp: new Date().toISOString()
      })

      // 设置响应头
      const headers = new Headers()
      headers.set('Content-Type', policyRecord.file_type || 'application/octet-stream')
      headers.set('Content-Disposition', `attachment; filename="${policyRecord.file_name}"`)
      headers.set('Content-Length', buffer.length.toString())
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      headers.set('Pragma', 'no-cache')
      headers.set('Expires', '0')

      return new NextResponse(buffer, { headers })

    } catch (error) {
      console.error('❌ 下载隐私条款文件失败:', error)
      return NextResponse.json({ 
        success: false, 
        error: '服务器内部错误或文件读取失败' 
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
