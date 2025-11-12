import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'

// 文件存储目录（在无服务器环境使用 /tmp，可配置 FILE_UPLOAD_ROOT 覆盖）
const UPLOAD_ROOT =
  process.env.FILE_UPLOAD_ROOT ||
  (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION ? '/tmp' : process.cwd())
const UPLOAD_DIR = join(UPLOAD_ROOT, 'temp_imports', 'grades')

// 确保目录存在
async function ensureDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

// 文件信息存储（简单实现，实际可以使用数据库）
export const filesMetadata: Map<string, { name: string; size: number; uploadTime: string }> = new Map()

export async function POST(request: NextRequest) {
  try {
    await ensureDir()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 })
    }

    // 检查文件类型
    const allowedTypes = ['.xlsx', '.xls']
    const fileName = file.name
    const fileExtension = fileName.toLowerCase().endsWith('.xlsx')
      ? '.xlsx'
      : fileName.toLowerCase().endsWith('.xls')
      ? '.xls'
      : ''

    if (!allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { error: '不支持的文件格式，请上传Excel文件(.xlsx, .xls)' },
        { status: 400 }
      )
    }

    // 生成唯一文件ID
    const fileId = uuidv4()
    const savedFileName = `${fileId}${fileExtension}`
    const filePath = join(UPLOAD_DIR, savedFileName)

    // 保存文件
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // 保存文件元数据
    filesMetadata.set(fileId, {
      name: fileName,
      size: file.size,
      uploadTime: new Date().toISOString(),
    })

    console.log(`文件上传成功: ${fileName} -> ${filePath}`)

    return NextResponse.json({
      success: true,
      fileId,
      fileName,
      message: '文件上传成功',
    })
  } catch (error) {
    console.error('文件上传错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

// 获取文件元数据
export function getFileMetadata(fileId: string) {
  return filesMetadata.get(fileId)
}

// 获取所有文件元数据
export function getAllFilesMetadata() {
  return Array.from(filesMetadata.entries()).map(([id, metadata]) => ({
    id,
    ...metadata,
  }))
}

