import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 测试专利表字段
export async function GET(request: NextRequest) {
  try {
    // 获取一条专利记录来查看字段结构
    const { data, error } = await supabase
      .from('student_patents')
      .select('*')
      .limit(1);

    if (error) {
      console.error('查询专利表失败:', error);
      return NextResponse.json({
        error: '查询专利表失败',
        details: error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '专利表字段结构',
      data: data,
      fields: data && data.length > 0 ? Object.keys(data[0]) : []
    });

  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({
      error: '服务器内部错误',
      details: error
    }, { status: 500 });
  }
}
