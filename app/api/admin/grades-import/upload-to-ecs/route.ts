import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import FormData from 'form-data'
import axios from 'axios'

// 本地存储配置
const UPLOAD_ROOT = process.env.FILE_UPLOAD_ROOT || (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION ? '/tmp' : process.cwd())
const UPLOAD_DIR = join(UPLOAD_ROOT, 'temp_imports', 'grades')

// ECS配置
const ECS_UPLOAD_URL = process.env.ECS_UPLOAD_URL || 'http://39.96.196.67:3001'

export const maxDuration = 60

// 文件元数据存储
export const filesMetadata = new Map<string, {
  id: string
  name: string
  originalName: string
  size: number
  uploadTime: string
}>()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: '没有找到文件' },
        { status: 400 }
      )
    }

    // 验证文件类型
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '只支持 Excel 文件 (.xlsx, .xls)' },
        { status: 400 }
      )
    }

    // 生成文件ID和路径
    const fileId = uuidv4()
    const fileExtension = file.name.endsWith('.xlsx') ? '.xlsx' : '.xls'
    const fileName = `${fileId}${fileExtension}`
    
    // 确保上传目录存在
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true })
    }

    const filePath = join(UPLOAD_DIR, fileName)

    // 保存到本地
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    console.log(`✅ 文件已保存到本地: ${filePath}`)

    // 同时上传到ECS
    try {
      await uploadToECS(fileId, file.name, buffer)
      console.log(`✅ 文件已上传到ECS: ${fileId}`)
    } catch (ecsError) {
      console.warn(`⚠️ ECS上传失败，但本地保存成功: ${ecsError}`)
      // ECS上传失败不影响整体流程，因为还有本地文件
    }

    // 存储文件元数据
    const metadata = {
      id: fileId,
      name: fileName,
      originalName: file.name,
      size: file.size,
      uploadTime: new Date().toISOString()
    }

    filesMetadata.set(fileId, metadata)

    console.log(`文件上传成功: ${file.name} -> ${fileName}`)

    return NextResponse.json({
      success: true,
      message: '文件上传成功',
      file: {
        id: fileId,
        name: file.name,
        size: file.size,
        uploadTime: metadata.uploadTime
      }
    })

  } catch (error) {
    console.error('文件上传失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '文件上传失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

// 上传文件到ECS
async function uploadToECS(fileId: string, originalName: string, buffer: Buffer) {
  const formData = new FormData()
  formData.append('file', buffer, {
    filename: `${fileId}.xlsx`,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  formData.append('fileId', fileId)
  formData.append('originalName', originalName)

  const response = await axios({
    method: 'POST',
    url: `${ECS_UPLOAD_URL}/upload`,
    data: formData,
    headers: {
      ...formData.getHeaders(),
      'User-Agent': 'Vercel-Upload/1.0'
    },
    timeout: 30000
  })

  if (response.status !== 200) {
    throw new Error(`ECS上传失败: ${response.status}`)
  }

  return response.data
}

// 导出函数供其他API使用
export function getAllFilesMetadata() {
  return Array.from(filesMetadata.values())
}
