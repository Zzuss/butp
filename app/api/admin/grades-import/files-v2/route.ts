import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY!

export const maxDuration = 10

// Vercel兼容的文件列表API - 使用数据库存储
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 从数据库获取文件列表
    const { data: files, error } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('status', 'uploaded')
      .order('upload_time', { ascending: false })
      .limit(50)

    if (error) {
      throw new Error(`获取文件列表失败: ${error.message}`)
    }

    // 转换为前端需要的格式
    const fileList = (files || []).map(file => ({
      id: file.file_id,
      name: file.original_name,
      size: file.file_size,
      uploadTime: file.upload_time,
    }))

    console.log(`获取文件列表: ${fileList.length} 个文件`)

    return NextResponse.json({
      success: true,
      files: fileList,
    })

  } catch (error) {
    console.error('获取文件列表错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取文件列表失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

// 清理过期文件
export async function DELETE() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 删除7天前的文件记录
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { error } = await supabase
      .from('uploaded_files')
      .delete()
      .lt('upload_time', sevenDaysAgo.toISOString())

    if (error) {
      throw new Error(`清理文件失败: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: '过期文件已清理'
    })

  } catch (error) {
    console.error('清理文件错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: '清理文件失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
