import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

// 文件存储目录
const UPLOAD_ROOT = process.env.FILE_UPLOAD_ROOT || (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION ? '/tmp' : process.cwd())
const UPLOAD_DIR = join(UPLOAD_ROOT, 'temp_imports', 'grades')

export const maxDuration = 30

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params
    
    console.log(`📥 ECS请求下载文件: ${fileId}`)
    
    // 尝试两种文件扩展名
    const filePathXlsx = join(UPLOAD_DIR, `${fileId}.xlsx`)
    const filePathXls = join(UPLOAD_DIR, `${fileId}.xls`)
    
    let filePath: string
    let exists = false
    
    if (existsSync(filePathXlsx)) {
      filePath = filePathXlsx
      exists = true
    } else if (existsSync(filePathXls)) {
      filePath = filePathXls
      exists = true
    } else {
      console.error(`❌ 文件不存在: ${fileId}`)
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      )
    }
    
    // 读取文件
    const fileBuffer = await readFile(filePath)
    
    console.log(`✅ 文件下载成功: ${fileId}, 大小: ${fileBuffer.length} bytes`)
    
    // 返回文件流
    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileId}.xlsx"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
    
  } catch (error) {
    console.error('文件下载失败:', error)
    return NextResponse.json(
      { 
        error: '文件下载失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}
