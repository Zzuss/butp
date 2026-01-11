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
    // 获取所有专利数据
    const { data: patents, error } = await supabase
      .from('student_patents')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('获取专利数据失败:', error)
      return NextResponse.json({ error: '获取专利数据失败' }, { status: 500 })
    }

    // 转换数据为Excel格式
    const excelData = patents?.map(patent => ({
      '学号': patent.bupt_student_id || '',
      '姓名': patent.full_name || '',
      '专利名称': patent.patent_name || '',
      '专利号': patent.patent_number || '',
      '专利日期': patent.patent_date || '',
      '专利权人类别': patent.category_of_patent_owner || '',
      '联系电话': patent.phone_number || '',
      '备注': patent.note || '',
      '分数': patent.score || 0,
      '审核状态': patent.approval_status === 'approved' ? '已通过' : patent.approval_status === 'rejected' ? '已拒绝' : '待审核',
      '答辩状态': patent.defense_status === 'passed' ? '已通过' : patent.defense_status === 'failed' ? '未通过' : '待答辩',
      '创建时间': patent.created_at ? new Date(patent.created_at).toLocaleString('zh-CN') : '',
      '更新时间': patent.updated_at ? new Date(patent.updated_at).toLocaleString('zh-CN') : ''
    })) || []

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '专利数据')

    // 设置列宽
    const colWidths = [
      { wch: 12 }, // 学号
      { wch: 10 }, // 姓名
      { wch: 40 }, // 专利名称
      { wch: 20 }, // 专利号
      { wch: 12 }, // 专利日期
      { wch: 15 }, // 专利权人类别
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
        'Content-Disposition': `attachment; filename="${encodeURIComponent('专利数据_' + new Date().toISOString().split('T')[0] + '.xlsx')}"`
      }
    })
  } catch (error) {
    console.error('导出专利数据失败:', error)
    return NextResponse.json(
      { error: '导出专利数据失败' },
      { status: 500 }
    )
  }
}
