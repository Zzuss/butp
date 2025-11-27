import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 删除单条记录
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json(
        { error: '缺少必要参数：type 和 id' },
        { status: 400 }
      );
    }

    if (!['paper', 'patent', 'competition'].includes(type)) {
      return NextResponse.json(
        { error: 'type 必须是 paper、patent 或 competition' },
        { status: 400 }
      );
    }

    console.log(`开始删除${type}记录，ID: ${id}`);

    let tableName: string;
    let recordName: string;

    // 根据类型确定表名
    switch (type) {
      case 'paper':
        tableName = 'student_papers';
        recordName = '论文';
        break;
      case 'patent':
        tableName = 'student_patents';
        recordName = '专利';
        break;
      case 'competition':
        tableName = 'student_competition_records';
        recordName = '竞赛';
        break;
      default:
        return NextResponse.json(
          { error: '无效的记录类型' },
          { status: 400 }
        );
    }

    // 先检查记录是否存在
    const { data: existingRecord, error: checkError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: `${recordName}记录不存在` },
          { status: 404 }
        );
      }
      console.error('检查记录失败:', checkError);
      return NextResponse.json(
        { error: '检查记录失败', details: checkError.message },
        { status: 500 }
      );
    }

    // 删除记录
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error(`删除${recordName}记录失败:`, deleteError);
      return NextResponse.json(
        { error: `删除${recordName}记录失败`, details: deleteError.message },
        { status: 500 }
      );
    }

    console.log(`${recordName}记录删除成功，ID: ${id}`);

    return NextResponse.json({
      success: true,
      message: `${recordName}记录删除成功`,
      deletedRecord: {
        type,
        id,
        ...existingRecord
      }
    });

  } catch (error) {
    console.error('删除记录失败:', error);
    return NextResponse.json(
      { error: '删除记录失败', details: error },
      { status: 500 }
    );
  }
}
