import { NextResponse } from 'next/server'
import { readdir, readFileSync, existsSync, stat, mkdirSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'
import { getAllFilesMetadata, filesMetadata } from '../upload/route'

export const maxDuration = 300

const readdirAsync = promisify(readdir)
const statAsync = promisify(stat)

// 文件存储目录（在无服务器环境使用 /tmp，可配置 FILE_UPLOAD_ROOT 覆盖）
const UPLOAD_ROOT =
  process.env.FILE_UPLOAD_ROOT ||
  (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION ? '/tmp' : process.cwd())
const UPLOAD_DIR = join(UPLOAD_ROOT, 'temp_imports', 'grades')
const MAIN_TABLE = 'academic_results'
const SHADOW_TABLE = 'academic_results_old'
const DEFAULT_BATCH_SIZE = parseInt(process.env.IMPORT_BATCH_SIZE || '2000', 10)

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

function extractYearFromFileName(fileName: string | null | undefined): number | null {
  if (!fileName) return null
  const name = String(fileName)

  const cohortMatch = name.match(/cohort\s*(19\d{2}|20\d{2})/i)
  if (cohortMatch?.[1]) return parseInt(cohortMatch[1], 10)

  const anyYearMatch = name.match(/\b(19\d{2}|20\d{2})\b/)
  if (anyYearMatch?.[1]) return parseInt(anyYearMatch[1], 10)

  return null
}

// Supabase配置（从环境变量读取）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sdtarodxdvkeeiaouddo.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'
// 服务端密钥（从环境变量读取，如果没有则使用anon key）
// 如果anon key有足够权限，可以直接使用anon key
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY || supabaseAnonKey

// 获取Supabase客户端（使用anon key进行数据操作）
function getSupabaseClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(supabaseUrl, supabaseAnonKey)
}

// 获取Supabase服务端客户端（优先使用service role key，如果没有则使用anon key）
function getSupabaseServiceClient() {
  const { createClient } = require('@supabase/supabase-js')
  const key = serviceRoleKey || supabaseAnonKey
  console.log(`使用Supabase客户端: URL=${supabaseUrl}, Key类型=${key === supabaseAnonKey ? 'anon' : 'service_role'}`)
  return createClient(supabaseUrl, key)
}

// 检查表是否存在
async function checkTableExists(supabase: any, tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('SNH')
      .limit(1)
    
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return false
      }
      // 其他错误假设表存在
      return true
    }
    return true
  } catch (error) {
    return false
  }
}

// 确认主表和影子表都存在
async function ensureRequiredTables(supabase: any): Promise<void> {
  const mainExists = await checkTableExists(supabase, MAIN_TABLE)
  const shadowExists = await checkTableExists(supabase, SHADOW_TABLE)

  if (!mainExists) {
    throw new Error(`主表 ${MAIN_TABLE} 不存在，请先在数据库中创建该表`)
  }

  if (!shadowExists) {
    throw new Error(`影子表 ${SHADOW_TABLE} 不存在，请先在数据库中创建该表`)
  }
}

// 清空影子表数据
async function truncateShadowTable(supabase: any): Promise<void> {
  console.log(`清空影子表 ${SHADOW_TABLE}...`)
  try {
    const { error } = await supabase.rpc('truncate_results_old')
    if (error) {
      console.log('调用 truncate_results_old 失败，使用 DELETE 方式:', error.message)
      const { error: deleteError } = await supabase
        .from(SHADOW_TABLE)
        .delete()
        .neq('SNH', 'dummy_value_that_should_not_exist')

      if (deleteError) {
        throw deleteError
      }
    } else {
      console.log('影子表已通过 RPC 清空')
    }
  } catch (err) {
    console.error('清空影子表失败:', err)
    throw new Error(`清空影子表失败: ${err instanceof Error ? err.message : '未知错误'}`)
  }
}

// 读取Excel文件并转换为JSON
function readExcelFile(filePath: string): any[] {
  const XLSX = require('xlsx')
  
  if (!existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`)
  }
  
  const fileBuffer = readFileSync(filePath)
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  
  // 获取第一个工作表
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  if (!worksheet) {
    throw new Error('Excel文件中没有找到工作表')
  }
  
  return XLSX.utils.sheet_to_json(worksheet)
}

// 处理数据行
function processDataRow(row: any, fileYear: number | null): any {
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
    year: fileYear ?? (row.year ? parseInt(String(row.year), 10) : null),
  }
}

// 导入数据到影子表
async function importToShadowTable(
  supabase: any,
  files: Array<{ id: string; name: string }>
): Promise<{ importedCount: number; totalCount: number; errors: string[] }> {
  let totalImported = 0
  let totalCount = 0
  const errors: string[] = []
  const batchSize = DEFAULT_BATCH_SIZE

  console.log(`开始导入 ${files.length} 个文件到影子表...`)

  for (const file of files) {
    try {
      const fileYear = extractYearFromFileName(file.name)
      // 确定文件路径
      const filePathXlsx = join(UPLOAD_DIR, `${file.id}.xlsx`)
      const filePathXls = join(UPLOAD_DIR, `${file.id}.xls`)
      
      const filePath = existsSync(filePathXlsx) ? filePathXlsx : filePathXls
      
      if (!existsSync(filePath)) {
        errors.push(`文件不存在: ${file.name}`)
        continue
      }

      console.log(`读取文件: ${file.name}`)
      const jsonData = readExcelFile(filePath)
      
      if (jsonData.length === 0) {
        console.log(`文件 ${file.name} 中没有数据，跳过`)
        continue
      }

      totalCount += jsonData.length
      const processedData = jsonData.map((r) => processDataRow(r, fileYear))

      console.log(`开始导入文件 ${file.name}，共 ${processedData.length} 条记录...`)

      // 分批导入
      for (let i = 0; i < processedData.length; i += batchSize) {
        const batch = processedData.slice(i, i + batchSize)
        const batchNum = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(processedData.length / batchSize)

        try {
          const { error } = await supabase
            .from(SHADOW_TABLE)
            .insert(batch, { returning: 'minimal' })

          if (error) {
            const errorMsg = `文件 ${file.name} 批次 ${batchNum}: ${error.message || JSON.stringify(error)}`
            errors.push(errorMsg)
            console.error(`❌ ${errorMsg}`, error)
          } else {
            totalImported += batch.length
            console.log(`✅ 文件 ${file.name} 批次 ${batchNum}/${totalBatches} 成功: ${batch.length} 条记录`)
          }
        } catch (dbError) {
          const errorMsg = `文件 ${file.name} 批次 ${batchNum}: 数据库连接错误`
          errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`, dbError)
        }

        // 移除不必要的延迟，加快批量导入速度
      }
    } catch (error) {
      const errorMsg = `处理文件 ${file.name} 时出错: ${error instanceof Error ? error.message : '未知错误'}`
      errors.push(errorMsg)
      console.error(`❌ ${errorMsg}`, error)
    }
  }

  return { importedCount: totalImported, totalCount, errors }
}

// 原子交换表（使用RPC函数实现真正的原子操作，无空档期）
async function swapTables(supabase: any): Promise<void> {
  console.log(`开始原子交换表（无空档期），影子表: ${SHADOW_TABLE}...`)

  try {
    const { error } = await supabase.rpc('swap_results_with_old')

    if (error) {
      throw new Error(`原子交换表失败: ${error.message}`)
    }

    console.log('✅ 表交换完成（原子操作，无空档期）')
  } catch (error) {
    throw new Error(`表交换失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 回滚：清空影子表数据
async function rollback(supabase: any): Promise<void> {
  console.log(`回滚：清空影子表 ${SHADOW_TABLE}...`)

  try {
    const { error } = await supabase.rpc('truncate_results_old')

    if (error) {
      console.log('RPC 清空失败，使用 DELETE 方式:', error.message)
      const { error: deleteError } = await supabase
        .from(SHADOW_TABLE)
        .delete()
        .neq('SNH', 'dummy_value_that_should_not_exist')

      if (deleteError) {
        console.warn('清空影子表失败:', deleteError.message)
      } else {
        console.log(`回滚完成：影子表 ${SHADOW_TABLE} 已清空（使用DELETE方式）`)
      }
    } else {
      console.log(`回滚完成：影子表 ${SHADOW_TABLE} 已清空（使用RPC方式）`)
    }
  } catch (error) {
    console.warn('回滚时出错:', error)
  }
}

export async function POST() {
  try {
    ensureUploadDir()

    // 获取所有文件元数据
    let allFiles = getAllFilesMetadata()
    console.log(`导入API: 元数据中有 ${allFiles.length} 个文件`)
    
    // 如果元数据为空，尝试从文件系统重建（serverless环境可能丢失内存）
    if (allFiles.length === 0) {
      console.log('导入API: 元数据为空，尝试从文件系统扫描文件...')
      try {
        const dirFiles = await readdirAsync(UPLOAD_DIR)
        const excelFiles = dirFiles.filter((f: string) => f.endsWith('.xlsx') || f.endsWith('.xls'))
        console.log(`导入API: 文件系统中找到 ${excelFiles.length} 个Excel文件`)
        
        // 从文件名提取UUID（文件名格式：{uuid}.xlsx）
        for (const fileName of excelFiles) {
          const fileId = fileName.replace(/\.(xlsx|xls)$/, '')
          const filePath = join(UPLOAD_DIR, fileName)
          try {
            const stats = await statAsync(filePath)
            if (stats.isFile() && !filesMetadata.has(fileId)) {
              // 重建元数据（使用文件名作为显示名）
              filesMetadata.set(fileId, {
                name: fileName,
                size: stats.size,
                uploadTime: stats.mtime.toISOString(),
              })
              console.log(`导入API: 重建元数据: ${fileId} -> ${fileName}`)
            }
          } catch (err) {
            console.error(`导入API: 处理文件 ${fileName} 时出错:`, err)
          }
        }
        
        // 重新获取元数据
        allFiles = getAllFilesMetadata()
        console.log(`导入API: 重建后元数据中有 ${allFiles.length} 个文件`)
      } catch (err) {
        console.error('导入API: 从文件系统扫描文件失败:', err)
      }
    }
    
    // 验证文件是否仍然存在（与文件列表API保持一致）
    const existingFiles: Array<{ id: string; name: string }> = []
    for (const file of allFiles) {
      const filePathXlsx = join(UPLOAD_DIR, `${file.id}.xlsx`)
      const filePathXls = join(UPLOAD_DIR, `${file.id}.xls`)
      
      if (existsSync(filePathXlsx) || existsSync(filePathXls)) {
        existingFiles.push({ id: file.id, name: file.name })
        console.log(`导入API: 文件存在: ${file.name} (${file.id})`)
      } else {
        console.log(`导入API: 文件不存在: ${file.name} (${file.id})`)
      }
    }
    
    if (existingFiles.length === 0) {
      console.log('导入API: 没有可导入的文件')
      return NextResponse.json(
        {
          success: false,
          message: '没有可导入的文件',
          importedCount: 0,
          totalCount: 0,
          errors: [],
        },
        { status: 400 }
      )
    }
    
    console.log(`导入API: 准备导入 ${existingFiles.length} 个文件`)
    // 使用验证后的文件列表
    const files = existingFiles

    // 使用服务端密钥进行所有数据库操作（包括数据插入）
    const supabase = getSupabaseServiceClient()

    // 步骤1: 确认表存在
    try {
      await ensureRequiredTables(supabase)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : '表结构检查失败',
          importedCount: 0,
          totalCount: 0,
          errors: [error instanceof Error ? error.message : '未知错误'],
        },
        { status: 500 }
      )
    }

    // 步骤1.5: 清空影子表
    try {
      await truncateShadowTable(supabase)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: error instanceof Error ? error.message : '清空影子表失败',
          importedCount: 0,
          totalCount: 0,
          errors: [error instanceof Error ? error.message : '未知错误'],
        },
        { status: 500 }
      )
    }

    // 步骤2: 导入数据到影子表
    const importResult = await importToShadowTable(supabase, files)

    // 步骤3: 检查导入结果
    if (importResult.errors.length > 0 && importResult.importedCount === 0) {
      // 完全失败，回滚
      await rollback(supabase)
      return NextResponse.json(
        {
          success: false,
          message: '导入失败，已回滚',
          importedCount: 0,
          totalCount: importResult.totalCount,
          errors: importResult.errors,
        },
        { status: 500 }
      )
    }

    // 步骤4: 如果导入成功（至少部分成功），交换表
    if (importResult.importedCount > 0) {
      try {
        await swapTables(supabase)
        
        return NextResponse.json({
          success: true,
          message: `成功导入 ${importResult.importedCount} 条记录`,
          importedCount: importResult.importedCount,
          totalCount: importResult.totalCount,
          errors: importResult.errors,
        })
      } catch (error) {
        // 交换失败，回滚
        await rollback(supabase)
        return NextResponse.json(
          {
            success: false,
            message: '表交换失败，已回滚',
            importedCount: importResult.importedCount,
            totalCount: importResult.totalCount,
            errors: [
              ...importResult.errors,
              `表交换失败: ${error instanceof Error ? error.message : '未知错误'}`,
            ],
          },
          { status: 500 }
        )
      }
    } else {
      // 没有导入任何数据
      await rollback(supabase)
      return NextResponse.json(
        {
          success: false,
          message: '没有成功导入任何数据',
          importedCount: 0,
          totalCount: importResult.totalCount,
          errors: importResult.errors,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('导入过程出错:', error)
    return NextResponse.json(
      {
        success: false,
        message: '导入过程出错',
        importedCount: 0,
        totalCount: 0,
        errors: [error instanceof Error ? error.message : '未知错误'],
      },
      { status: 500 }
    )
  }
}

