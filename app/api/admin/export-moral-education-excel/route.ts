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
      'id': string;
      'bupt_student_id': string;
      'class': string;
      'full_name': string;
      'paper_score': number;
      'patent_score': number;
      'competition_score': number;
      'paper_patent_total': number;
      'total_score': number;
      'created_at': string;
      'updated_at': string;
    }>;
    
    if (!scores || scores.length === 0) {
      console.log('没有德育总表数据，生成空Excel文件');
      excelData = [];
    } else {
      // 准备Excel数据，与CSV格式保持一致
      excelData = scores.map((score) => ({
        'id': score.id || '',
        'bupt_student_id': score.bupt_student_id || '',
        'class': score.class || '',
        'full_name': score.full_name || '',
        'paper_score': score.paper_score || 0,
        'patent_score': score.patent_score || 0,
        'competition_score': score.competition_score || 0,
        'paper_patent_total': score.paper_patent_total || 0,
        'total_score': score.total_score || 0,
        'created_at': score.created_at ? new Date(score.created_at).toISOString() : '',
        'updated_at': score.updated_at ? new Date(score.updated_at).toISOString() : ''
      }));
    }

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 定义表头
    const headers = ['id', 'bupt_student_id', 'class', 'full_name', 'paper_score', 'patent_score', 'competition_score', 'paper_patent_total', 'total_score', 'created_at', 'updated_at'];
    
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
      { wch: 36 }, // id
      { wch: 12 }, // bupt_student_id
      { wch: 8 },  // class
      { wch: 10 }, // full_name
      { wch: 10 }, // paper_score
      { wch: 10 }, // patent_score
      { wch: 12 }, // competition_score
      { wch: 15 }, // paper_patent_total
      { wch: 10 }, // total_score
      { wch: 20 }, // created_at
      { wch: 20 }, // updated_at
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
