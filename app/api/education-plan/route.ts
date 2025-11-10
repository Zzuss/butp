import { NextRequest, NextResponse } from 'next/server'
import { storageSupabase } from '@/lib/storageSupabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Supabase Storage URL:', process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL)
    console.log('🔑 Supabase Storage Anon Key:', process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY ? '✅ 存在' : '❌ 未设置')

    // 尝试获取所有桶的列表
    const { data: buckets, error: bucketsError } = await storageSupabase.storage.listBuckets()
    console.log('🗃️ 可用的桶:', buckets?.map(bucket => bucket.name))
    if (bucketsError) {
      console.error('❌ 获取桶列表失败:', bucketsError)
    }

    // 列出 education-plans Bucket 中的文件
    const { data, error } = await storageSupabase.storage
      .from('education-plans')
      .list()

    console.log('🔍 完整的文件列表数据:', JSON.stringify(data, null, 2))
    console.log('🗂️ Storage List Result:', {
      filesCount: data?.length,
      fileNames: data?.map(file => file.name),
      error: error
    })

    if (error) {
      console.error('❌ 获取文件列表失败:', error)
      return NextResponse.json([], { status: 500 })
    }

    // 如果没有文件，打印更多诊断信息
    if (!data || data.length === 0) {
      console.warn('⚠️ 没有找到任何文件，检查桶权限和文件存在性')
      
      // 检查桶是否存在
      const { data: bucketData, error: bucketError } = await storageSupabase.storage.getBucket('education-plans')
      console.log('🔍 education-plans 桶信息:', {
        exists: !!bucketData,
        error: bucketError
      })
    }

    // 转换文件数据为前端需要的格式
    const plans = data.map(file => ({
      name: file.name,
      year: file.name.match(/\d{4}/)?.[0] || '未知',
      size: file.metadata?.size || 0,
      lastModified: file.updated_at || new Date().toISOString(),
      url: storageSupabase.storage
        .from('education-plans')
        .getPublicUrl(file.name).data.publicUrl
    }))

    return NextResponse.json(plans)
  } catch (catchError) {
    console.error('❌ 文件获取异常:', catchError)
    return NextResponse.json([], { status: 500 })
  }
}
