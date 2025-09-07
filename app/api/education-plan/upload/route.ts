import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const year = formData.get('year') as string

    if (!file) {
      return NextResponse.json(
        { message: '请选择文件' },
        { status: 400 }
      )
    }

    if (!year) {
      return NextResponse.json(
        { message: '请输入年份' },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { message: '只能上传 PDF 文件' },
        { status: 400 }
      )
    }

    // 验证年份格式
    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json(
        { message: '年份格式不正确' },
        { status: 400 }
      )
    }

    const planDirectory = path.join(process.cwd(), 'public', 'Education_Plan_PDF')
    
    // 确保目录存在
    if (!fs.existsSync(planDirectory)) {
      fs.mkdirSync(planDirectory, { recursive: true })
    }

    // 生成文件名
    const filename = `Education_Plan_PDF_${year}.pdf`
    const filePath = path.join(planDirectory, filename)

    // 检查文件是否已存在
    if (fs.existsSync(filePath)) {
      return NextResponse.json(
        { message: `${year} 年的培养方案已存在，请先删除后再上传` },
        { status: 400 }
      )
    }

    // 保存文件
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    return NextResponse.json({
      message: '培养方案上传成功',
      filename,
    })
  } catch (error) {
    console.error('Failed to upload education plan:', error)
    return NextResponse.json(
      { message: '上传失败，请重试' },
      { status: 500 }
    )
  }
}
