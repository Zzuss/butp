import { NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { filesMetadata } from '../upload/route'
import axios from 'axios'

// 文件存储目录
const UPLOAD_ROOT = process.env.FILE_UPLOAD_ROOT || (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION ? '/tmp' : process.cwd())
const UPLOAD_DIR = join(UPLOAD_ROOT, 'temp_imports', 'grades')

// ECS配置
const ECS_UPLOAD_URL = process.env.ECS_UPLOAD_URL || 'http://39.96.196.67:3001'

export const maxDuration = 10

export async function POST() {
  try {
    console.log('🔄 刷新文件列表...')
    let filesFromECS = []
    
    // 优先从ECS获取文件列表
    try {
      console.log('🌐 从ECS获取文件列表...')
      const response = await axios({
        method: 'GET',
        url: `${ECS_UPLOAD_URL}/files`,
        timeout: 10000
      })
      
      if (response.data.success && response.data.files) {
        filesFromECS = response.data.files.map((file: any) => ({
          id: file.filename.replace(/\.(xlsx|xls)$/, ''),
          name: file.filename,
          originalName: file.filename,
          size: file.size,
          uploadTime: file.uploadTime
        }))
        
        console.log(`✅ 从ECS获取到 ${filesFromECS.length} 个文件`)
        
        return NextResponse.json({
          success: true,
          message: `文件列表已刷新，从ECS找到 ${filesFromECS.length} 个文件`,
          files: filesFromECS,
          source: 'ECS'
        })
      }
    } catch (ecsError: any) {
      console.warn('⚠️ 从ECS获取文件列表失败，尝试本地方式:', ecsError.message)
    }
    
    // ECS获取失败，返回空列表（不再使用本地文件）
    console.log('📡 ECS服务器上没有文件或连接失败，返回空列表')
    
    return NextResponse.json({
      success: true,
      message: '没有找到可导入的文件',
      files: [],
      source: 'ECS'
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
