import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 根据学号获取学生论文和专利信息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: '请提供学号' },
        { status: 400 }
      );
    }

    // 获取论文信息
    const { data: papers, error: papersError } = await supabase
      .from('student_papers')
      .select('*')
      .eq('bupt_student_id', studentId)
      .order('created_at', { ascending: false });

    if (papersError) {
      console.error('获取论文信息失败:', papersError);
      return NextResponse.json(
        { error: '获取论文信息失败' },
        { status: 500 }
      );
    }

    // 获取专利信息
    const { data: patents, error: patentsError } = await supabase
      .from('student_patents')
      .select('*')
      .eq('bupt_student_id', studentId)
      .order('created_at', { ascending: false });

    if (patentsError) {
      console.error('获取专利信息失败:', patentsError);
      return NextResponse.json(
        { error: '获取专利信息失败' },
        { status: 500 }
      );
    }

    // 获取竞赛信息
    const { data: competitions, error: competitionsError } = await supabase
      .from('student_competition_records')
      .select('*')
      .eq('bupt_student_id', studentId)
      .order('created_at', { ascending: false });

    if (competitionsError) {
      console.error('获取竞赛信息失败:', competitionsError);
      return NextResponse.json(
        { error: '获取竞赛信息失败' },
        { status: 500 }
      );
    }

    // 获取学生整体审核状态
    const { data: approvalData, error: approvalError } = await supabase
      .from('student_approvals')
      .select('approval_status')
      .eq('bupt_student_id', studentId)
      .single();

    // 如果没有审核记录，默认为pending状态
    let overallApprovalStatus = 'pending';
    if (!approvalError && approvalData) {
      overallApprovalStatus = approvalData.approval_status;
    }

    // 为每个记录添加默认的审核状态和答辩状态（如果数据库中没有该字段）
    const papersWithStatus = (papers || []).map(paper => ({
      ...paper,
      approval_status: paper.approval_status || 'pending',
      defense_status: paper.defense_status || 'pending'
    }));

    const patentsWithStatus = (patents || []).map(patent => ({
      ...patent,
      approval_status: patent.approval_status || 'pending'
    }));

    const competitionsWithStatus = (competitions || []).map(competition => ({
      ...competition,
      approval_status: competition.approval_status || 'pending'
    }));

    return NextResponse.json({
      studentId,
      papers: papersWithStatus,
      patents: patentsWithStatus,
      competitions: competitionsWithStatus,
      overall_approval_status: overallApprovalStatus,
      total: {
        papers: papersWithStatus.length,
        patents: patentsWithStatus.length,
        competitions: competitionsWithStatus.length
      }
    });

  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 更新论文或专利的分数
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, score } = body;

    if (!type || !id || score === undefined) {
      return NextResponse.json(
        { error: '缺少必要参数：type, id, score' },
        { status: 400 }
      );
    }

    if (!['paper', 'patent', 'competition'].includes(type)) {
      return NextResponse.json(
        { error: 'type 必须是 paper、patent 或 competition' },
        { status: 400 }
      );
    }

    const tableName = type === 'paper' ? 'student_papers' : 
                     type === 'patent' ? 'student_patents' : 
                     'student_competition_records';
    
    const { data, error } = await supabase
      .from(tableName)
      .update({ 
        score: parseFloat(score),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('更新分数失败:', error);
      return NextResponse.json(
        { error: '更新分数失败' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '未找到要更新的记录' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: '分数更新成功',
      data: data[0]
    });

  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

