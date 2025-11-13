import { NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { filesMetadata } from '../upload/route'

// 文件存储目录
const UPLOAD_ROOT = process.env.FILE_UPLOAD_ROOT || (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION ? '/tmp' : process.cwd())
const UPLOAD_DIR = join(UPLOAD_ROOT, 'temp_imports', 'grades')

export const maxDuration = 10

export async function POST() {
  try {
    console.log('🔄 刷新文件列表...')
    
    if (!existsSync(UPLOAD_DIR)) {
      console.log('上传目录不存在，清空元数据')
      filesMetadata.clear()
      return NextResponse.json({
        success: true,
        message: '文件列表已刷新',
        files: []
      })
    }

    // 扫描文件系统中的实际文件
    const dirFiles = await readdir(UPLOAD_DIR)
    const excelFiles = dirFiles.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
    console.log(`文件系统中找到 ${excelFiles.length} 个Excel文件`)

    // 清空现有元数据
    filesMetadata.clear()

    // 重建元数据
    for (const fileName of excelFiles) {
      const fileId = fileName.replace(/\.(xlsx|xls)$/, '')
      const filePath = join(UPLOAD_DIR, fileName)
      
      try {
        const stats = await stat(filePath)
        if (stats.isFile()) {
          // 生成友好的文件名
          const friendlyName = `成绩文件-${fileId.substring(0, 8)}.xlsx`
          
          filesMetadata.set(fileId, {
            name: friendlyName,
            size: stats.size,
            uploadTime: stats.mtime.toISOString(),
          })
          
          console.log(`重建文件元数据: ${fileId} -> ${friendlyName}`)
        }
      } catch (err) {
        console.error(`处理文件 ${fileName} 时出错:`, err)
      }
    }

    // 获取重建后的文件列表
    const files = Array.from(filesMetadata.entries()).map(([id, metadata]) => ({
      id,
      ...metadata,
    }))

    console.log(`✅ 文件列表刷新完成，共 ${files.length} 个文件`)

    return NextResponse.json({
      success: true,
      message: `文件列表已刷新，找到 ${files.length} 个文件`,
      files
    })

  } catch (error) {
    console.error('刷新文件列表失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '刷新文件列表失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}
