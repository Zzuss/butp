import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 更新专利答辩状态
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patentId, defenseStatus } = body;

    // 验证参数
    if (!patentId || !defenseStatus) {
      return NextResponse.json(
        { error: '缺少必要参数：patentId, defenseStatus' },
        { status: 400 }
      );
    }

    // 验证答辩状态值
    if (!['pending', 'passed', 'failed'].includes(defenseStatus)) {
      return NextResponse.json(
        { error: 'defenseStatus 必须是 pending、passed 或 failed' },
        { status: 400 }
      );
    }

    // 更新专利答辩状态
    const { data, error } = await supabase
      .from('student_patents')
      .update({ 
        defense_status: defenseStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', patentId)
      .select();

    if (error) {
      console.error('更新专利答辩状态失败:', error);
      return NextResponse.json(
        { error: '更新专利答辩状态失败' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '未找到要更新的专利记录' },
        { status: 404 }
      );
    }

    const statusText = defenseStatus === 'pending' ? '待答辩' : defenseStatus === 'passed' ? '已通过' : '未通过';

    return NextResponse.json({
      success: true,
      message: `专利答辩状态已更新为${statusText}`,
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
