import { NextRequest, NextResponse } from 'next/server'
import { storageSupabase } from '@/lib/storageSupabase'

// 列出教育计划文件
async function listEducationPlans() {
  console.log('🔍 获取文件列表从 Supabase Storage...')
  
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

// 删除教育计划文件
async function deleteEducationPlan(filename: string) {
  console.log('🗑️ 开始删除文件:', filename)
  
  const { data, error } = await storageSupabase.storage
    .from('education-plans')
    .remove([filename])

  if (error) {
    console.error('❌ Supabase Storage 删除失败:', error)
    throw error
  }

  return data
}

export async function DELETE(request: NextRequest) {
  try {
    const { filename } = await request.json()

    console.log('📋 接收到删除请求:', { filename })

    if (!filename) {
      return NextResponse.json(
        { message: '请提供文件名' },
        { status: 400 }
      )
    }

    // 验证文件名格式，防止路径遍历攻击
    // 允许更灵活的文件名匹配
    const validFilenamePattern = /^(Education_Plan_PDF_\d{4}\.pdf|[\w-]+\.pdf)$/
    if (!validFilenamePattern.test(filename)) {
      console.error('❌ 无效的文件名格式:', filename)
      return NextResponse.json(
        { message: '无效的文件名' },
        { status: 400 }
      )
    }

    // 检查文件是否存在
    try {
      const existingPlans = await listEducationPlans()
      console.log('📋 现有文件列表:', existingPlans.map(plan => plan.name))
      
      const existingPlan = existingPlans.find(plan => plan.name === filename)
      
      if (!existingPlan) {
        console.error('❌ 文件不存在:', filename)
        return NextResponse.json(
          { message: '文件不存在' },
          { status: 404 }
        )
      }
    } catch (error) {
      console.warn('Failed to check existing files:', error)
      // 继续删除流程，让 Supabase 处理文件不存在的情况
    }

    // 从 Supabase Storage 删除文件
    try {
      const deleteResult = await deleteEducationPlan(filename)
      console.log('✅ 文件删除成功:', { filename, deleteResult })

      return NextResponse.json({
        message: '培养方案删除成功',
      })
    } catch (deleteError) {
      console.error('❌ 文件删除失败:', deleteError)
      return NextResponse.json(
        { message: '删除失败，请重试' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Failed to delete education plan:', error)
    
    // 提供更详细的错误信息
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return NextResponse.json(
          { message: '文件不存在' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { message: '删除失败，请重试' },
      { status: 500 }
    )
  }
}
