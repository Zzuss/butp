import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface MoralEducationScore {
  bupt_student_id: string;
  full_name: string;
  class: string;
  phone_number?: string;
  paper_score: number;
  patent_score: number;
  competition_score: number;
  paper_patent_total: number;
  total_score: number;
}

// 计算单个学生的德育分数
async function calculateStudentMoralScore(studentId: string): Promise<MoralEducationScore | null> {
  try {
    // 获取学生的论文记录
    const { data: papers, error: paperError } = await supabase
      .from('student_papers')
      .select('bupt_student_id, full_name, phone_number, score')
      .eq('bupt_student_id', studentId)
      .eq('approval_status', 'approved');

    if (paperError) {
      console.error('获取论文数据失败:', paperError);
      return null;
    }

    // 获取学生的专利记录
    const { data: patents, error: patentError } = await supabase
      .from('student_patents')
      .select('bupt_student_id, full_name, phone_number, score')
      .eq('bupt_student_id', studentId)
      .eq('approval_status', 'approved');

    if (patentError) {
      console.error('获取专利数据失败:', patentError);
      return null;
    }

    // 获取学生的竞赛记录
    const { data: competitions, error: competitionError } = await supabase
      .from('student_competition_records')
      .select('bupt_student_id, full_name, phone_number, score')
      .eq('bupt_student_id', studentId)
      .eq('approval_status', 'approved');

    if (competitionError) {
      console.error('获取竞赛数据失败:', competitionError);
      return null;
    }

    // 获取额外加分
    const { data: extraBonus, error: extraBonusError } = await supabase
      .from('extra_bonus_scores')
      .select('bonus_score')
      .eq('bupt_student_id', studentId)
      .single();

    const extraBonusScore = (!extraBonusError && extraBonus) ? (parseFloat(extraBonus.bonus_score?.toString() || '0') || 0) : 0;

    // 如果学生没有任何记录（包括额外加分），返回null
    if ((!papers || papers.length === 0) && 
        (!patents || patents.length === 0) && 
        (!competitions || competitions.length === 0) &&
        extraBonusScore === 0) {
      return null;
    }

    // 获取学生基本信息（从任一有记录的表中获取，优先使用phone_number作为class）
    let studentInfo = { full_name: '', class: '', phone_number: '' };
    if (papers && papers.length > 0) {
      studentInfo = { 
        full_name: papers[0].full_name || '', 
        class: papers[0].phone_number?.toString() || '',
        phone_number: papers[0].phone_number?.toString() || ''
      };
    } else if (patents && patents.length > 0) {
      studentInfo = { 
        full_name: patents[0].full_name || '', 
        class: patents[0].phone_number?.toString() || '',
        phone_number: patents[0].phone_number?.toString() || ''
      };
    } else if (competitions && competitions.length > 0) {
      studentInfo = { 
        full_name: competitions[0].full_name || '', 
        class: competitions[0].phone_number?.toString() || '',
        phone_number: competitions[0].phone_number?.toString() || ''
      };
    }

    // 计算各项分数
    const paperScore = papers?.reduce((sum, paper) => sum + (parseFloat(paper.score?.toString() || '0') || 0), 0) || 0;
    const patentScore = patents?.reduce((sum, patent) => sum + (parseFloat(patent.score?.toString() || '0') || 0), 0) || 0;
    const competitionScore = competitions?.reduce((sum, competition) => sum + (parseFloat(competition.score?.toString() || '0') || 0), 0) || 0;

    // 应用德育加分规则
    const paperPatentSum = paperScore + patentScore;
    const paperPatentTotal = Math.min(paperPatentSum, 3); // 论文+专利总分不超过3分
    const totalScore = Math.min(paperPatentTotal + competitionScore + extraBonusScore, 4); // 德育总加分（含额外加分）不超过4分

    return {
      bupt_student_id: studentId,
      full_name: studentInfo.full_name,
      class: studentInfo.class,
      phone_number: studentInfo.phone_number,
      paper_score: Math.round(paperScore * 100) / 100,
      patent_score: Math.round(patentScore * 100) / 100,
      competition_score: Math.round(competitionScore * 100) / 100,
      paper_patent_total: Math.round(paperPatentTotal * 100) / 100,
      total_score: Math.round(totalScore * 100) / 100
    };
  } catch (error) {
    console.error('计算学生德育分数失败:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { studentId, status } = await request.json()

    // 验证参数
    if (!studentId || !status) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: '无效的审核状态' }, { status: 400 })
    }

    // 处理德育总表操作
    let moralScore: MoralEducationScore | null = null;
    
    if (status === 'approved') {
      // 审核通过：计算德育分数并插入德育总表
      moralScore = await calculateStudentMoralScore(studentId);
      
      if (moralScore) {
        // 先删除可能存在的旧记录
        await supabase
          .from('comprehensive_evaluation_scores')
          .delete()
          .eq('bupt_student_id', studentId);

        // 插入新的德育分数记录
        const { error: insertError } = await supabase
          .from('comprehensive_evaluation_scores')
          .insert(moralScore);

        if (insertError) {
          console.error('插入德育分数失败:', insertError);
          return NextResponse.json({ error: '插入德育分数失败' }, { status: 500 });
        }
      }
    } else {
      // 拒绝推免或重置：从德育总表中删除该学生记录
      const { error: deleteError } = await supabase
        .from('comprehensive_evaluation_scores')
        .delete()
        .eq('bupt_student_id', studentId);

      if (deleteError) {
        console.error('删除德育分数记录失败:', deleteError);
        // 这里不返回错误，因为可能本来就没有记录
      }
    }

    // 检查是否已有审核记录
    const { data: existingApproval } = await supabase
      .from('student_approvals')
      .select('id')
      .eq('bupt_student_id', studentId)
      .single()

    if (existingApproval) {
      // 更新现有记录
      const { error } = await supabase
        .from('student_approvals')
        .update({ 
          approval_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('bupt_student_id', studentId)

      if (error) {
        console.error('更新学生审核状态失败:', error)
        return NextResponse.json({ error: '更新学生审核状态失败' }, { status: 500 })
      }
    } else {
      // 创建新记录
      const { error } = await supabase
        .from('student_approvals')
        .insert({
          bupt_student_id: studentId,
          approval_status: status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('创建学生审核记录失败:', error)
        return NextResponse.json({ error: '创建学生审核记录失败' }, { status: 500 })
      }
    }

    // 返回结果，包含德育分数信息
    const responseData: any = {
      success: true,
      message: `学生推免资格${status === 'approved' ? '通过' : status === 'rejected' ? '拒绝' : '重置为待审核'}成功`
    };

    if (status === 'approved' && moralScore) {
      responseData.moralScore = moralScore;
      responseData.message += `，德育总分：${moralScore.total_score}分`;
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('学生审核失败:', error)
    return NextResponse.json(
      { error: '学生审核失败' },
      { status: 500 }
    )
  }
}
