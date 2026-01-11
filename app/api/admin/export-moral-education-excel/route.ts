import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 导出德育总表为Excel格式
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const grade = searchParams.get('grade') || ''; // 可选的年级过滤

    console.log(`开始导出德育总表Excel，限制：${limit}条记录`);

    // 获取德育总表数据
    let query = supabase
      .from('comprehensive_evaluation_scores')
      .select('*')
      .order('total_score', { ascending: false })
      .limit(limit);

    // 如果指定了年级，添加年级过滤
    if (grade) {
      query = query.like('bupt_student_id', `${grade}%`);
    }

    const { data: scores, error } = await query;

    if (error) {
      console.error('获取德育总表失败:', error);
      return NextResponse.json({ error: '获取德育总表失败' }, { status: 500 });
    }

    // 如果没有数据，创建空的Excel文件
    let excelData: Array<{
      '学号': string;
      '姓名': string;
      '班级': string;
      '手机号': string;
      '论文分数': number;
      '专利分数': number;
      '竞赛分数': number;
      '论文+专利小计': number;
      '总加分': number;
    }>;
    
    if (!scores || scores.length === 0) {
      console.log('没有德育总表数据，生成空Excel文件');
      excelData = [];
    } else {
      // 准备Excel数据，使用中文表头
      excelData = scores.map((score) => ({
        '学号': score.bupt_student_id || '',
        '姓名': score.full_name || '',
        '班级': score.class || '',
        '手机号': score.phone_number || '',
        '论文分数': score.paper_score || 0,
        '专利分数': score.patent_score || 0,
        '竞赛分数': score.competition_score || 0,
        '论文+专利小计': score.paper_patent_total || 0,
        '总加分': score.total_score || 0
      }));
    }

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 定义中文表头
    const headers = ['学号', '姓名', '班级', '手机号', '论文分数', '专利分数', '竞赛分数', '论文+专利小计', '总加分'];
    
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
      { wch: 15 }, // 班级
      { wch: 12 }, // 手机号
      { wch: 12 }, // 论文分数
      { wch: 12 }, // 专利分数
      { wch: 12 }, // 竞赛分数
      { wch: 15 }, // 论文+专利小计
      { wch: 12 }, // 总加分
    ];
    worksheet['!cols'] = colWidths;

    // 设置表头样式
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "E3F2FD" } },
        alignment: { horizontal: "center" }
      };
    }

    // 添加工作表到工作簿
    const sheetName = grade ? `${grade}级德育总表` : '德育总表';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true 
    });

    // 生成文件名
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = grade 
      ? `${grade}级德育总表_${timestamp}.xlsx`
      : `德育总表_${timestamp}.xlsx`;

    console.log(`Excel导出完成，共${scores?.length || 0}条记录`);

    // 返回Excel文件
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('导出德育总表Excel失败:', error);
    return NextResponse.json(
      { error: '导出德育总表Excel失败', details: error },
      { status: 500 }
    );
  }
}
