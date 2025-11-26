import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 创建备份（将当前数据复制到备份表）
export async function POST(request: NextRequest) {
  try {
    console.log('开始创建德育总表备份...');

    // 1. 获取当前德育总表数据
    const { data: currentData, error: currentError } = await supabase
      .from('comprehensive_evaluation_scores')
      .select('*');

    if (currentError) {
      console.error('获取当前数据失败:', currentError);
      return NextResponse.json({ error: '获取当前数据失败' }, { status: 500 });
    }

    // 2. 清空备份表
    const { error: deleteError } = await supabase
      .from('comprehensive_evaluation_scores_backup')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('清空备份表失败:', deleteError);
      return NextResponse.json({ error: '清空备份表失败' }, { status: 500 });
    }

    // 3. 如果有当前数据，复制到备份表
    if (currentData && currentData.length > 0) {
      const backupData = currentData.map(record => ({
        bupt_student_id: record.bupt_student_id,
        full_name: record.full_name,
        class: record.class,
        paper_score: record.paper_score,
        patent_score: record.patent_score,
        competition_score: record.competition_score,
        paper_patent_total: record.paper_patent_total,
        total_score: record.total_score
      }));

      const { error: backupError } = await supabase
        .from('comprehensive_evaluation_scores_backup')
        .insert(backupData);

      if (backupError) {
        console.error('备份数据失败:', backupError);
        return NextResponse.json({ error: '备份数据失败' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: '德育总表备份创建成功',
      backupCount: currentData?.length || 0
    });
  } catch (error) {
    console.error('创建备份失败:', error);
    return NextResponse.json({ error: '创建备份失败' }, { status: 500 });
  }
}

// 回退到备份（将备份数据恢复到当前表）
export async function PUT(request: NextRequest) {
  try {
    console.log('开始回退德育总表...');

    // 1. 获取备份数据
    const { data: backupData, error: backupError } = await supabase
      .from('comprehensive_evaluation_scores_backup')
      .select('*');

    if (backupError) {
      console.error('获取备份数据失败:', backupError);
      return NextResponse.json({ error: '获取备份数据失败' }, { status: 500 });
    }

    if (!backupData || backupData.length === 0) {
      return NextResponse.json({ error: '没有可用的备份数据' }, { status: 400 });
    }

    // 2. 清空当前德育总表
    const { error: deleteError } = await supabase
      .from('comprehensive_evaluation_scores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('清空当前数据失败:', deleteError);
      return NextResponse.json({ error: '清空当前数据失败' }, { status: 500 });
    }

    // 3. 将备份数据恢复到当前表
    const restoreData = backupData.map(record => ({
      bupt_student_id: record.bupt_student_id,
      full_name: record.full_name,
      class: record.class,
      paper_score: record.paper_score,
      patent_score: record.patent_score,
      competition_score: record.competition_score,
      paper_patent_total: record.paper_patent_total,
      total_score: record.total_score
    }));

    const { error: restoreError } = await supabase
      .from('comprehensive_evaluation_scores')
      .insert(restoreData);

    if (restoreError) {
      console.error('恢复数据失败:', restoreError);
      return NextResponse.json({ error: '恢复数据失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '德育总表回退成功',
      restoredCount: backupData.length
    });
  } catch (error) {
    console.error('回退失败:', error);
    return NextResponse.json({ error: '回退失败' }, { status: 500 });
  }
}

// 检查备份状态
export async function GET(request: NextRequest) {
  try {
    // 获取当前数据数量
    const { count: currentCount, error: currentError } = await supabase
      .from('comprehensive_evaluation_scores')
      .select('*', { count: 'exact', head: true });

    if (currentError) {
      console.error('获取当前数据数量失败:', currentError);
      return NextResponse.json({ error: '获取当前数据数量失败' }, { status: 500 });
    }

    // 获取备份数据数量
    const { count: backupCount, error: backupError } = await supabase
      .from('comprehensive_evaluation_scores_backup')
      .select('*', { count: 'exact', head: true });

    if (backupError) {
      console.error('获取备份数据数量失败:', backupError);
      return NextResponse.json({ error: '获取备份数据数量失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      currentCount: currentCount || 0,
      backupCount: backupCount || 0,
      hasBackup: (backupCount || 0) > 0
    });
  } catch (error) {
    console.error('获取备份状态失败:', error);
    return NextResponse.json({ error: '获取备份状态失败' }, { status: 500 });
  }
}

// 导出函数供其他API使用
export async function createSimpleBackup() {
  try {
    // 获取当前数据
    const { data: currentData, error: currentError } = await supabase
      .from('comprehensive_evaluation_scores')
      .select('*');

    if (currentError) {
      throw new Error(`获取当前数据失败: ${currentError.message}`);
    }

    // 清空备份表
    const { error: deleteError } = await supabase
      .from('comprehensive_evaluation_scores_backup')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      throw new Error(`清空备份表失败: ${deleteError.message}`);
    }

    // 备份数据
    if (currentData && currentData.length > 0) {
      const backupData = currentData.map(record => ({
        bupt_student_id: record.bupt_student_id,
        full_name: record.full_name,
        class: record.class,
        paper_score: record.paper_score,
        patent_score: record.patent_score,
        competition_score: record.competition_score,
        paper_patent_total: record.paper_patent_total,
        total_score: record.total_score
      }));

      const { error: backupError } = await supabase
        .from('comprehensive_evaluation_scores_backup')
        .insert(backupData);

      if (backupError) {
        throw new Error(`备份数据失败: ${backupError.message}`);
      }
    }

    return { success: true, backupCount: currentData?.length || 0 };
  } catch (error) {
    console.error('创建简单备份失败:', error);
    throw error;
  }
}
