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
    
    // 优先从ECS获取文件列表（所有环境）
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
          name: file.originalName || file.filename, // 优先使用原始文件名
          originalName: file.originalName || file.filename,
          size: file.size,
          uploadTime: file.uploadTime
        }))
        
        console.log(`✅ 从ECS获取到 ${filesFromMemory.length} 个文件`)
      }
    } catch (ecsError: any) {
      console.warn('⚠️ 从ECS获取文件列表失败，尝试本地方式:', ecsError.message)
    }
    
    // 如果ECS获取失败，记录错误但不回退到本地文件系统
    // 这确保文件列表始终反映ECS服务器的真实状态
    if (filesFromMemory.length === 0) {
      console.log('📡 ECS服务器上没有文件或连接失败，不使用本地文件')
    }

    return NextResponse.json({
      success: true,
      files: filesFromMemory,
      message: filesFromMemory.length === 0 ? '没有找到可导入的文件' : `找到 ${filesFromMemory.length} 个文件`,
      source: filesFromMemory.length > 0 && filesFromMemory[0].uploadTime ? 'ECS' : 'Local'
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
