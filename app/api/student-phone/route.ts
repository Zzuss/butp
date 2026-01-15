import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// GET - 获取学生手机号
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json(
        { error: '请提供学号' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('student_phone_numbers')
      .select('*')
      .eq('bupt_student_id', studentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 没有找到记录
        return NextResponse.json({
          success: true,
          data: null,
          message: '未找到手机号记录'
        })
      }
      console.error('获取手机号失败:', error)
      return NextResponse.json(
        { error: '获取手机号失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('获取手机号失败:', error)
    return NextResponse.json(
      { error: '获取手机号失败' },
      { status: 500 }
    )
  }
}

// POST - 创建或更新学生手机号
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, phoneNumber } = body

    if (!studentId || !phoneNumber) {
      return NextResponse.json(
        { error: '请提供学号和手机号' },
        { status: 400 }
      )
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9][0-9]{9}$/
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: '手机号格式不正确，请输入11位有效手机号' },
        { status: 400 }
      )
    }

    // 使用 upsert 创建或更新
    const { data, error } = await supabase
      .from('student_phone_numbers')
      .upsert({
        bupt_student_id: studentId,
        phone_number: phoneNumber,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'bupt_student_id'
      })
      .select()
      .single()

    if (error) {
      console.error('保存手机号失败:', error)
      return NextResponse.json(
        { error: '保存手机号失败: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: '手机号保存成功'
    })

  } catch (error) {
    console.error('保存手机号失败:', error)
    return NextResponse.json(
      { error: '保存手机号失败' },
      { status: 500 }
    )
  }
}

// DELETE - 删除学生手机号（可选功能）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json(
        { error: '请提供学号' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('student_phone_numbers')
      .delete()
      .eq('bupt_student_id', studentId)

    if (error) {
      console.error('删除手机号失败:', error)
      return NextResponse.json(
        { error: '删除手机号失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '手机号删除成功'
    })

  } catch (error) {
    console.error('删除手机号失败:', error)
    return NextResponse.json(
      { error: '删除手机号失败' },
      { status: 500 }
    )
  }
}
