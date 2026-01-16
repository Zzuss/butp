import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 更新竞赛信息
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('接收到的竞赛更新请求:', body);
    
    const { 
      id, 
      competition_name, 
      competition_region, 
      competition_level, 
      competition_type,
      award_type,
      award_value,
      team_leader_is_bupt,
      is_main_member,
      main_members_count,
      coefficient,
      note,
      score 
    } = body;

    // 验证必要参数
    if (!id || !competition_name) {
      return NextResponse.json(
        { error: '缺少必要参数：id, competition_name' },
        { status: 400 }
      );
    }

    // 使用与现有PATCH API相同的更新方式
    const updateData: any = {
      competition_name: competition_name.trim(),
      updated_at: new Date().toISOString()
    };

    // 添加其他字段
    if (competition_region !== undefined) {
      updateData.competition_region = competition_region?.trim() || null;
    }
    
    if (competition_level !== undefined) {
      // competition_level 不能为 null，如果为空则不更新
      const levelValue = competition_level?.trim();
      if (levelValue) {
        updateData.competition_level = levelValue;
      }
    }
    
    if (competition_type !== undefined) {
      updateData.competition_type = competition_type?.trim() || 'individual';
    }
    
    if (award_type !== undefined) {
      updateData.award_type = award_type || null;
    }
    
    if (award_value !== undefined) {
      updateData.award_value = award_value || null;
    }
    
    if (team_leader_is_bupt !== undefined) {
      updateData.team_leader_is_bupt = team_leader_is_bupt;
    }
    
    if (is_main_member !== undefined) {
      updateData.is_main_member = is_main_member;
    }
    
    if (main_members_count !== undefined) {
      updateData.main_members_count = main_members_count;
    }
    
    if (coefficient !== undefined) {
      updateData.coefficient = coefficient;
    }
    
    if (note !== undefined) {
      updateData.note = note?.trim() || null;
    }
    
    // 处理分数字段
    if (score !== undefined) {
      const scoreValue = parseFloat(score);
      updateData.score = isNaN(scoreValue) ? 0 : Math.max(0, Math.min(10, scoreValue)); // 限制在0-10之间
    }

    console.log('更新竞赛数据:', updateData);
    console.log('竞赛ID:', id);

    // 更新竞赛记录
    const { data, error } = await supabase
      .from('student_competition_records')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('更新竞赛失败:', error);
      return NextResponse.json(
        { 
          error: '更新竞赛失败',
          details: error.message || error,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '未找到要更新的竞赛记录' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '竞赛信息更新成功',
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
