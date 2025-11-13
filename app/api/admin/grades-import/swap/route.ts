import { NextResponse } from 'next/server'
import { ensureTablesExist, swapShadowToMain } from '@/lib/grades-import-helpers'

export async function POST() {
  try {
    await ensureTablesExist()
    await swapShadowToMain()

    return NextResponse.json({
      success: true,
      message: '原子交换成功，影子表数据已生效',
    })
  } catch (error) {
    console.error('执行原子交换失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '原子交换失败',
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    )
  }
}

