import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  try {
    const { type, id, status } = await request.json()

    // 验证参数
    if (!type || !id || !status) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    if (!['paper', 'patent', 'competition'].includes(type)) {
      return NextResponse.json({ error: '无效的记录类型' }, { status: 400 })
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: '无效的审核状态' }, { status: 400 })
    }

    // 根据类型更新对应的表
    let tableName: string

    switch (type) {
      case 'paper':
        tableName = 'student_papers'
        break
      case 'patent':
        tableName = 'student_patents'
        break
      case 'competition':
        tableName = 'student_competition_records'
        break
      default:
        return NextResponse.json({ error: '无效的记录类型' }, { status: 400 })
    }

    // 更新审核状态
    const { data, error } = await supabase
      .from(tableName)
      .update({ 
        approval_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('更新审核状态失败:', error)
      return NextResponse.json({ error: '更新审核状态失败' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `${type === 'paper' ? '论文' : type === 'patent' ? '专利' : '竞赛'}记录审核${status === 'approved' ? '通过' : status === 'rejected' ? '拒绝' : '重置为待审核'}成功`
    })

  } catch (error) {
    console.error('审核记录失败:', error)
    return NextResponse.json(
      { error: '审核记录失败' },
      { status: 500 }
    )
  }
}
