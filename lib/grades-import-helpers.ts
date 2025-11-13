import { readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'
import { filesMetadata } from '@/app/api/admin/grades-import/upload/route'

const readdir = promisify(require('fs').readdir)
const stat = promisify(require('fs').stat)

const DEFAULT_BATCH_SIZE = parseInt(process.env.IMPORT_BATCH_SIZE || '2000', 10)

const UPLOAD_ROOT =
  process.env.FILE_UPLOAD_ROOT ||
  (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION ? '/tmp' : process.cwd())
export const UPLOAD_DIR = join(UPLOAD_ROOT, 'temp_imports', 'grades')
export const MAIN_TABLE = 'academic_results'
export const SHADOW_TABLE = 'academic_results_old'

export function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

function getSupabaseServiceClient() {
  const { createClient } = require('@supabase/supabase-js')
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASELOCAL_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://sdtarodxdvkeeiaouddo.supabase.co'
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM'
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY ||
    supabaseAnonKey

  const key = serviceRoleKey || supabaseAnonKey
  return createClient(supabaseUrl, key)
}

async function checkTableExists(supabase: any, tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).select('SNH').limit(1)
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return false
      }
    }
    return true
  } catch {
    return false
  }
}

export async function ensureTablesExist() {
  const supabase = getSupabaseServiceClient()
  const mainExists = await checkTableExists(supabase, MAIN_TABLE)
  const shadowExists = await checkTableExists(supabase, SHADOW_TABLE)
  if (!mainExists) {
    throw new Error(`主表 ${MAIN_TABLE} 不存在，请先在数据库中创建该表`)
  }
  if (!shadowExists) {
    throw new Error(`影子表 ${SHADOW_TABLE} 不存在，请先在数据库中创建该表`)
  }
}

export async function truncateShadowTable() {
  const supabase = getSupabaseServiceClient()
  try {
    const { error } = await supabase.rpc('truncate_results_old')
    if (error) {
      console.log('truncate_results_old RPC 失败，使用 DELETE 方式:', error.message)
      const { error: deleteError } = await supabase
        .from(SHADOW_TABLE)
        .delete()
        .neq('SNH', 'dummy_value_that_should_not_exist')

      if (deleteError) {
        throw deleteError
      }
    }
  } catch (err) {
    throw new Error(`清空影子表失败: ${err instanceof Error ? err.message : '未知错误'}`)
  }
}

function readExcelRows(filePath: string) {
  const XLSX = require('xlsx')
  if (!existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`)
  }
  const buffer = readFileSync(filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    throw new Error('Excel 文件中没有找到工作表')
  }
  return XLSX.utils.sheet_to_json(worksheet)
}

function mapExcelRow(row: any) {
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

export async function importSingleFileToShadow(fileId: string) {
  ensureUploadDir()
  const metadata = filesMetadata.get(fileId)
  if (!metadata) {
    throw new Error('找不到文件元数据，请重新上传文件')
  }

  const xlsxPath = join(UPLOAD_DIR, `${fileId}.xlsx`)
  const xlsPath = join(UPLOAD_DIR, `${fileId}.xls`)
  const filePath = existsSync(xlsxPath) ? xlsxPath : xlsPath
  if (!existsSync(filePath)) {
    throw new Error('文件不存在，请重新上传')
  }

  const rows = readExcelRows(filePath)
  if (!rows.length) {
    return { imported: 0, total: 0 }
  }

  const supabase = getSupabaseServiceClient()
  let totalImported = 0
  const processedRows = rows.map(mapExcelRow)

  for (let i = 0; i < processedRows.length; i += DEFAULT_BATCH_SIZE) {
    const batch = processedRows.slice(i, i + DEFAULT_BATCH_SIZE)
    const { error } = await supabase
      .from(SHADOW_TABLE)
      .insert(batch, { returning: 'minimal' })
    if (error) {
      throw new Error(`插入影子表失败: ${error.message || JSON.stringify(error)}`)
    }
    totalImported += batch.length
  }

  return { imported: totalImported, total: processedRows.length }
}

export async function swapShadowToMain() {
  const supabase = getSupabaseServiceClient()
  const { error } = await supabase.rpc('swap_results_with_old')
  if (error) {
    throw new Error(`原子交换失败: ${error.message || JSON.stringify(error)}`)
  }
}

export async function listUploadedFiles() {
  ensureUploadDir()
  const files = await readdir(UPLOAD_DIR).catch(() => [])
  return files.filter((name) => name.endsWith('.xlsx') || name.endsWith('.xls'))
}

export async function getFileStat(fileName: string) {
  ensureUploadDir()
  const filePath = join(UPLOAD_DIR, fileName)
  return stat(filePath)
}

