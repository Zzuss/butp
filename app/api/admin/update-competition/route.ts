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
      class: classValue, 
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

    // 处理班级字段：将"X班"格式转换为数字
    const processClassValue = (classValue: string | undefined | null): number | null => {
      if (!classValue || classValue.trim() === '') {
        return null;
      }
      
      const trimmed = classValue.trim();
      // 如果是"X班"格式，提取数字
      const match = trimmed.match(/^(\d+)班$/);
      if (match) {
        return parseInt(match[1], 10);
      }
      
      // 如果是纯数字，直接转换
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) {
        return num;
      }
      
      return null;
    };

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
      updateData.competition_level = competition_level?.trim() || null;
    }
    
    if (competition_type !== undefined) {
      updateData.competition_type = competition_type?.trim() || 'individual';
    }
    
    if (classValue) {
      updateData.class = processClassValue(classValue);
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
