import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用硬编码的Supabase配置
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { studentHash } = await request.json();

    if (!studentHash) {
      return NextResponse.json(
        { error: '缺少studentHash参数' },
        { status: 400 }
      );
    }

    console.log('Fetching target scores for hash:', studentHash.substring(0, 16) + '...');

    // 从cohort_predictions表获取目标分数
    const { data, error } = await supabase
      .from('cohort_predictions')
      .select('target1_min_required_score, target2_min_required_score')
      .eq('SNH', studentHash)
      .limit(1);

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: '数据库查询失败' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.log('No target scores found for hash:', studentHash.substring(0, 16) + '...');
      return NextResponse.json(
        { error: '未找到目标分数数据' },
        { status: 404 }
      );
    }

    const targetData = data[0];
    
    const result = {
      target1_score: targetData.target1_min_required_score,
      target2_score: targetData.target2_min_required_score
    };

    console.log('Target scores found:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}