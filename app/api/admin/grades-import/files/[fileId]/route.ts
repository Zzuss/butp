import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { filesMetadata } from '../../upload/route'
import axios from 'axios'

// 文件存储目录（在无服务器环境使用 /tmp，可配置 FILE_UPLOAD_ROOT 覆盖）
const UPLOAD_ROOT =
  process.env.FILE_UPLOAD_ROOT ||
  (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION ? '/tmp' : process.cwd())
const UPLOAD_DIR = join(UPLOAD_ROOT, 'temp_imports', 'grades')

// ECS配置
const ECS_UPLOAD_URL = process.env.ECS_UPLOAD_URL || 'http://39.96.196.67:3001'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params

    if (!fileId) {
      return NextResponse.json({ error: '文件ID不能为空' }, { status: 400 })
    }

    let ecsDeleted = false
    let localDeleted = false

    // 尝试删除ECS上的文件
    try {
      console.log(`🌐 尝试从ECS删除文件: ${fileId}`)
      console.log(`🔗 删除URL: ${ECS_UPLOAD_URL}/files/${fileId}`)
      
      const response = await axios({
        method: 'DELETE',
        url: `${ECS_UPLOAD_URL}/files/${fileId}`,
        timeout: 10000
      })
      
      if (response.status === 200 || response.status === 404) {
        ecsDeleted = true
        console.log(`✅ ECS文件删除成功: ${fileId}`)
      }
    } catch (ecsError: any) {
      console.error(`❌ ECS文件删除失败: ${fileId}`)
      console.error(`错误详情:`, ecsError.response?.data || ecsError.message)
      console.error(`HTTP状态码:`, ecsError.response?.status)
      
      // 如果是404错误，说明文件不存在，也算删除成功
      if (ecsError.response?.status === 404) {
        ecsDeleted = true
        console.log(`✅ ECS文件不存在，视为删除成功: ${fileId}`)
      }
    }

    // 尝试删除本地文件（可能有两种扩展名）
    const filePathXlsx = join(UPLOAD_DIR, `${fileId}.xlsx`)
    const filePathXls = join(UPLOAD_DIR, `${fileId}.xls`)

    if (existsSync(filePathXlsx)) {
      await unlink(filePathXlsx)
      localDeleted = true
      console.log(`✅ 本地文件删除成功: ${fileId}.xlsx`)
    } else if (existsSync(filePathXls)) {
      await unlink(filePathXls)
      localDeleted = true
      console.log(`✅ 本地文件删除成功: ${fileId}.xls`)
    }

    // 删除元数据
    if (filesMetadata.has(fileId)) {
      filesMetadata.delete(fileId)
      console.log(`已删除文件元数据: ${fileId}`)
    }

    // 只要ECS或本地任一删除成功就认为操作成功
    if (!ecsDeleted && !localDeleted) {
      console.log(`文件不存在: ${fileId}`)
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

    console.log(`文件删除成功: ${fileId}`)
    console.log(`当前剩余文件元数据数量: ${filesMetadata.size}`)
    
    // 列出所有剩余的元数据（用于调试）
    const remainingFiles = Array.from(filesMetadata.entries()).map(([id, meta]) => ({
      id,
      name: meta.name
    }))
    console.log(`剩余文件元数据:`, remainingFiles)

    return NextResponse.json({
      success: true,
      message: '文件删除成功',
      details: {
        ecsDeleted,
        localDeleted
      }
    })
  } catch (error) {
    console.error('删除文件错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: '删除文件失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

