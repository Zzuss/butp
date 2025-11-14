import { NextRequest, NextResponse } from 'next/server'
import {
  ensureTablesExist,
  importSingleFileToShadow,
} from '@/lib/grades-import-helpers'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const fileId = body?.fileId as string | undefined

    if (!fileId) {
      return NextResponse.json(
        { success: false, message: '文件 ID 不能为空' },
        { status: 400 }
      )
    }

    await ensureTablesExist()

    const result = await importSingleFileToShadow(fileId)

    return NextResponse.json({
      success: true,
      message: `成功导入 ${result.imported} / ${result.total} 条记录到影子表`,
      importedCount: result.imported,
      totalCount: result.total,
    })
  } catch (error) {
    console.error('单文件导入失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '导入失败',
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

