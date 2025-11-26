import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 分批获取学生数据用于导出
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const grade = searchParams.get('grade') || '2021'; // 默认大四年级

    console.log(`获取第${page}批学生数据，每批${pageSize}人，年级：${grade}`);

    const offset = (page - 1) * pageSize;

    // 1. 获取学生基本信息
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('bupt_student_id, full_name, class, overall_approval_status')
      .like('bupt_student_id', `${grade}%`) // 按年级筛选
      .order('bupt_student_id')
      .range(offset, offset + pageSize - 1);

    if (studentsError) {
      console.error('获取学生信息失败:', studentsError);
      return NextResponse.json(
        { error: '获取学生信息失败' },
        { status: 500 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        data: [],
        hasMore: false,
        total: 0
      });
    }

    // 2. 批量获取所有学生的详细数据
    const studentIds = students.map(s => s.bupt_student_id);

    // 并行查询所有相关数据
    const [papersResult, patentsResult, competitionsResult] = await Promise.all([
      // 论文数据
      supabase
        .from('student_papers')
        .select('bupt_student_id, paper_title, journal_category, author_type, publish_date, score, approval_status, defense_status')
        .in('bupt_student_id', studentIds),
      
      // 专利数据
      supabase
        .from('student_patents')
        .select('bupt_student_id, patent_name, category_of_patent_owner, patent_date, score, approval_status')
        .in('bupt_student_id', studentIds),
      
      // 竞赛数据
      supabase
        .from('student_competition_records')
        .select('bupt_student_id, competition_name, competition_level, competition_region, score, approval_status')
        .in('bupt_student_id', studentIds)
    ]);

    if (papersResult.error || patentsResult.error || competitionsResult.error) {
      console.error('获取学生记录失败:', {
        papers: papersResult.error,
        patents: patentsResult.error,
        competitions: competitionsResult.error
      });
      return NextResponse.json(
        { error: '获取学生记录失败' },
        { status: 500 }
      );
    }

    // 3. 组织数据
    const studentsData = students.map(student => {
      const papers = papersResult.data?.filter(p => p.bupt_student_id === student.bupt_student_id) || [];
      const patents = patentsResult.data?.filter(p => p.bupt_student_id === student.bupt_student_id) || [];
      const competitions = competitionsResult.data?.filter(c => c.bupt_student_id === student.bupt_student_id) || [];

      // 计算总分
      const paperScore = papers.reduce((sum, p) => sum + (parseFloat(p.score) || 0), 0);
      const patentScore = patents.reduce((sum, p) => sum + (parseFloat(p.score) || 0), 0);
      const competitionScore = competitions.reduce((sum, c) => sum + (parseFloat(c.score) || 0), 0);
      const totalScore = paperScore + patentScore + competitionScore;

      return {
        bupt_student_id: student.bupt_student_id,
        full_name: student.full_name,
        class: student.class,
        overall_approval_status: student.overall_approval_status,
        papers: papers.map(p => ({
          title: p.paper_title,
          category: p.journal_category,
          author_type: p.author_type,
          publish_date: p.publish_date,
          score: p.score,
          approval_status: p.approval_status,
          defense_status: p.defense_status
        })),
        patents: patents.map(p => ({
          name: p.patent_name,
          category: p.category_of_patent_owner,
          patent_date: p.patent_date,
          score: p.score,
          approval_status: p.approval_status
        })),
        competitions: competitions.map(c => ({
          name: c.competition_name,
          level: c.competition_level,
          region: c.competition_region,
          score: c.score,
          approval_status: c.approval_status
        })),
        scores: {
          paper: paperScore,
          patent: patentScore,
          competition: competitionScore,
          total: totalScore
        }
      };
    });

    // 4. 检查是否还有更多数据
    const hasMore = students.length === pageSize;

    // 5. 如果是第一页，同时返回总数
    let total = 0;
    if (page === 1) {
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .like('bupt_student_id', `${grade}%`);
      total = count || 0;
    }

    return NextResponse.json({
      data: studentsData,
      hasMore,
      total: page === 1 ? total : undefined,
      page,
      pageSize
    });

  } catch (error) {
    console.error('导出学生数据失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
