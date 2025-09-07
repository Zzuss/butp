import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function DELETE(request: NextRequest) {
  try {
    const { filename } = await request.json()

    if (!filename) {
      return NextResponse.json(
        { message: '请提供文件名' },
        { status: 400 }
      )
    }

    // 验证文件名格式，防止路径遍历攻击
    if (!filename.match(/^Education_Plan_PDF_\d{4}\.pdf$/)) {
      return NextResponse.json(
        { message: '无效的文件名' },
        { status: 400 }
      )
    }

    const planDirectory = path.join(process.cwd(), 'public', 'Education_Plan_PDF')
    const filePath = path.join(planDirectory, filename)

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { message: '文件不存在' },
        { status: 404 }
      )
    }

    // 删除文件
    fs.unlinkSync(filePath)

    return NextResponse.json({
      message: '培养方案删除成功',
    })
  } catch (error) {
    console.error('Failed to delete education plan:', error)
    return NextResponse.json(
      { message: '删除失败，请重试' },
      { status: 500 }
    )
  }
}
