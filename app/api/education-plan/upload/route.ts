import { NextRequest, NextResponse } from 'next/server'
import { getStorageSupabase } from '@/lib/storageSupabase'

// 配置 API 路由以支持大文件上传
export const runtime = 'nodejs'
export const maxDuration = 60 // 设置最大执行时间为60秒

// 上传教育计划文件到 Supabase Storage
async function uploadEducationPlan(file: File, filename: string) {
  console.log('☁️ 开始上传到 Supabase Storage...')
  
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const storageSupabase = getStorageSupabase()
  const { data, error } = await storageSupabase.storage
    .from('education-plans')
    .upload(filename, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/pdf'
    })

  if (error) {
    console.error('❌ Supabase Storage 上传失败:', error)
    throw error
  }

  return data
}

// 列出教育计划文件
async function listEducationPlans() {
  console.log('🔍 获取文件列表从 Supabase Storage...')
  
  const storageSupabase = getStorageSupabase()
  const { data, error } = await storageSupabase.storage
    .from('education-plans')
    .list()

  if (error) {
    console.error('❌ 获取文件列表失败:', error)
    throw error
  }

  return data.map(file => ({
    name: file.name,
    year: file.name.match(/\d{4}/)?.[0] || '未知',
    size: file.metadata?.size || 0,
    lastModified: file.updated_at || new Date().toISOString(),
    url: storageSupabase.storage
      .from('education-plans')
      .getPublicUrl(file.name).data.publicUrl
  }))
}

export async function POST(request: NextRequest) {
  try {
    console.log('📤 开始处理上传请求...')
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const year = formData.get('year') as string

    console.log('📋 请求数据:', { fileName: file?.name, year, fileSize: file?.size })

    if (!file) {
      console.error('❌ 没有接收到文件')
      return NextResponse.json(
        { message: '请选择文件' },
        { status: 400 }
      )
    }

    if (!year) {
      console.error('❌ 没有接收到年份')
      return NextResponse.json(
        { message: '请输入年份' },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (file.type !== 'application/pdf') {
      console.error('❌ 文件类型错误:', file.type)
      return NextResponse.json(
        { message: '只能上传 PDF 文件' },
        { status: 400 }
      )
    }

    // 验证年份格式
    if (!/^\d{4}$/.test(year)) {
      console.error('❌ 年份格式错误:', year)
      return NextResponse.json(
        { message: '年份格式不正确' },
        { status: 400 }
      )
    }

    // 检查文件大小（50MB = 52428800 bytes）
    if (file.size > 52428800) {
      console.error('❌ 文件太大:', file.size)
      return NextResponse.json(
        { message: '文件大小不能超过 50MB' },
        { status: 400 }
      )
    }

    // 生成文件名
    const filename = `Education_Plan_PDF_${year}.pdf`
    console.log('📝 生成文件名:', filename)

    // 检查文件是否已存在
    try {
      console.log('🔍 检查是否存在重复文件...')
      const existingPlans = await listEducationPlans()
      const existingPlan = existingPlans.find(plan => plan.name === filename)
      
      if (existingPlan) {
        console.log('⚠️ 文件已存在:', filename)
        return NextResponse.json(
          { message: `${year} 年的培养方案已存在，请先删除后再上传` },
          { status: 400 }
        )
      }
    } catch (listError) {
      // 如果列表获取失败，记录警告但继续上传流程
      console.warn('⚠️ 获取文件列表失败，继续上传:', listError)
    }

    // 上传文件到 Supabase Storage
    console.log('☁️ 开始上传到 Supabase Storage...')
    try {
      await uploadEducationPlan(file, filename)
      console.log('✅ 上传成功:', filename)
      
      return NextResponse.json({
        message: '培养方案上传成功',
        filename,
      })
    } catch (uploadError) {
      console.error('❌ Supabase 上传失败:', uploadError)
      throw uploadError
    }

  } catch (error) {
    console.error('💥 上传处理过程中发生错误:', error)
    
    // 提供更详细的错误信息
    let errorMessage = '上传失败，请重试'
    
    if (error instanceof Error) {
      console.error('错误详情:', error.message, error.stack)
      
      if (error.message.includes('already exists')) {
        errorMessage = '文件已存在，请先删除后再上传'
      } else if (error.message.includes('size')) {
        errorMessage = '文件大小超过限制'
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
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}