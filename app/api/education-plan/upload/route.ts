import { NextRequest, NextResponse } from 'next/server'
import { uploadEducationPlan, listEducationPlans } from '@/lib/supabase'

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

    // 生成文件名
    const filename = `Education_Plan_PDF_${year}.pdf`

    // 检查文件是否已存在
    try {
      const existingPlans = await listEducationPlans()
      const existingPlan = existingPlans.find(plan => plan.name === filename)
      
      if (existingPlan) {
        return NextResponse.json(
          { message: `${year} 年的培养方案已存在，请先删除后再上传` },
          { status: 400 }
        )
      }
    } catch (error) {
      // 如果列表获取失败，继续上传流程
      console.warn('Failed to check existing files:', error)
    }

    // 上传文件到 Supabase Storage
    await uploadEducationPlan(file, filename)

    return NextResponse.json({
      message: '培养方案上传成功',
      filename,
    })
  } catch (error) {
    console.error('Failed to upload education plan:', error)
    
    // 提供更详细的错误信息
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { message: '文件已存在，请先删除后再上传' },
          { status: 400 }
        )
      }
      if (error.message.includes('size')) {
        return NextResponse.json(
          { message: '文件大小超过限制' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { message: '上传失败，请重试' },
      { status: 500 }
    )
  }
}
