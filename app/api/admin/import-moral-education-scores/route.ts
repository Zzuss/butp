import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSimpleBackup } from '../moral-education-backup/route';

// 使用指定的Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || 'https://supabase.butp.tech'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYyMDk5MjAwLCJleHAiOjE5MTk4NjU2MDB9.T4gUgj6Ym9FgD_DTdEPD56wsLarNE0I615so2xvpR0o'

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface MoralEducationScore {
  bupt_student_id: string;
  full_name: string;
  class: string;
  paper_score: number;
  patent_score: number;
  competition_score: number;
  paper_patent_total: number;
  total_score: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validRecords: MoralEducationScore[];
  invalidRecords: any[];
}

// 验证德育总表数据
function validateMoralEducationData(data: any[]): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    validRecords: [],
    invalidRecords: []
  };

  // 必填字段
  const requiredFields = ['bupt_student_id', 'full_name', 'class'];
  // 数值字段
  const numericFields = ['paper_score', 'patent_score', 'competition_score', 'paper_patent_total', 'total_score'];
  // 所有期望字段
  const expectedFields = [...requiredFields, ...numericFields];

  if (!data || data.length === 0) {
    result.isValid = false;
    result.errors.push('文件为空或没有有效数据');
    return result;
  }

  // 检查字段完整性
  const firstRecord = data[0];
  const actualFields = Object.keys(firstRecord);
  
  // 检查缺失的字段
  const missingFields = expectedFields.filter(field => !actualFields.includes(field));
  if (missingFields.length > 0) {
    result.errors.push(`缺少必要字段: ${missingFields.join(', ')}`);
  }

  // 检查多余的字段
  const extraFields = actualFields.filter(field => !expectedFields.includes(field));
  if (extraFields.length > 0) {
    result.warnings.push(`发现额外字段: ${extraFields.join(', ')}，这些字段将被忽略`);
  }

  // 逐行验证数据
  data.forEach((record, index) => {
    const rowNumber = index + 1;
    const errors: string[] = [];

    // 检查必填字段
    requiredFields.forEach(field => {
      if (!record[field] || record[field].toString().trim() === '') {
        errors.push(`第${rowNumber}行: ${field} 字段为空`);
      }
    });

    // 检查数值字段
    numericFields.forEach(field => {
      const value = record[field];
      if (value !== null && value !== undefined && value !== '') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          errors.push(`第${rowNumber}行: ${field} 不是有效数字 (${value})`);
        } else if (numValue < 0) {
          errors.push(`第${rowNumber}行: ${field} 不能为负数 (${numValue})`);
        }
      }
    });

    // 检查德育加分规则
    if (record.paper_score !== null && record.patent_score !== null && record.paper_patent_total !== null) {
      const paperScore = parseFloat(record.paper_score) || 0;
      const patentScore = parseFloat(record.patent_score) || 0;
      const paperPatentTotal = parseFloat(record.paper_patent_total) || 0;
      
      const expectedPaperPatentTotal = Math.min(paperScore + patentScore, 3);
      if (Math.abs(paperPatentTotal - expectedPaperPatentTotal) > 0.01) {
        result.warnings.push(`第${rowNumber}行: 论文+专利总分可能不正确 (当前: ${paperPatentTotal}, 期望: ${expectedPaperPatentTotal})`);
      }
    }

    if (record.paper_patent_total !== null && record.competition_score !== null && record.total_score !== null) {
      const paperPatentTotal = parseFloat(record.paper_patent_total) || 0;
      const competitionScore = parseFloat(record.competition_score) || 0;
      const totalScore = parseFloat(record.total_score) || 0;
      
      const expectedTotalScore = Math.min(paperPatentTotal + competitionScore, 4);
      if (Math.abs(totalScore - expectedTotalScore) > 0.01) {
        result.warnings.push(`第${rowNumber}行: 德育总分可能不正确 (当前: ${totalScore}, 期望: ${expectedTotalScore})`);
      }
    }

    if (errors.length > 0) {
      result.errors.push(...errors);
      result.invalidRecords.push({ ...record, _rowNumber: rowNumber, _errors: errors });
    } else {
      // 处理有效记录
      const validRecord: MoralEducationScore = {
        bupt_student_id: record.bupt_student_id.toString().trim(),
        full_name: record.full_name.toString().trim(),
        class: record.class.toString().trim(),
        paper_score: parseFloat(record.paper_score) || 0,
        patent_score: parseFloat(record.patent_score) || 0,
        competition_score: parseFloat(record.competition_score) || 0,
        paper_patent_total: parseFloat(record.paper_patent_total) || 0,
        total_score: parseFloat(record.total_score) || 0,
      };
      result.validRecords.push(validRecord);
    }
  });

  if (result.errors.length > 0) {
    result.isValid = false;
  }

  return result;
}

// 导入德育总表数据
export async function POST(request: NextRequest) {
  try {
    console.log('开始导入德育总表数据...');
    
    const body = await request.json();
    const { moralScores, replaceExisting = false, validateOnly = false } = body;

    if (!moralScores || !Array.isArray(moralScores)) {
      return NextResponse.json(
        { error: '请提供有效的德育总表数据数组' },
        { status: 400 }
      );
    }

    // 验证数据
    const validation = validateMoralEducationData(moralScores);
    
    // 如果只是验证，直接返回验证结果
    if (validateOnly) {
      return NextResponse.json({
        success: true,
        validation,
        message: validation.isValid ? '数据验证通过' : '数据验证失败'
      });
    }

    // 如果验证失败，返回错误
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        validation,
        error: '数据验证失败，请修正错误后重新上传'
      }, { status: 400 });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // 在导入前创建简单备份
    try {
      await createSimpleBackup();
      console.log('导入前备份创建成功');
    } catch (backupError) {
      console.error('创建导入前备份失败:', backupError);
      // 备份失败不阻止导入，但记录警告
      errors.push('警告: 创建导入前备份失败，但导入将继续进行');
    }

    // 如果选择替换现有数据，先清空表
    if (replaceExisting) {
      const { error: deleteError } = await supabase
        .from('comprehensive_evaluation_scores')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        console.error('清空德育总表失败:', deleteError);
        return NextResponse.json(
          { error: '清空现有数据失败' },
          { status: 500 }
        );
      }
    }

    // 分批处理数据，避免超时
    const BATCH_SIZE = 100;
    for (let i = 0; i < validation.validRecords.length; i += BATCH_SIZE) {
      const batch = validation.validRecords.slice(i, i + BATCH_SIZE);
      
      try {
        if (replaceExisting) {
          // 直接插入
          const { error: insertError } = await supabase
            .from('comprehensive_evaluation_scores')
            .insert(batch);

          if (insertError) {
            console.error(`批次 ${Math.floor(i/BATCH_SIZE) + 1} 插入失败:`, insertError);
            errorCount += batch.length;
            errors.push(`批次 ${Math.floor(i/BATCH_SIZE) + 1}: ${insertError.message}`);
          } else {
            insertedCount += batch.length;
          }
        } else {
          // 使用 upsert 处理重复数据
          const { error: upsertError } = await supabase
            .from('comprehensive_evaluation_scores')
            .upsert(batch, { 
              onConflict: 'bupt_student_id',
              ignoreDuplicates: false 
            });

          if (upsertError) {
            console.error(`批次 ${Math.floor(i/BATCH_SIZE) + 1} upsert失败:`, upsertError);
            errorCount += batch.length;
            errors.push(`批次 ${Math.floor(i/BATCH_SIZE) + 1}: ${upsertError.message}`);
          } else {
            insertedCount += batch.length;
          }
        }
      } catch (batchError) {
        console.error(`批次 ${Math.floor(i/BATCH_SIZE) + 1} 处理失败:`, batchError);
        errorCount += batch.length;
        errors.push(`批次 ${Math.floor(i/BATCH_SIZE) + 1}: ${batchError}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: '德育总表导入完成',
      validation,
      summary: {
        totalRecords: moralScores.length,
        validRecords: validation.validRecords.length,
        invalidRecords: validation.invalidRecords.length,
        inserted: insertedCount,
        updated: updatedCount,
        errors: errorCount
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('导入德育总表失败:', error);
    return NextResponse.json(
      { error: '导入德育总表失败', details: error },
      { status: 500 }
    );
  }
}
