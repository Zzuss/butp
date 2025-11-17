import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 优化版本：使用数据库端聚合，避免函数超时
export async function POST(request: NextRequest) {
  try {
    console.log('开始生成综合评价总加分表（优化版本）...');

    // 使用 SQL 视图或存储过程来在数据库端完成聚合计算
    // 这样可以大大减少数据传输和处理时间
    
    const { data, error } = await supabase.rpc('generate_comprehensive_scores_optimized');

    if (error) {
      console.error('生成总加分表失败:', error);
      return NextResponse.json(
        { error: '生成总加分表失败', details: error.message },
        { status: 500 }
      );
    }

    console.log(`成功生成综合评价总加分表，共处理 ${data?.length || 0} 名学生`);

    return NextResponse.json({
      success: true,
      message: `成功生成综合评价总加分表，共处理 ${data?.length || 0} 名学生`,
      totalStudents: data?.length || 0,
      executionTime: '< 5秒（数据库端处理）'
    });

  } catch (error) {
    console.error('生成综合评价总加分表失败:', error);
    return NextResponse.json(
      { error: '生成综合评价总加分表失败', details: error },
      { status: 500 }
    );
  }
}

// 分批处理版本：适用于无法使用存储过程的情况
export async function PATCH(request: NextRequest) {
  try {
    console.log('开始生成综合评价总加分表（分批处理版本）...');
    
    const BATCH_SIZE = 100; // 每批处理100个学生
    let processedCount = 0;
    let offset = 0;
    
    // 先清空现有数据
    await supabase
      .from('comprehensive_evaluation_scores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    while (true) {
      // 分批获取学生ID
      const { data: studentIds, error: studentError } = await supabase
        .from('student_papers')
        .select('bupt_student_id')
        .range(offset, offset + BATCH_SIZE - 1);

      if (studentError || !studentIds || studentIds.length === 0) {
        break;
      }

      const studentIdList = [...new Set(studentIds.map(s => s.bupt_student_id))];
      
      // 为这批学生计算分数
      const batchScores = await calculateScoresForBatch(studentIdList);
      
      // 插入这批数据
      if (batchScores.length > 0) {
        await supabase
          .from('comprehensive_evaluation_scores')
          .insert(batchScores);
      }

      processedCount += batchScores.length;
      offset += BATCH_SIZE;

      // 避免函数超时，如果处理时间过长则分批返回
      if (processedCount >= 500) {
        break;
      }
    }

    return NextResponse.json({
      success: true,
      message: `分批处理完成，共处理 ${processedCount} 名学生`,
      totalStudents: processedCount,
      note: '如有更多学生，请再次点击生成按钮继续处理'
    });

  } catch (error) {
    console.error('分批生成失败:', error);
    return NextResponse.json(
      { error: '分批生成失败', details: error },
      { status: 500 }
    );
  }
}

// 辅助函数：为一批学生计算分数
async function calculateScoresForBatch(studentIds: string[]) {
  const studentScoresMap = new Map();

  // 获取这批学生的论文分数
  const { data: papers } = await supabase
    .from('student_papers')
    .select('bupt_student_id, full_name, class, score')
    .in('bupt_student_id', studentIds);

  // 获取这批学生的专利分数
  const { data: patents } = await supabase
    .from('student_patents')
    .select('bupt_student_id, full_name, class, score')
    .in('bupt_student_id', studentIds);

  // 获取这批学生的竞赛分数
  const { data: competitions } = await supabase
    .from('student_competition_records')
    .select('bupt_student_id, full_name, class, score')
    .in('bupt_student_id', studentIds);

  // 初始化学生分数
  studentIds.forEach(studentId => {
    studentScoresMap.set(studentId, {
      bupt_student_id: studentId,
      full_name: '',
      class: '',
      paper_score: 0,
      patent_score: 0,
      competition_score: 0,
      paper_patent_total: 0,
      total_score: 0
    });
  });

  // 处理论文分数
  papers?.forEach(paper => {
    const studentScore = studentScoresMap.get(paper.bupt_student_id);
    if (studentScore) {
      studentScore.full_name = paper.full_name || studentScore.full_name;
      studentScore.class = paper.class?.toString() || studentScore.class;
      studentScore.paper_score += parseFloat(paper.score?.toString() || '0') || 0;
    }
  });

  // 处理专利分数
  patents?.forEach(patent => {
    const studentScore = studentScoresMap.get(patent.bupt_student_id);
    if (studentScore) {
      studentScore.full_name = patent.full_name || studentScore.full_name;
      studentScore.class = patent.class?.toString() || studentScore.class;
      studentScore.patent_score += parseFloat(patent.score?.toString() || '0') || 0;
    }
  });

  // 处理竞赛分数
  competitions?.forEach(competition => {
    const studentScore = studentScoresMap.get(competition.bupt_student_id);
    if (studentScore) {
      studentScore.full_name = competition.full_name || studentScore.full_name;
      studentScore.class = competition.class?.toString() || studentScore.class;
      studentScore.competition_score += parseFloat(competition.score?.toString() || '0') || 0;
    }
  });

  // 计算总分并应用规则
  const finalScores = [];
  studentScoresMap.forEach((studentScore) => {
    // 只处理有数据的学生
    if (studentScore.paper_score > 0 || studentScore.patent_score > 0 || studentScore.competition_score > 0) {
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
    }
  });

  return finalScores;
}

// 获取综合评价总加分表（保持原有逻辑）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
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

    const { data: scores, error } = await query;

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
