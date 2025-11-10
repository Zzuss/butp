import { NextRequest, NextResponse } from 'next/server'
import { 
  uploadNotificationImageToSpecificStorage, 
  getNotificationImageUrlFromSpecificStorage 
} from '@/lib/supabase'

// 配置 API 路由以支持文件上传
export const runtime = 'nodejs'
export const maxDuration = 30 // 设置最大执行时间为30秒

export async function POST(request: NextRequest) {
  try {
    console.log('📤 开始处理通知图片上传请求...')
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    console.log('📋 请求数据:', { fileName: file?.name, fileSize: file?.size, fileType: file?.type })

    if (!file) {
      console.error('❌ 没有接收到文件')
      return NextResponse.json(
        { error: '请选择图片文件' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.error('❌ 文件类型错误:', file.type)
      return NextResponse.json(
        { error: '只支持 JPG、PNG、GIF、WebP 格式的图片' },
        { status: 400 }
      )
    }

    // 检查文件大小（5MB = 5242880 bytes）
    if (file.size > 5242880) {
      console.error('❌ 文件太大:', file.size)
      return NextResponse.json(
        { error: '图片大小不能超过 5MB' },
        { status: 400 }
      )
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `notification_${timestamp}.${extension}`
    console.log('📝 生成文件名:', filename)

    // 上传文件到 Supabase Storage
    console.log('☁️ 开始上传到指定 Supabase Storage...')
    try {
      await uploadNotificationImageToSpecificStorage(file, filename)
      const imageUrl = getNotificationImageUrlFromSpecificStorage(filename)
      
      console.log('✅ 上传成功:', filename)
      console.log('🔗 图片URL:', imageUrl)
      
      return NextResponse.json({
        message: '图片上传成功',
        filename,
        imageUrl,
      })
    } catch (uploadError) {
      console.error('❌ Supabase 上传失败:', uploadError)
      throw uploadError
    }

  } catch (error) {
    console.error('💥 上传处理过程中发生错误:', error)
    
    // 提供更详细的错误信息
    let errorMessage = '图片上传失败，请重试'
    
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack)
      
      if (error.message.includes('size')) {
        errorMessage = '图片大小超过限制'
      } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        errorMessage = '没有上传权限，请检查配置'
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = '网络连接失败，请检查网络'
      } else {
        errorMessage = `上传失败：${error.message}`
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
