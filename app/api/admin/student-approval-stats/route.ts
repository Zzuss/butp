import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  try {
    // 获取所有学生审核记录
    const { data: approvals, error } = await supabase
      .from('student_approvals')
      .select('approval_status')

    if (error) {
      console.error('获取审核统计失败:', error)
      return NextResponse.json(
        { error: '获取审核统计失败' },
        { status: 500 }
      )
    }

    // 统计各状态数量
    const stats = {
      approved: 0,
      pending: 0,
      rejected: 0,
      total: 0
    }

    if (approvals && approvals.length > 0) {
      approvals.forEach(approval => {
        stats.total++
        if (approval.approval_status === 'approved') {
          stats.approved++
        } else if (approval.approval_status === 'pending') {
          stats.pending++
        } else if (approval.approval_status === 'rejected') {
          stats.rejected++
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('获取审核统计失败:', error)
    return NextResponse.json(
      { error: '获取审核统计失败' },
      { status: 500 }
    )
  }
}
