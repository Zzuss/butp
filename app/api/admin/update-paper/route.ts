import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 更新论文信息
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('接收到的论文更新请求:', body);
    
    const { 
      id, 
      paper_title, 
      journal_name, 
      journal_category, 
      class: classValue, 
      author_type, 
      publish_date, 
      note,
      score 
    } = body;

    // 验证必要参数
    if (!id || !paper_title) {
      return NextResponse.json(
        { error: '缺少必要参数：id, paper_title' },
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

    // 处理日期格式：数据库现在支持年月格式
    let formattedDate = null;
    if (publish_date && publish_date.trim() !== '') {
      const dateValue = publish_date.trim();
      // 验证日期格式
      if (/^\d{4}-\d{2}$/.test(dateValue)) {
        // 月份格式，直接使用
        formattedDate = dateValue;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        // 如果是完整日期，提取年月部分
        formattedDate = dateValue.substring(0, 7); // 提取 YYYY-MM
      } else {
        // 其他格式尝试解析并提取年月
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            formattedDate = `${year}-${month}`;
          }
        } catch {
          formattedDate = null; // 无效日期设为null
        }
      }
    }

    // 使用与现有PATCH API相同的更新方式
    const updateData: any = {
      paper_title: paper_title.trim(),
      updated_at: new Date().toISOString()
    };

    // 逐步添加其他字段
    if (journal_name !== undefined) {
      updateData.journal_name = journal_name?.trim() || null;
    }
    
    if (journal_category !== undefined) {
      updateData.journal_category = journal_category?.trim() || null;
    }
    
    if (classValue) {
      updateData.class = processClassValue(classValue);
    }
    
    if (author_type !== undefined) {
      updateData.author_type = author_type?.trim() || null;
    }
    
    if (formattedDate !== null) {
      updateData.publish_date = formattedDate;
    }
    
    if (note !== undefined) {
      updateData.note = note?.trim() || null;
    }
    
    // 处理分数字段
    if (score !== undefined) {
      const scoreValue = parseFloat(score);
      updateData.score = isNaN(scoreValue) ? 0 : Math.max(0, Math.min(10, scoreValue)); // 限制在0-10之间
    }

    console.log('更新论文数据:', updateData);
    console.log('论文ID:', id);

    // 更新论文记录
    const { data, error } = await supabase
      .from('student_papers')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('更新论文失败:', error);
      return NextResponse.json(
        { 
          error: '更新论文失败',
          details: error.message || error,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '未找到要更新的论文记录' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '论文信息更新成功',
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
