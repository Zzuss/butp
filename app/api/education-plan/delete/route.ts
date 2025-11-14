import { NextRequest, NextResponse } from 'next/server'
import { getStorageSupabase } from '@/lib/storageSupabase'
import { supabase } from '@/lib/supabase'

// 列出教育计划文件
export async function listEducationPlans() {
  console.log('🔍 获取文件列表从 Supabase Storage...')
  
  const storageSupabase = getStorageSupabase()
  const { data, error } = await storageSupabase.storage
    .from('education-plans')
    .list()
  
  if (error) {
    console.error('❌ 获取文件列表失败:', error)
    throw error
  }
  
  console.log(`✅ 获取到 ${data?.length || 0} 个文件`)
  return data || []
}

// 删除教育计划文件
export async function deleteEducationPlan(filename: string) {
  console.log('🗑️ 开始删除文件:', filename)
  
  const storageSupabase = getStorageSupabase()
  const { data, error } = await storageSupabase.storage
    .from('education-plans')
    .remove([filename])

  if (error) {
    console.error('❌ 文件删除失败:', error)
    throw error
  }

  // 额外检查文件是否真的被删除
  const remainingFiles = await listEducationPlans()
  const stillExists = remainingFiles.some(file => file.name === filename)
  
  if (stillExists) {
    throw new Error(`文件 ${filename} 删除失败，仍然存在`)
  }

  console.log('✅ 文件删除成功:', filename)
  return data
}

// DELETE - 删除教育计划文件
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename } = body

    if (!filename) {
      return NextResponse.json(
        { error: '文件名不能为空' },
        { status: 400 }
      )
    }

    // 删除文件
    await deleteEducationPlan(filename)

    // 从数据库中删除记录（如果需要）
    const { error: dbDeleteError } = await supabase
      .from('education_plans')
      .delete()
      .eq('filename', filename)

    if (dbDeleteError) {
      console.error('删除数据库记录失败:', dbDeleteError)
    }

    return NextResponse.json({ 
      success: true, 
      message: '文件删除成功' 
    })

  } catch (error) {
    console.error('删除文件错误:', error)
    return NextResponse.json(
      { 
        error: '删除文件失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
