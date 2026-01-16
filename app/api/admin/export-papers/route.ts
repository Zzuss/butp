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
    // 获取所有论文数据
    const { data: papers, error } = await supabase
      .from('student_papers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('获取论文数据失败:', error)
      return NextResponse.json({ error: '获取论文数据失败' }, { status: 500 })
    }

    // 转换数据为Excel格式
    const excelData = papers?.map(paper => ({
      '学号': paper.bupt_student_id || '',
      '姓名': paper.full_name || '',
      '论文标题': paper.paper_title || '',
      '期刊名称': paper.journal_name || '',
      '期刊类别': paper.journal_category || '',
      '作者类型': paper.author_type || '',
      '发表日期': paper.publish_date || '',
      '联系电话': paper.phone_number || '',
      '备注': paper.note || '',
      '分数': paper.score || 0,
      '审核状态': paper.approval_status === 'approved' ? '已通过' : paper.approval_status === 'rejected' ? '已拒绝' : '待审核',
      '答辩状态': paper.defense_status === 'passed' ? '已通过' : paper.defense_status === 'failed' ? '未通过' : '待答辩',
      '创建时间': paper.created_at ? new Date(paper.created_at).toLocaleString('zh-CN') : '',
      '更新时间': paper.updated_at ? new Date(paper.updated_at).toLocaleString('zh-CN') : ''
    })) || []

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '论文数据')

    // 设置列宽
    const colWidths = [
      { wch: 12 }, // 学号
      { wch: 10 }, // 姓名
      { wch: 40 }, // 论文标题
      { wch: 30 }, // 期刊名称
      { wch: 15 }, // 期刊类别
      { wch: 12 }, // 作者类型
      { wch: 12 }, // 发表日期
      { wch: 12 }, // 联系电话
      { wch: 30 }, // 备注
      { wch: 8 },  // 分数
      { wch: 10 }, // 审核状态
      { wch: 10 }, // 答辩状态
      { wch: 20 }, // 创建时间
      { wch: 20 }  // 更新时间
    ]
    worksheet['!cols'] = colWidths

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 返回文件
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent('论文数据_' + new Date().toISOString().split('T')[0] + '.xlsx')}"`
      }
    })
  } catch (error) {
    console.error('导出论文数据失败:', error)
    return NextResponse.json(
      { error: '导出论文数据失败' },
      { status: 500 }
    )
  }
}
