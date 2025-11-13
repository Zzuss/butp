import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY!

export const maxDuration = 10

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { taskId } = await params

    // 查询任务状态和文件详情
    const { data: task, error: taskError } = await supabase
      .from('import_tasks')
      .select(`
        *,
        import_file_details(*)
      `)
      .eq('id', taskId)
      .single()

    if (taskError) {
      throw new Error(`查询任务失败: ${taskError.message}`)
    }

    if (!task) {
      return NextResponse.json(
        { success: false, message: '任务不存在' },
        { status: 404 }
      )
    }

    // 计算进度
    const files = task.import_file_details || []
    const completedFiles = files.filter((f: any) => f.status === 'completed' || f.status === 'failed').length
    const progress = task.total_files > 0 ? Math.round((completedFiles / task.total_files) * 100) : 0

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        totalFiles: task.total_files,
        processedFiles: completedFiles,
        totalRecords: task.total_records || 0,
        importedRecords: task.imported_records || 0,
        progress,
        errorMessage: task.error_message,
        createdAt: task.created_at,
        completedAt: task.completed_at,
        files: files.map((f: any) => ({
          id: f.id,
          fileName: f.file_name,
          status: f.status,
          recordsCount: f.records_count || 0,
          importedCount: f.imported_count || 0,
          errorMessage: f.error_message,
          processedAt: f.processed_at
        }))
      }
    })

  } catch (error) {
    console.error('查询任务状态失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '查询任务状态失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
