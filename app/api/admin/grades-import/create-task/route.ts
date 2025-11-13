import { NextResponse } from 'next/server'
import { getAllFilesMetadata } from '../upload/route'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY!

export const maxDuration = 30

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 先调用文件列表API获取最新的文件状态
    const filesResponse = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/admin/grades-import/files`)
    const filesData = await filesResponse.json()
    
    const files = filesData.success ? filesData.files : []
    
    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有可导入的文件，请先上传Excel文件' },
        { status: 400 }
      )
    }

    // 创建导入任务
    const { data: task, error: taskError } = await supabase
      .from('import_tasks')
      .insert({
        total_files: files.length,
        status: 'pending'
      })
      .select()
      .single()

    if (taskError) {
      throw new Error(`创建任务失败: ${taskError.message}`)
    }

    // 创建文件处理详情
    const fileDetails = files.map((file: any) => ({
      task_id: task.id,
      file_id: file.id,
      file_name: file.name,
      status: 'pending'
    }))

    const { error: detailsError } = await supabase
      .from('import_file_details')
      .insert(fileDetails)

    if (detailsError) {
      // 回滚任务
      await supabase.from('import_tasks').delete().eq('id', task.id)
      throw new Error(`创建文件详情失败: ${detailsError.message}`)
    }

    return NextResponse.json({
      success: true,
      taskId: task.id,
      message: `已创建导入任务，包含 ${files.length} 个文件`
    })

  } catch (error) {
    console.error('创建导入任务失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '创建导入任务失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
