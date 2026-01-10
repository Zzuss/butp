import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 导出推免排名为Excel格式
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const programme = searchParams.get('programme');
    const topN = parseInt(searchParams.get('topN') || '100');

    console.log(`开始导出推免排名Excel，限制：${limit}条记录`);

    // 获取推免排名数据
    let query = supabase
      .from('comprehensive_ranking')
      .select('*')
      .order('academic_practice_total', { ascending: false })
      .limit(topN > 0 ? topN : limit);

    // 如果指定了专业，添加专业过滤
    if (programme) {
      query = query.eq('programme', programme);
    }

    const { data: rankings, error } = await query;

    if (error) {
      console.error('获取推免排名失败:', error);
      return NextResponse.json({ error: '获取推免排名失败' }, { status: 500 });
    }

    // 如果没有数据，创建空的Excel文件
    let excelData: Array<{
      '学号': string;
      '姓名': string;
      '专业名称': string;
      '班级名称': string;
      '专业成绩加权均分': number;
      '专业成绩排名': number | string;
      '专业排名总人数': number | string;
      '实践活动加分': number;
      '专业综合成绩': number;
      '专业综合排名': number | string;
      '专业综合排名百分比': number | string;
    }>;
    
    if (!rankings || rankings.length === 0) {
      console.log('没有推免排名数据，生成空Excel文件');
      excelData = [];
    } else {
      // 准备Excel数据，使用中文表头
      excelData = rankings.map((ranking) => ({
        '学号': ranking.bupt_student_id || '',
        '姓名': ranking.full_name || '',
        '专业名称': ranking.programme || '',
        '班级名称': ranking.class || '',
        '专业成绩加权均分': ranking.academic_weighted_average || 0,
        '专业成绩排名': ranking.programme_rank || '',
        '专业排名总人数': ranking.programme_total || '',
        '实践活动加分': ranking.practice_extra_points || 0,
        '专业综合成绩': ranking.academic_practice_total || 0,
        '专业综合排名': ranking.overall_rank || '',
        '专业综合排名百分比': ranking.overall_rank_percentage ? `${ranking.overall_rank_percentage}%` : ''
      }));
    }

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 定义中文表头
    const headers = ['学号', '姓名', '专业名称', '班级名称', '专业成绩加权均分', '专业成绩排名', '专业排名总人数', '实践活动加分', '专业综合成绩', '专业综合排名', '专业综合排名百分比'];
    
    // 创建工作表，确保始终有表头
    let worksheet;
    if (excelData.length === 0) {
      // 如果没有数据，手动创建只有表头的工作表
      worksheet = XLSX.utils.aoa_to_sheet([headers]);
    } else {
      // 有数据时，使用json_to_sheet并确保表头顺序
      worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });
    }

    // 设置列宽
    const colWidths = [
      { wch: 12 }, // 学号
      { wch: 10 }, // 姓名
      { wch: 20 }, // 专业名称
      { wch: 15 }, // 班级名称
      { wch: 18 }, // 专业成绩加权均分
      { wch: 15 }, // 专业成绩排名
      { wch: 15 }, // 专业排名总人数
      { wch: 15 }, // 实践活动加分
      { wch: 15 }, // 专业综合成绩
      { wch: 15 }, // 专业综合排名
      { wch: 20 }, // 专业综合排名百分比
    ];
    worksheet['!cols'] = colWidths;

    // 设置表头样式
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "FFE6E6" } }, // 红色主题
        alignment: { horizontal: "center" }
      };
    }

    // 添加工作表到工作簿
    const sheetName = programme ? `${programme}推免排名` : '推免排名';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true 
    });

    // 生成文件名
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = programme 
      ? `${programme}推免排名_${timestamp}.xlsx`
      : `推免排名_${timestamp}.xlsx`;

    console.log(`Excel导出完成，共${rankings?.length || 0}条记录`);

    // 返回Excel文件
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('导出推免排名Excel失败:', error);
    return NextResponse.json(
      { error: '导出推免排名Excel失败', details: error },
      { status: 500 }
    );
  }
}
