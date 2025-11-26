import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentHash, studentNumber } = body;

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

    let probabilityData = null;
    let probabilityError = null;
    let tableName = '';
    let effectiveYear = year;
    let lastTriedTable = '';
    let found = false;
    const queryLogs: Array<{ tableName: string; found: boolean; message: string }> = [];

    console.log('查询概率数据 - 哈希值:', trimmedHash);
    console.log('查询概率数据 - 学号:', trimmedStudentNumber);
    console.log('查询概率数据 - 提取年份:', year);

    for (let offset = -1; offset <= 7; offset++) {
      const currentYear = year + offset;
      if (currentYear > 2050) break;

      const currentTableName = `Cohort${currentYear}_Predictions_all`;
      lastTriedTable = currentTableName;
      const result = await supabase
        .from(currentTableName)
        .select('current_prob1, current_prob2')
        .eq('SNH', trimmedHash)
        .limit(1)
        .single();

      const logEntry = {
        tableName: currentTableName,
        found: !result.error && !!result.data,
        message: !result.error && result.data ? '找到概率数据' : (result.error?.message || 'No data')
      };
      queryLogs.push(logEntry);
      if (logEntry.found) {
        console.log(`查询表 ${currentTableName} - ✅ ${logEntry.message}`);
        probabilityData = result.data;
        probabilityError = null;
        tableName = currentTableName;
        effectiveYear = currentYear;
        found = true;
        break;
      } else {
        probabilityError = result.error;
        console.log(`查询表 ${currentTableName} - ❌ ${logEntry.message}`);
      }
    }

    // 检查是否在指定年份的cohort表中找到了概率数据
    if (!found || probabilityError || !probabilityData) {
      console.error('❌ 概率数据缺失!');
      console.error('📊 在指定年份的cohort表中找不到该学生概率数据');
      console.error('🔍 尝试的表:', tableName);
      console.error('🔍 查询的哈希值:', trimmedHash);
      console.error('📅 学号:', trimmedStudentNumber);
      console.error('📅 提取年份:', year);
      console.error('💡 可能原因: 学生哈希值不在该年份的预测表中，或学号年份不正确');
      return NextResponse.json({ 
        error: `概率数据缺失: 在 ${year} 年预测表及后续 7 年内找不到该学生概率数据`,
        details: {
          studentHash: trimmedHash,
          studentNumber: trimmedStudentNumber,
          extractedYear: year,
          triedTable: lastTriedTable || `Cohort${year}_Predictions_all`,
          suggestion: '请检查学生哈希值或学号是否正确',
          queryLogs
        }
      }, { status: 404 })
    }

    console.log('✅ 成功找到概率数据，使用表:', tableName);

    return NextResponse.json({
      proba_1: probabilityData.current_prob1,
      proba_2: probabilityData.current_prob2,
      year: effectiveYear
    })

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 