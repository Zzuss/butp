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
    // 获取所有竞赛数据
    const { data: competitions, error } = await supabase
      .from('student_competition_records')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('获取竞赛数据失败:', error)
      return NextResponse.json({ error: '获取竞赛数据失败' }, { status: 500 })
    }

    // 转换数据为Excel格式
    const excelData = competitions?.map(competition => ({
      '学号': competition.bupt_student_id || '',
      '姓名': competition.full_name || '',
      '竞赛名称': competition.competition_name || '',
      '竞赛地区': competition.competition_region || '',
      '竞赛级别': competition.competition_level || '',
      '竞赛类型': competition.competition_type === 'individual' ? '个人' : '团队',
      '队长是否北邮': competition.team_leader_is_bupt === true ? '是' : competition.team_leader_is_bupt === false ? '否' : '',
      '是否主要成员': competition.is_main_member === true ? '是' : competition.is_main_member === false ? '否' : '',
      '主要成员数': competition.main_members_count || '',
      '系数': competition.coefficient || 1.0,
      '联系电话': competition.phone_number || '',
      '备注': competition.note || '',
      '分数': competition.score || 0,
      '审核状态': competition.approval_status === 'approved' ? '已通过' : competition.approval_status === 'rejected' ? '已拒绝' : '待审核',
      '创建时间': competition.created_at ? new Date(competition.created_at).toLocaleString('zh-CN') : '',
      '更新时间': competition.updated_at ? new Date(competition.updated_at).toLocaleString('zh-CN') : ''
    })) || []

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '竞赛数据')

    // 设置列宽
    const colWidths = [
      { wch: 12 }, // 学号
      { wch: 10 }, // 姓名
      { wch: 40 }, // 竞赛名称
      { wch: 12 }, // 竞赛地区
      { wch: 12 }, // 竞赛级别
      { wch: 10 }, // 竞赛类型
      { wch: 12 }, // 队长是否北邮
      { wch: 12 }, // 是否主要成员
      { wch: 12 }, // 主要成员数
      { wch: 8 },  // 系数
      { wch: 12 }, // 联系电话
      { wch: 30 }, // 备注
      { wch: 8 },  // 分数
      { wch: 10 }, // 审核状态
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
        'Content-Disposition': `attachment; filename="${encodeURIComponent('竞赛数据_' + new Date().toISOString().split('T')[0] + '.xlsx')}"`
      }
    })
  } catch (error) {
    console.error('导出竞赛数据失败:', error)
    return NextResponse.json(
      { error: '导出竞赛数据失败' },
      { status: 500 }
    )
  }
}
