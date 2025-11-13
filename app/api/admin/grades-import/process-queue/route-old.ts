import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY!

const UPLOAD_ROOT = process.env.FILE_UPLOAD_ROOT || (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION ? '/tmp' : process.cwd())
const UPLOAD_DIR = join(UPLOAD_ROOT, 'temp_imports', 'grades')
const BATCH_SIZE = 1000 // 减小批次大小，避免单次操作过长

export const maxDuration = 60 // 单次处理限制在60秒

// 读取Excel文件
function readExcelFile(filePath: string): any[] {
  const XLSX = require('xlsx')
  
  if (!existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`)
  }
  
  const fileBuffer = readFileSync(filePath)
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  if (!worksheet) {
    throw new Error('Excel文件中没有找到工作表')
  }
  
  return XLSX.utils.sheet_to_json(worksheet)
}

// 处理数据行
function processDataRow(row: any): any {
  return {
    SNH: row.SNH || null,
    Semester_Offered: row.Semester_Offered || null,
    Current_Major: row.Current_Major || null,
    Course_ID: row.Course_ID || null,
    Course_Name: row.Course_Name || null,
    Grade: row.Grade ? String(row.Grade) : null,
    Grade_Remark: row.Grade_Remark || null,
    Course_Type: row.Course_Type || null,
    Course_Attribute: row['Course_Attribute '] || row.Course_Attribute || null,
    Hours: row.Hours ? String(row.Hours) : null,
    Credit: row.Credit ? String(row.Credit) : null,
    Offering_Unit: row.Offering_Unit || null,
    Tags: row.Tags || null,
    Description: row.Description || null,
    Exam_Type: row.Exam_Type || null,
    Assessment_Method: row['Assessment_Method '] || row.Assessment_Method || null,
    year: row.year ? parseInt(String(row.year)) : null,
  }
}

export async function POST() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // 检查是否有待处理的任务
    const { data: pendingTasks, error: taskQueryError } = await supabase
      .from('import_tasks')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)

    if (taskQueryError) {
      throw new Error(`查询待处理任务失败: ${taskQueryError.message}`)
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有待处理的任务',
        processed: 0
      })
    }

    console.log(`找到 ${pendingTasks.length} 个待处理任务，将由ECS后台处理`)

    // 返回成功，让ECS后台服务自动处理
    return NextResponse.json({
      success: true,
      message: `已通知ECS处理 ${pendingTasks.length} 个任务`,
      processed: 0,
      note: 'ECS后台服务将在30秒内自动处理任务'
    })

    if (queryError) {
      throw new Error(`查询待处理文件失败: ${queryError.message}`)
    }

    if (!pendingFiles || pendingFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有待处理的文件',
        processed: 0
      })
    }

    let processedCount = 0

    // 处理每个文件
    for (const fileDetail of pendingFiles) {
      try {
        // 标记文件为处理中
        await supabase
          .from('import_file_details')
          .update({ 
            status: 'processing',
            processed_at: new Date().toISOString()
          })
          .eq('id', fileDetail.id)

        // 确定文件路径
        const filePathXlsx = join(UPLOAD_DIR, `${fileDetail.file_id}.xlsx`)
        const filePathXls = join(UPLOAD_DIR, `${fileDetail.file_id}.xls`)
  } catch (error) {
    console.error('队列处理失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '队列处理失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// 检查并完成任务
async function checkAndCompleteTask(supabase: any, taskId: string) {
  // 查找指定任务的所有文件处理状态
  const { data: task } = await supabase
    .from('import_tasks')
    .select(`
      *,
      import_file_details(status, imported_count, records_count)
    `)
    .eq('id', taskId)
    .eq('status', 'processing')
    .single()

  if (!task) {
    return // 任务不存在或已完成
  }

  const files = task.import_file_details
  const allCompleted = files.every((f: any) => f.status === 'completed' || f.status === 'failed')
  
  if (allCompleted) {
    const totalRecords = files.reduce((sum: number, f: any) => sum + (f.records_count || 0), 0)
    const importedRecords = files.reduce((sum: number, f: any) => sum + (f.imported_count || 0), 0)
    const hasFailures = files.some((f: any) => f.status === 'failed')

    console.log(`任务 ${taskId} 所有文件处理完成:`, {
      totalFiles: files.length,
      totalRecords,
      importedRecords,
      hasFailures
    })

    if (hasFailures || importedRecords === 0) {
      // 有失败或没有导入任何数据，标记任务失败
      console.log('任务失败，回滚影子表...')
      
      // 清空影子表作为回滚
      try {
        await supabase.rpc('truncate_results_old')
      } catch (rollbackError) {
        console.error('回滚失败:', rollbackError)
      }

      await supabase
        .from('import_tasks')
        .update({
          status: 'failed',
          processed_files: files.length,
          total_records: totalRecords,
          imported_records: importedRecords,
          completed_at: new Date().toISOString(),
          error_message: '部分文件处理失败或没有导入任何数据'
        })
        .eq('id', taskId)
    } else {
      // 所有文件都成功，执行原子交换
      console.log('任务成功，执行原子交换...')
      try {
        const { error: swapError } = await supabase.rpc('swap_results_with_old')
        
        if (swapError) {
          throw new Error(`原子交换失败: ${swapError.message}`)
        }

        console.log('原子交换成功完成')

        // 标记任务完成
        await supabase
          .from('import_tasks')
          .update({
            status: 'completed',
            processed_files: files.length,
            total_records: totalRecords,
            imported_records: importedRecords,
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId)

      } catch (swapError) {
        // 交换失败，回滚影子表
        console.log('原子交换失败，回滚影子表...')
        try {
          await supabase.rpc('truncate_results_old')
        } catch (rollbackError) {
          console.error('回滚失败:', rollbackError)
        }

        await supabase
          .from('import_tasks')
          .update({
            status: 'failed',
            processed_files: files.length,
            total_records: totalRecords,
            imported_records: importedRecords,
            completed_at: new Date().toISOString(),
            error_message: swapError instanceof Error ? swapError.message : '原子交换失败'
          })
          .eq('id', taskId)
      }
    }
  }
}
