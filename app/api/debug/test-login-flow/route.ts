import { NextRequest, NextResponse } from 'next/server';
import { getHashByStudentNumber, isValidStudentHashInDatabase } from '@/lib/student-data';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const studentNumber = '2023213592';
  
  try {
    console.log(`=== 开始测试学号 ${studentNumber} 的完整登录流程 ===`);
    
    // 步骤1: 检查映射表
    console.log('步骤1: 查询映射表...');
    const userHash = await getHashByStudentNumber(studentNumber);
    console.log('映射表查询结果:', { 
      studentNumber, 
      foundHash: userHash,
      hashExists: !!userHash 
    });
    
    if (!userHash) {
      return NextResponse.json({
        success: false,
        step: 'mapping_lookup',
        error: '映射表中未找到该学号',
        studentNumber,
        details: {
          mappingResult: null,
          databaseValidation: null
        }
      });
    }
    
    // 步骤2: 验证数据库中是否存在该哈希值
    console.log('步骤2: 验证数据库中哈希值...');
    const isValidInDatabase = await isValidStudentHashInDatabase(userHash);
    console.log('数据库验证结果:', {
      hash: userHash,
      isValid: isValidInDatabase
    });
    
    // 步骤3: 检查具体在哪个表中找到
    console.log('步骤3: 详细检查哪些表包含该哈希值...');
    const tables = [
      'academic_results', 
      'cohort_probability',
      'Cohort2023_Predictions_ai',
      'Cohort2023_Predictions_ee', 
      'Cohort2023_Predictions_tewm',
      'Cohort2023_Predictions_iot',
      'student_profiles',
      'course_enrollments',
      'grade_records',
      'student_records'
    ];
    
    const foundInTables: string[] = [];
    
    for (const table of tables) {
      const possibleFields = ['SNH', 'student_hash', 'hash', 'student_id', 'id'];
      
      for (const field of possibleFields) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select(`"${field}"`)
            .eq(`"${field}"`, userHash)
            .limit(1);
          
          if (!error && data && data.length > 0) {
            foundInTables.push(`${table}.${field}`);
            console.log(`✓ 在 ${table}.${field} 中找到哈希值`);
            break; // 找到就跳出字段循环
          }
        } catch (e) {
          // 忽略错误，继续检查
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      studentNumber,
      steps: {
        step1_mapping: {
          success: true,
          hash: userHash
        },
        step2_database_validation: {
          success: isValidInDatabase,
          foundInTables
        }
      },
      finalResult: isValidInDatabase ? 'SHOULD_LOGIN_SUCCESS' : 'SHOULD_LOGIN_FAIL',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('测试登录流程时发生错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      studentNumber,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
