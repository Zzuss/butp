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

// 生成德育总表（适合Vercel的轻量级版本）
export async function POST(request: NextRequest) {
  try {
    console.log('开始生成德育总表（轻量级版本）...');
    
    const startTime = Date.now();
    
    // 方案：使用SQL视图或者分批处理，避免一次性加载所有数据
    // 这里我们使用一个更聪明的方法：只获取有加分记录的学生
    
    // 1. 获取所有有论文记录的学生
    const { data: paperStudents, error: paperError } = await supabase
      .from('student_papers')
      .select('bupt_student_id, full_name, class, score')
      .limit(1000); // 限制数量避免超时

    if (paperError) {
      console.error('获取论文数据失败:', paperError);
      return NextResponse.json({ error: '获取论文数据失败' }, { status: 500 });
    }

    // 2. 获取所有有专利记录的学生
    const { data: patentStudents, error: patentError } = await supabase
      .from('student_patents')
      .select('bupt_student_id, full_name, class, score')
      .limit(1000);

    if (patentError) {
      console.error('获取专利数据失败:', patentError);
      return NextResponse.json({ error: '获取专利数据失败' }, { status: 500 });
    }

    // 3. 获取所有有竞赛记录的学生
    const { data: competitionStudents, error: competitionError } = await supabase
      .from('student_competition_records')
      .select('bupt_student_id, full_name, class, score')
      .limit(1000);

    if (competitionError) {
      console.error('获取竞赛数据失败:', competitionError);
      return NextResponse.json({ error: '获取竞赛数据失败' }, { status: 500 });
    }

    // 4. 汇总所有学生的德育分数
    const studentScoresMap = new Map<string, MoralEducationScore>();

    // 处理论文分数
    paperStudents?.forEach(paper => {
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
    patentStudents?.forEach(patent => {
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
    competitionStudents?.forEach(competition => {
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

    // 5. 计算总分并应用德育加分规则
    const finalScores: MoralEducationScore[] = [];
    
    studentScoresMap.forEach((studentScore) => {
      // 论文+专利总分不超过3分
      const paperPatentSum = studentScore.paper_score + studentScore.patent_score;
      studentScore.paper_patent_total = Math.min(paperPatentSum, 3);
      
      // 德育总加分不超过4分
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

    // 6. 更新德育总表（使用upsert避免重复）
    if (finalScores.length > 0) {
      // 先清空现有数据
      await supabase
        .from('comprehensive_evaluation_scores')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // 批量插入新数据
      const { error: insertError } = await supabase
        .from('comprehensive_evaluation_scores')
        .insert(finalScores);

      if (insertError) {
        console.error('插入德育分数失败:', insertError);
        return NextResponse.json({ error: '插入德育分数失败' }, { status: 500 });
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`德育总表生成完成，耗时 ${executionTime}ms，共处理 ${finalScores.length} 名学生`);

    return NextResponse.json({
      success: true,
      message: `德育总表生成成功，共处理 ${finalScores.length} 名学生`,
      totalStudents: finalScores.length,
      executionTime: `${executionTime}ms`,
      note: '德育总表已生成，可用于与智育成绩合并'
    });

  } catch (error) {
    console.error('生成德育总表失败:', error);
    return NextResponse.json(
      { error: '生成德育总表失败', details: error },
      { status: 500 }
    );
  }
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
