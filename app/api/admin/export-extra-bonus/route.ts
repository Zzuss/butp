import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  try {
    // 获取所有额外加分数据
    const { data: bonusScores, error } = await supabase
      .from('extra_bonus_scores')
      .select('*')
      .order('bupt_student_id', { ascending: true })
    
    if (error) {
      console.error('获取额外加分数据失败:', error)
      return NextResponse.json({ error: '获取额外加分数据失败' }, { status: 500 })
    }

    // 转换数据为Excel格式
    const excelData = bonusScores?.map(item => ({
      '学号': item.bupt_student_id || '',
      '分数': item.bonus_score || 0
    })) || []

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '额外加分')

    // 设置列宽
    const colWidths = [
      { wch: 12 }, // 学号
      { wch: 12 }  // 分数
    ]
    worksheet['!cols'] = colWidths

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 返回文件
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent('额外推免加分_' + new Date().toISOString().split('T')[0] + '.xlsx')}"`
      }
    })
  } catch (error) {
    console.error('导出额外加分数据失败:', error)
    return NextResponse.json(
      { error: '导出额外加分数据失败' },
      { status: 500 }
    )
  }
}
