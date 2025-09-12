import { NextRequest, NextResponse } from 'next/server'
import { deleteEducationPlan, listEducationPlans } from '@/lib/supabase'

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

    // 检查文件是否存在
    try {
      const existingPlans = await listEducationPlans()
      const existingPlan = existingPlans.find(plan => plan.name === filename)
      
      if (!existingPlan) {
        return NextResponse.json(
          { message: '文件不存在' },
          { status: 404 }
        )
      }
    } catch (error) {
      console.warn('Failed to check existing files:', error)
      // 继续删除流程，让 Supabase 处理文件不存在的情况
    }

    // 从 Supabase Storage 删除文件
    await deleteEducationPlan(filename)

    return NextResponse.json({
      message: '培养方案删除成功',
    })
  } catch (error) {
    console.error('Failed to delete education plan:', error)
    
    // 提供更详细的错误信息
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return NextResponse.json(
          { message: '文件不存在' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { message: '删除失败，请重试' },
      { status: 500 }
    )
  }
}
