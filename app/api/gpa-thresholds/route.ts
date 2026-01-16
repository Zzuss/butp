import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { major, studentNumber } = body;

    // 验证必填参数
    if (!major) {
      return NextResponse.json({ error: 'Major is required' }, { status: 400 })
    }

    if (!studentNumber) {
      return NextResponse.json({ error: 'Student number is required' }, { status: 400 })
    }

    // 从学号前四位提取年份（不限制格式）
    const trimmedStudentNumber = studentNumber.toString().trim();
    const year = parseInt(trimmedStudentNumber.substring(0, 4));
    
    // 验证年份合理性（2018-2050之间）
    if (isNaN(year) || year < 2018 || year > 2050) {
      return NextResponse.json({ error: 'Invalid year from student number' }, { status: 400 })
    }

    // 将年份转换为字符串类型（数据库字段为text类型）
    const yearText = year.toString();

    console.log('查询GPA门槛值 - 专业:', major);
    console.log('查询GPA门槛值 - 学号:', trimmedStudentNumber);
    console.log('查询GPA门槛值 - 提取年份:', yearText);

    // 查询Average_GPA表
    // 注意：字段名是数字1, 2, 3，需要使用引号包裹
    const { data, error } = await supabase
      .from('Average_GPA')
      .select('"1", "2", "3"')
      .eq('major', major)
      .eq('year', yearText)
      .single();

    if (error) {
      console.error('查询GPA门槛值失败:', error);
      // 如果查询失败，返回null值
      return NextResponse.json({
        success: true,
        data: {
          top10: null,
          top20: null,
          top30: null
        }
      });
    }

    if (!data) {
      console.log('未找到GPA门槛值数据');
      return NextResponse.json({
        success: true,
        data: {
          top10: null,
          top20: null,
          top30: null
        }
      });
    }

    // 提取字段值并转换为number类型
    // 字段名是数字，需要使用方括号访问
    const top10 = data['1'] !== null && data['1'] !== undefined ? parseFloat(data['1']) : null;
    const top20 = data['2'] !== null && data['2'] !== undefined ? parseFloat(data['2']) : null;
    const top30 = data['3'] !== null && data['3'] !== undefined ? parseFloat(data['3']) : null;

    // 验证数值有效性
    const result = {
      top10: (top10 !== null && !isNaN(top10)) ? top10 : null,
      top20: (top20 !== null && !isNaN(top20)) ? top20 : null,
      top30: (top30 !== null && !isNaN(top30)) ? top30 : null
    };

    console.log('查询GPA门槛值成功:', result);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('查询GPA门槛值时发生异常:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        top10: null,
        top20: null,
        top30: null
      }
    }, { status: 500 });
  }
}

