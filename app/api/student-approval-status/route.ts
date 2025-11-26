import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json({ error: '缺少学生ID参数' }, { status: 400 })
    }

    // 获取学生整体审核状态
    const { data: approvalData, error: approvalError } = await supabase
      .from('student_approvals')
      .select('approval_status')
      .eq('bupt_student_id', studentId)
      .single()

    // 如果没有审核记录，默认为pending状态
    let approvalStatus = 'pending'
    if (!approvalError && approvalData) {
      approvalStatus = approvalData.approval_status
    }

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        approval_status: approvalStatus,
        is_locked: approvalStatus === 'approved'
      }
    })

  } catch (error) {
    console.error('获取学生审核状态失败:', error)
    return NextResponse.json(
      { error: '获取学生审核状态失败' },
      { status: 500 }
    )
  }
}
