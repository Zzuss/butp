import { NextRequest, NextResponse } from 'next/server'
import { getStorageSupabase } from '@/lib/storageSupabase'

// 避免静态化与构建期执行
export const dynamic = 'force-dynamic'

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
      const storageSupabase = getStorageSupabase()
      // 尝试获取所有桶的列表
      const { data: buckets, error: bucketsError } = await storageSupabase.storage.listBuckets()
      console.log('🗃️ 可用的桶:', buckets?.map(bucket => bucket.name))
      if (bucketsError) {
        console.error('❌ 获取桶列表失败:', bucketsError)
      }

      // 🔥 新方案：直接从Storage查找隐私条款文件
      const possibleFiles = [
        'privacy-policy-latest.docx',
        'privacy-policy-latest.doc', 
        'privacy-policy-latest.pdf',
        'privacy-policy-latest.txt',
        'privacy-policy-latest.html'
      ]

      let fileData: Blob | null = null
      let fileName = ''
      let fileInfo: any = null

      // 尝试找到存在的文件
      for (const testFileName of possibleFiles) {
        try {
          console.log(`🔍 尝试下载文件: ${testFileName}`)
          
          // 先获取文件信息
          const { data: files, error: listError } = await storageSupabase.storage
            .from('privacy-files')
            .list('', {
              search: testFileName
            })

          if (!listError && files && files.length > 0) {
            fileInfo = files[0]
            console.log(`📋 找到文件信息:`, fileInfo)
          }

          // 下载文件
          const { data: downloadData, error: downloadError } = await storageSupabase.storage
            .from('privacy-files')
            .download(testFileName)

          if (!downloadError && downloadData) {
            fileData = downloadData
            fileName = testFileName
            console.log(`✅ 成功下载文件: ${testFileName}`)
            break
          }
        } catch (err) {
          console.log(`⚠️ 文件 ${testFileName} 不存在，继续尝试下一个`)
          continue
        }
      }

      if (!fileData) {
        console.error('❌ 未找到任何隐私条款文件')
        return NextResponse.json({ 
          success: false, 
          error: '当前没有可下载的隐私条款文件' 
        }, { status: 404 })
      }

      // 将Blob转换为Buffer
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // 获取文件类型
      const fileExtension = fileName.split('.').pop()?.toLowerCase()
      const mimeTypeMap: { [key: string]: string } = {
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'html': 'text/html'
      }
      const fileType = mimeTypeMap[fileExtension || ''] || 'application/octet-stream'

      console.log('✅ 隐私条款文件下载成功', {
        adminId: adminId,
        fileName: fileName,
        fileSize: fileData.size,
        timestamp: new Date().toISOString()
      })

      // 设置响应头
      const headers = new Headers()
      headers.set('Content-Type', fileType)
      headers.set('Content-Disposition', `attachment; filename="${fileName}"`)
      headers.set('Content-Length', buffer.length.toString())
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      headers.set('Pragma', 'no-cache')
      headers.set('Expires', '0')

      return new NextResponse(buffer, { headers })

    } catch (error) {
      console.error('❌ 下载隐私条款文件失败:', error)
      return NextResponse.json({ 
        success: false, 
        error: (error instanceof Error) ? error.message : '服务器内部错误或文件读取失败' 
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
