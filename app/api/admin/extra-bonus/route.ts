import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// GET - 获取所有额外加分数据
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('extra_bonus_scores')
      .select('*')
      .order('bupt_student_id', { ascending: true })

    if (error) {
      console.error('获取额外加分数据失败:', error)
      return NextResponse.json({ error: '获取额外加分数据失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('获取额外加分数据失败:', error)
    return NextResponse.json({ error: '获取额外加分数据失败' }, { status: 500 })
  }
}

// POST - 导入额外加分数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data: bonusData, mode = 'replace' } = body

    if (!bonusData || !Array.isArray(bonusData)) {
      return NextResponse.json({ error: '无效的数据格式' }, { status: 400 })
    }

    console.log(`开始导入额外加分数据，模式：${mode}，数据条数：${bonusData.length}`)

    // 替换模式：先清空表
    if (mode === 'replace') {
      const { error: deleteError } = await supabase
        .from('extra_bonus_scores')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // 删除所有记录

      if (deleteError) {
        console.error('清空额外加分表失败:', deleteError)
        return NextResponse.json({ error: '清空额外加分表失败' }, { status: 500 })
      }
      console.log('已清空额外加分表')
    }

    // 准备插入数据
    const insertData = bonusData.map(item => ({
      bupt_student_id: item.bupt_student_id || item.学号,
      bonus_score: parseFloat(item.bonus_score || item.分数 || 0),
      note: '', // 不再从导入文件读取备注
      updated_at: new Date().toISOString()
    }))

    // 验证数据
    const invalidData = insertData.filter(item => 
      !item.bupt_student_id || 
      isNaN(item.bonus_score) || 
      item.bonus_score < 0 || 
      item.bonus_score > 4
    )

    if (invalidData.length > 0) {
      console.error('发现无效数据:', invalidData)
      return NextResponse.json({ 
        error: '数据验证失败：存在无效的学号或分数（分数必须在0-4之间）',
        invalidData 
      }, { status: 400 })
    }

    // 批量插入或更新
    const { data: insertedData, error: insertError } = await supabase
      .from('extra_bonus_scores')
      .upsert(insertData, { 
        onConflict: 'bupt_student_id',
        ignoreDuplicates: false 
      })
      .select()

    if (insertError) {
      console.error('插入额外加分数据失败:', insertError)
      return NextResponse.json({ error: '插入额外加分数据失败: ' + insertError.message }, { status: 500 })
    }

    console.log(`成功导入${insertData.length}条额外加分数据`)

    return NextResponse.json({ 
      success: true, 
      message: `成功导入${insertData.length}条额外加分数据`,
      count: insertData.length
    })
  } catch (error) {
    console.error('导入额外加分数据失败:', error)
    return NextResponse.json({ 
      error: '导入额外加分数据失败: ' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 })
  }
}

// DELETE - 清空额外加分表
export async function DELETE(request: NextRequest) {
  try {
    const { error } = await supabase
      .from('extra_bonus_scores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 删除所有记录

    if (error) {
      console.error('清空额外加分表失败:', error)
      return NextResponse.json({ error: '清空额外加分表失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '额外加分表已清空' })
  } catch (error) {
    console.error('清空额外加分表失败:', error)
    return NextResponse.json({ error: '清空额外加分表失败' }, { status: 500 })
  }
}
