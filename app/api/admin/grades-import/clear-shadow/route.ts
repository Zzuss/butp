import { NextResponse } from 'next/server'
import { ensureTablesExist, truncateShadowTable } from '@/lib/grades-import-helpers'

export async function POST() {
  try {
    await ensureTablesExist()
    await truncateShadowTable()

    return NextResponse.json({
      success: true,
      message: '影子表已清空',
    })
  } catch (error) {
    console.error('清空影子表失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '清空影子表失败',
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

