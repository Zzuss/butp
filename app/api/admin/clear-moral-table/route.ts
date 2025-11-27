import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 清空德育总表
export async function DELETE(request: NextRequest) {
  try {
    console.log('开始清空德育总表...');

    // 先获取当前记录数量
    const { count: currentCount, error: countError } = await supabase
      .from('comprehensive_evaluation_scores')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('获取记录数量失败:', countError);
      return NextResponse.json(
        { error: '获取记录数量失败', details: countError.message },
        { status: 500 }
      );
    }

    // 清空德育总表
    const { error: deleteError } = await supabase
      .from('comprehensive_evaluation_scores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录

    if (deleteError) {
      console.error('清空德育总表失败:', deleteError);
      return NextResponse.json(
        { error: '清空德育总表失败', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log(`德育总表清空成功，共删除 ${currentCount || 0} 条记录`);

    return NextResponse.json({
      success: true,
      message: '德育总表清空成功',
      deletedCount: currentCount || 0
    });

  } catch (error) {
    console.error('清空德育总表失败:', error);
    return NextResponse.json(
      { error: '清空德育总表失败', details: error },
      { status: 500 }
    );
  }
}
