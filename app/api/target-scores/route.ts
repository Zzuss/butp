import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { studentHash, major, studentNumber } = await request.json()

    if (!studentHash) {
      return NextResponse.json({ error: 'Student hash is required' }, { status: 400 })
    }

    if (!studentNumber) {
      return NextResponse.json({ error: 'Student number is required' }, { status: 400 })
    }

    const trimmedHash = studentHash.trim();
    const trimmedStudentNumber = studentNumber.toString().trim();

    if (!/^[a-f0-9]{64}$/i.test(trimmedHash)) {
      return NextResponse.json({ error: 'Invalid hash format' }, { status: 400 })
    }

    // 从学号前四位提取年份（不限制格式）
    const year = parseInt(trimmedStudentNumber.substring(0, 4));
    // 验证年份合理性（2018-2050之间）
    if (year < 2018 || year > 2050) {
      return NextResponse.json({ error: 'Invalid year from student number' }, { status: 400 })
    }

    let predictionsData = null;
    let predictionsError = null;
    let tableName = '';
    let effectiveYear = year;
    let lastTriedTable = '';
    let found = false;
    const queryLogs: Array<{ tableName: string; found: boolean; message: string }> = [];

    console.log('查询目标分数 - 专业:', major);
    console.log('查询目标分数 - 哈希值:', trimmedHash);
    console.log('查询目标分数 - 学号:', trimmedStudentNumber);
    console.log('查询目标分数 - 提取年份:', year);

    // 在 year-1 到 year+7 范围内查找 Cohort{currentYear}_Predictions_all 表
    for (let offset = -1; offset <= 7; offset++) {
      const currentYear = year + offset;
      if (currentYear > 2050) break;

      const currentTableName = `Cohort${currentYear}_Predictions_all`;
      lastTriedTable = currentTableName;
      const result = await supabase
        .from(currentTableName)
        .select('target1_min_required_score, target2_min_required_score')
        .eq('SNH', trimmedHash)
        .limit(1)
        .single();

      const logEntry = {
        tableName: currentTableName,
        found: !result.error && !!result.data,
        message: !result.error && result.data ? '找到学生数据' : (result.error?.message || 'No data')
      };
      queryLogs.push(logEntry);
      if (logEntry.found) {
        console.log(`查询表 ${currentTableName} - ✅ ${logEntry.message}`);
        predictionsData = result.data;
        predictionsError = null;
        tableName = currentTableName;
        effectiveYear = currentYear;
        found = true;
        break;
      } else {
        predictionsError = result.error;
        console.log(`查询表 ${currentTableName} - ❌ ${logEntry.message}`);
      }
    }

    // 检查是否找到了学生数据
    if (!found || predictionsError || !predictionsData) {
      console.error('❌ 学生目标分数数据缺失!');
      console.error('📊 在指定年份的cohort表中找不到该学生数据');
      console.error('🔍 尝试的表:', tableName);
      console.error('🔍 查询的哈希值:', trimmedHash);
      console.error('📅 学号:', trimmedStudentNumber);
      console.error('📅 提取年份:', year);
      console.error('💡 可能原因: 学生哈希值不在该年份的预测表中，或专业信息不匹配，或学号年份不正确');
      return NextResponse.json({ 
        success: true,
        data: {
          target1_score: null,
          target2_score: null
        },
        queryLogs
      });
    }

    console.log('✅ 成功找到学生目标分数数据，使用表:', tableName);

    return NextResponse.json({
      success: true,
      data: {
        target1_score: predictionsData.target1_min_required_score,
        target2_score: predictionsData.target2_min_required_score
      },
      queryLogs
    });

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}