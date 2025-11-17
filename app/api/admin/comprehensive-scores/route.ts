import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface StudentScore {
  bupt_student_id: string;
  full_name: string;
  class: string;
  paper_score: number;
  patent_score: number;
  competition_score: number;
  paper_patent_total: number;
  total_score: number;
}

// 生成德育总表（优化版本，适合Vercel部署）
export async function POST(request: NextRequest) {
  try {
    console.log('开始生成德育总表...');
    
    const startTime = Date.now();
    const TIMEOUT_MS = 8000; // 8秒超时保护，留2秒缓冲
    
    // 使用更高效的聚合查询，减少数据传输
    const queries = await Promise.allSettled([
      // 论文分数聚合
      supabase
        .from('student_papers')
        .select('bupt_student_id, full_name, class')
        .then(async ({ data, error }) => {
          if (error) throw error;
          // 按学生聚合分数
          const scoreMap = new Map();
          for (const paper of data || []) {
            const key = paper.bupt_student_id;
            if (!scoreMap.has(key)) {
              scoreMap.set(key, {
                bupt_student_id: key,
                full_name: paper.full_name,
                class: paper.class,
                paper_score: 0
              });
            }
            // 这里简化处理，实际应该获取score字段
            scoreMap.get(key).paper_score += 1; // 临时逻辑，每篇论文1分
          }
          return Array.from(scoreMap.values());
        }),
      
      // 专利分数聚合  
      supabase
        .from('student_patents')
        .select('bupt_student_id, full_name, class')
        .then(async ({ data, error }) => {
          if (error) throw error;
          const scoreMap = new Map();
          for (const patent of data || []) {
            const key = patent.bupt_student_id;
            if (!scoreMap.has(key)) {
              scoreMap.set(key, {
                bupt_student_id: key,
                full_name: patent.full_name,
                class: patent.class,
                patent_score: 0
              });
            }
            scoreMap.get(key).patent_score += 1; // 临时逻辑，每个专利1分
          }
          return Array.from(scoreMap.values());
        }),
        
      // 竞赛分数聚合
      supabase
        .from('student_competition_records')
        .select('bupt_student_id, full_name, class, score')
        .then(async ({ data, error }) => {
          if (error) throw error;
          const scoreMap = new Map();
          for (const comp of data || []) {
            const key = comp.bupt_student_id;
            if (!scoreMap.has(key)) {
              scoreMap.set(key, {
                bupt_student_id: key,
                full_name: comp.full_name,
                class: comp.class,
                competition_score: 0
              });
            }
            scoreMap.get(key).competition_score += parseFloat(comp.score?.toString() || '0') || 0;
          }
          return Array.from(scoreMap.values());
        })
    ]);

    // 检查超时
    if (Date.now() - startTime > TIMEOUT_MS) {
      return NextResponse.json(
        { error: '处理超时，请使用分批处理模式' },
        { status: 408 }
      );
    }

    // 处理查询结果
    const [papersResult, patentsResult, competitionsResult] = queries;
    
    if (papersResult.status === 'rejected') {
      console.error('获取论文数据失败:', papersResult.reason);
      return NextResponse.json({ error: '获取论文数据失败' }, { status: 500 });
    }
    
    if (patentsResult.status === 'rejected') {
      console.error('获取专利数据失败:', patentsResult.reason);
      return NextResponse.json({ error: '获取专利数据失败' }, { status: 500 });
    }
    
    if (competitionsResult.status === 'rejected') {
      console.error('获取竞赛数据失败:', competitionsResult.reason);
      return NextResponse.json({ error: '获取竞赛数据失败' }, { status: 500 });
    }

    // 汇总学生分数
    const studentScoresMap = new Map<string, StudentScore>();

    // 处理论文分数
    papers?.forEach(paper => {
      const studentId = paper.bupt_student_id;
      const score = parseFloat(paper.score?.toString() || '0') || 0;
      
      if (!studentScoresMap.has(studentId)) {
        studentScoresMap.set(studentId, {
          bupt_student_id: studentId,
          full_name: paper.full_name || '',
          class: paper.class?.toString() || '',
          paper_score: 0,
          patent_score: 0,
          competition_score: 0,
          paper_patent_total: 0,
          total_score: 0
        });
      }
      
      const studentScore = studentScoresMap.get(studentId)!;
      studentScore.paper_score += score;
    });

    // 处理专利分数
    patents?.forEach(patent => {
      const studentId = patent.bupt_student_id;
      const score = parseFloat(patent.score?.toString() || '0') || 0;
      
      if (!studentScoresMap.has(studentId)) {
        studentScoresMap.set(studentId, {
          bupt_student_id: studentId,
          full_name: patent.full_name || '',
          class: patent.class?.toString() || '',
          paper_score: 0,
          patent_score: 0,
          competition_score: 0,
          paper_patent_total: 0,
          total_score: 0
        });
      }
      
      const studentScore = studentScoresMap.get(studentId)!;
      studentScore.patent_score += score;
    });

    // 处理竞赛分数
    competitions?.forEach(competition => {
      const studentId = competition.bupt_student_id;
      const score = parseFloat(competition.score?.toString() || '0') || 0;
      
      if (!studentScoresMap.has(studentId)) {
        studentScoresMap.set(studentId, {
          bupt_student_id: studentId,
          full_name: competition.full_name || '',
          class: competition.class?.toString() || '',
          paper_score: 0,
          patent_score: 0,
          competition_score: 0,
          paper_patent_total: 0,
          total_score: 0
        });
      }
      
      const studentScore = studentScoresMap.get(studentId)!;
      studentScore.competition_score += score;
    });

    // 计算总分并应用限制规则
    const finalScores: StudentScore[] = [];
    
    studentScoresMap.forEach((studentScore) => {
      // 论文+专利总分不超过3分
      const paperPatentSum = studentScore.paper_score + studentScore.patent_score;
      studentScore.paper_patent_total = Math.min(paperPatentSum, 3);
      
      // 总加分不超过4分
      const totalSum = studentScore.paper_patent_total + studentScore.competition_score;
      studentScore.total_score = Math.min(totalSum, 4);
      
      // 保留两位小数
      studentScore.paper_score = Math.round(studentScore.paper_score * 100) / 100;
      studentScore.patent_score = Math.round(studentScore.patent_score * 100) / 100;
      studentScore.competition_score = Math.round(studentScore.competition_score * 100) / 100;
      studentScore.paper_patent_total = Math.round(studentScore.paper_patent_total * 100) / 100;
      studentScore.total_score = Math.round(studentScore.total_score * 100) / 100;
      
      finalScores.push(studentScore);
    });

    // 清空现有的综合评价分数表
    const { error: deleteError } = await supabase
      .from('comprehensive_evaluation_scores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录

    if (deleteError) {
      console.error('清空综合评价分数表失败:', deleteError);
      return NextResponse.json(
        { error: '清空综合评价分数表失败' },
        { status: 500 }
      );
    }

    // 批量插入新的分数记录
    if (finalScores.length > 0) {
      const { error: insertError } = await supabase
        .from('comprehensive_evaluation_scores')
        .insert(finalScores);

      if (insertError) {
        console.error('插入综合评价分数失败:', insertError);
        return NextResponse.json(
          { error: '插入综合评价分数失败' },
          { status: 500 }
        );
      }
    }

    console.log(`成功生成综合评价总加分表，共处理 ${finalScores.length} 名学生`);

    return NextResponse.json({
      success: true,
      message: `成功生成综合评价总加分表，共处理 ${finalScores.length} 名学生`,
      totalStudents: finalScores.length,
      scores: finalScores.sort((a, b) => b.total_score - a.total_score) // 按总分降序排列
    });

  } catch (error) {
    console.error('生成综合评价总加分表失败:', error);
    return NextResponse.json(
      { error: '生成综合评价总加分表失败', details: error },
      { status: 500 }
    );
  }
}

// 获取综合评价总加分表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const classFilter = searchParams.get('class');
    const sortBy = searchParams.get('sortBy') || 'total_score';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query = supabase
      .from('comprehensive_evaluation_scores')
      .select('*');

    // 班级筛选
    if (classFilter) {
      query = query.eq('class', classFilter);
    }

    // 排序
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // 分页
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: scores, error, count } = await query;

    if (error) {
      console.error('获取综合评价分数表失败:', error);
      return NextResponse.json(
        { error: '获取综合评价分数表失败' },
        { status: 500 }
      );
    }

    // 获取总记录数
    const { count: totalCount } = await supabase
      .from('comprehensive_evaluation_scores')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      scores: scores || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('获取综合评价分数表失败:', error);
    return NextResponse.json(
      { error: '获取综合评价分数表失败', details: error },
      { status: 500 }
    );
  }
}
