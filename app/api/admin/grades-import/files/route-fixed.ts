import { NextResponse } from 'next/server'
import { readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'
import { getAllFilesMetadata } from '../upload/route'
import axios from 'axios'

// 文件存储目录
const UPLOAD_ROOT = process.env.FILE_UPLOAD_ROOT || (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION ? '/tmp' : process.cwd())
const UPLOAD_DIR = join(UPLOAD_ROOT, 'temp_imports', 'grades')

// ECS配置
const ECS_UPLOAD_URL = process.env.ECS_UPLOAD_URL || 'http://39.96.196.67:3001'

export const maxDuration = 30

export async function GET() {
  try {
    let filesFromMemory = []
    
    // 在Vercel环境下，优先从ECS获取文件列表
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
      console.log('🌐 从ECS获取文件列表...')
      
      try {
        const response = await axios({
          method: 'GET',
          url: `${ECS_UPLOAD_URL}/files`,
          timeout: 10000
        })
        
        if (response.data.success && response.data.files) {
          filesFromMemory = response.data.files.map((file: any) => ({
            id: file.filename.replace(/\.(xlsx|xls)$/, ''),
            name: file.filename,
            originalName: file.filename,
            size: file.size,
            uploadTime: file.uploadTime
          }))
          
          console.log(`✅ 从ECS获取到 ${filesFromMemory.length} 个文件`)
        }
      } catch (ecsError: any) {
        console.warn('⚠️ 从ECS获取文件列表失败，尝试本地方式:', ecsError.message)
      }
    }
    
    // 如果ECS获取失败或不在Vercel环境，尝试其他方式
    if (filesFromMemory.length === 0) {
      // 首先尝试从内存获取文件元数据
      filesFromMemory = getAllFilesMetadata()
      
      // 如果内存中没有文件信息，从文件系统重建
      if (filesFromMemory.length === 0 && existsSync(UPLOAD_DIR)) {
        console.log('📁 从本地文件系统重建文件元数据...')
        
        try {
          const files = readdirSync(UPLOAD_DIR)
          const excelFiles = files.filter(file => 
            file.endsWith('.xlsx') || file.endsWith('.xls')
          )

          filesFromMemory = excelFiles.map(fileName => {
            const filePath = join(UPLOAD_DIR, fileName)
            const stats = statSync(filePath)
            
            // 从文件名提取ID（假设格式为 id.xlsx）
            const fileId = fileName.replace(/\.(xlsx|xls)$/, '')
            
            return {
              id: fileId,
              name: fileName,
              originalName: fileName, // 没有原始名称信息时使用文件名
              size: stats.size,
              uploadTime: stats.mtime.toISOString()
            }
          })
          
          console.log(`📁 从本地文件系统发现 ${filesFromMemory.length} 个文件`)
        } catch (error) {
          console.error('❌ 读取本地文件系统失败:', error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      files: filesFromMemory,
      message: filesFromMemory.length === 0 ? '没有找到可导入的文件' : `找到 ${filesFromMemory.length} 个文件`,
      source: process.env.VERCEL ? 'ECS' : 'Local'
    })

  } catch (error) {
    console.error('获取文件列表失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取文件列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // 手动刷新文件列表
    return await GET()
  } catch (error) {
    console.error('刷新文件列表失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '刷新文件列表失败'
      },
      { status: 500 }
    )
  }
}
