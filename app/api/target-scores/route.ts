import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 硬编码 Supabase 配置（用于 API 路由）
const supabaseUrl = 'https://sdtarodxdvkeeiaouddo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdGFyb2R4ZHZrZWVpYW91ZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjUxNDksImV4cCI6MjA2NjcwMTE0OX0.4aY7qvQ6uaEfa5KK4CEr2s8BvvmX55g7FcefvhsGLTM';

// 在每次请求时创建新的客户端，避免连接问题
function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function POST(request: NextRequest) {
  try {
    const { studentHash, major } = await request.json()

    if (!studentHash) {
      return NextResponse.json({ error: 'Student hash is required' }, { status: 400 })
    }

    const trimmedHash = studentHash.trim();

    if (!/^[a-f0-9]{64}$/i.test(trimmedHash)) {
      return NextResponse.json({ error: 'Invalid hash format' }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    // 专业到表名映射（与 original 一致）
    const majorToTable: Record<string, string> = {
      '智能科学与技术': 'Cohort2023_Predictions_ai',
      '电子信息工程': 'Cohort2023_Predictions_ee',
      '电信工程及管理': 'Cohort2023_Predictions_tewm',
      '物联网工程': 'Cohort2023_Predictions_iot'
    };

    if (!major || !(major in majorToTable)) {
      return NextResponse.json({ error: 'Invalid or unsupported major' }, { status: 400 })
    }

    const tableName = majorToTable[major];

    // 按专业对应表查询目标分数
    const { data, error } = await supabase
      .from(tableName)
      .select('target1_min_required_score, target2_min_required_score')
      .eq('SNH', trimmedHash)
      .limit(1);

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch target scores' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: {
          target1_score: null,
          target2_score: null
        }
      });
    }

    const result = data[0];

    return NextResponse.json({
      success: true,
      data: {
        target1_score: result.target1_min_required_score,
        target2_score: result.target2_min_required_score
      }
    });

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}