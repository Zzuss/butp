import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { filesMetadata } from '../../upload/route'

// 文件存储目录
const UPLOAD_DIR = join(process.cwd(), 'temp_imports', 'grades')

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params

    if (!fileId) {
      return NextResponse.json({ error: '文件ID不能为空' }, { status: 400 })
    }

    // 尝试删除文件（可能有两种扩展名）
    const filePathXlsx = join(UPLOAD_DIR, `${fileId}.xlsx`)
    const filePathXls = join(UPLOAD_DIR, `${fileId}.xls`)

    let deleted = false
    if (existsSync(filePathXlsx)) {
      await unlink(filePathXlsx)
      deleted = true
    } else if (existsSync(filePathXls)) {
      await unlink(filePathXls)
      deleted = true
    }

    // 删除元数据
    if (filesMetadata.has(fileId)) {
      filesMetadata.delete(fileId)
      console.log(`已删除文件元数据: ${fileId}`)
    } else {
      console.log(`文件元数据不存在: ${fileId}`)
    }

    if (!deleted) {
      console.log(`文件不存在于文件系统: ${fileId}`)
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

