import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 使用与现有API完全相同的配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 更新专利信息
export async function PUT(request: NextRequest) {
  try {
    // 测试Supabase连接
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key exists:', !!supabaseAnonKey);
    
    const body = await request.json();
    console.log('接收到的专利更新请求:', body);
    
    const { 
      id, 
      patent_name, 
      patent_number, 
      patent_date, 
      category_of_patent_owner,
      defense_status,  // 新增：答辩状态
      note,
      score 
    } = body;

    // 验证必要参数
    if (!id || !patent_name) {
      return NextResponse.json(
        { error: '缺少必要参数：id, patent_name' },
        { status: 400 }
      );
    }

    // 处理日期格式：数据库现在支持年月格式
    let formattedDate = null;
    if (patent_date && patent_date.trim() !== '') {
      const dateValue = patent_date.trim();
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
      patent_name: patent_name.trim(),
      updated_at: new Date().toISOString()
    };

    // 添加其他字段
    if (patent_number !== undefined) {
      updateData.patent_number = patent_number?.trim() || null;
    }
    
    if (formattedDate !== null) {
      updateData.patent_date = formattedDate;
    }
    
    if (defense_status !== undefined) {
      // 验证答辩状态值
      if (['pending', 'passed', 'failed'].includes(defense_status)) {
        updateData.defense_status = defense_status;
      }
    }
    
    if (category_of_patent_owner) {
      updateData.category_of_patent_owner = category_of_patent_owner.trim();
    }
    
    if (note !== undefined) {
      updateData.note = note?.trim() || null;
    }
    
    // 处理分数字段
    if (score !== undefined) {
      const scoreValue = parseFloat(score);
      updateData.score = isNaN(scoreValue) ? 0 : Math.max(0, Math.min(10, scoreValue)); // 限制在0-10之间
    }

    console.log('更新专利数据:', updateData);
    console.log('专利ID:', id);

    // 使用与现有API完全相同的更新方式
    const { data, error } = await supabase
      .from('student_patents')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('更新专利失败:', error);
      return NextResponse.json(
        { 
          error: '更新专利失败',
          details: error.message || error,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '未找到要更新的专利记录' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '专利信息更新成功',
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
