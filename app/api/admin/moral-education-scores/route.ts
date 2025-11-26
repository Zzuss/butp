import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface MoralEducationScore {
  bupt_student_id: string;
  full_name: string;
  class: string;
  paper_score: number;
  patent_score: number;
  competition_score: number;
  paper_patent_total: number;
  total_score: number;
}


// 导出德育总表为CSV格式
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const limit = parseInt(searchParams.get('limit') || '1000');

    // 获取德育总表数据
    const { data: scores, error } = await supabase
      .from('comprehensive_evaluation_scores')
      .select('*')
      .order('total_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取德育总表失败:', error);
      return NextResponse.json({ error: '获取德育总表失败' }, { status: 500 });
    }

    if (format === 'csv') {
      // 生成CSV格式，添加BOM以确保Excel正确识别UTF-8编码
      const BOM = '\uFEFF'; // UTF-8 BOM
      // 包含数据库表的所有字段
      const csvHeader = 'id,bupt_student_id,class,full_name,paper_score,patent_score,competition_score,paper_patent_total,total_score,created_at,updated_at\n';
      const csvRows = scores?.map(score => {
        // 格式化日期时间
        const createdAt = score.created_at ? new Date(score.created_at).toISOString() : '';
        const updatedAt = score.updated_at ? new Date(score.updated_at).toISOString() : '';
        
        return `${score.id || ''},${score.bupt_student_id || ''},${score.class || ''},${score.full_name || ''},${score.paper_score || 0},${score.patent_score || 0},${score.competition_score || 0},${score.paper_patent_total || 0},${score.total_score || 0},${createdAt},${updatedAt}`;
      }).join('\n') || '';

      const csvContent = BOM + csvHeader + csvRows;

      // 使用TextEncoder将字符串转换为Uint8Array，正确处理UTF-8编码
      const encoder = new TextEncoder();
      const csvBuffer = encoder.encode(csvContent);

      return new NextResponse(csvBuffer, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="comprehensive_evaluation_scores.csv"',
        },
      });
    }

    // 返回JSON格式
    return NextResponse.json({
      success: true,
      data: scores || [],
      total: scores?.length || 0,
      note: '德育总表数据，可用于与智育成绩合并生成综测总表'
    });

  } catch (error) {
    console.error('导出德育总表失败:', error);
    return NextResponse.json(
      { error: '导出德育总表失败', details: error },
      { status: 500 }
    );
  }
}
