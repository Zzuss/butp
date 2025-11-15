import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 调试API：查看数据库中的实际数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    // 获取所有论文数据（用于调试）
    const { data: allPapers, error: allPapersError } = await supabase
      .from('student_papers')
      .select('id, bupt_student_id, paper_title, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // 获取所有专利数据（用于调试）
    const { data: allPatents, error: allPatentsError } = await supabase
      .from('student_patents')
      .select('id, bupt_student_id, patent_name, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    let specificPapers = [];
    let specificPatents = [];

    if (studentId) {
      // 查询特定学号的数据
      const { data: papers, error: papersError } = await supabase
        .from('student_papers')
        .select('*')
        .eq('bupt_student_id', studentId);

      const { data: patents, error: patentsError } = await supabase
        .from('student_patents')
        .select('*')
        .eq('bupt_student_id', studentId);

      specificPapers = papers || [];
      specificPatents = patents || [];
    }

    return NextResponse.json({
      debug: true,
      searchedStudentId: studentId,
      allPapers: allPapers || [],
      allPatents: allPatents || [],
      specificPapers,
      specificPatents,
      errors: {
        allPapersError,
        allPatentsError
      }
    });

  } catch (error) {
    console.error('调试API错误:', error);
    return NextResponse.json(
      { error: '调试API错误', details: error },
      { status: 500 }
    );
  }
}
