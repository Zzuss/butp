import { NextRequest, NextResponse } from 'next/server';
import { getHashByStudentNumber, isValidStudentHashInDatabase } from '@/lib/student-data';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentNumber = searchParams.get('student_number');
    
    if (!studentNumber) {
      return NextResponse.json({
        success: false,
        error: '请提供student_number参数'
      });
    }
    
    console.log(`=== 开始检查学号 ${studentNumber} 的完整数据 ===`);
    
    // 1. 直接查询映射表
    console.log('1. 直接查询映射表...');
    const { data: mappingData, error: mappingError } = await supabase
      .from('student_number_hash_mapping')
      .select('*')
      .eq('student_number', studentNumber);
    
    console.log('映射表查询结果:', { mappingData, mappingError });
    
    // 2. 使用函数获取哈希值
    console.log('2. 使用getHashByStudentNumber函数...');
    const hashResult = await getHashByStudentNumber(studentNumber);
    console.log('getHashByStudentNumber结果:', hashResult);
    
    if (hashResult) {
      // 3. 检查哈希值在数据库中的存在情况
      console.log('3. 检查哈希值在数据库表中的存在情况...');
      const validationResult = await isValidStudentHashInDatabase(hashResult);
      console.log('isValidStudentHashInDatabase结果:', validationResult);
      
      // 4. 直接查询各个可能的表
      console.log('4. 直接查询各个表...');
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
      
      const tableResults: any = {};
      
      for (const table of tables) {
        try {
          console.log(`检查表 ${table}...`);
          const possibleFields = ['SNH', 'student_hash', 'hash', 'student_id', 'id'];
          
          for (const field of possibleFields) {
            try {
              const { data, error } = await supabase
                .from(table)
                .select('*')
                .eq(field, hashResult)
                .limit(5);
              
              if (!error && data && data.length > 0) {
                tableResults[table] = {
                  field: field,
                  count: data.length,
                  sample: data[0]
                };
                console.log(`✅ 在表 ${table} 的字段 ${field} 中找到 ${data.length} 条记录`);
                break; // 找到了就不继续尝试其他字段
              }
            } catch (fieldError) {
              // 继续尝试下一个字段
            }
          }
        } catch (tableError) {
          console.log(`❌ 表 ${table} 查询失败:`, tableError);
        }
      }
      
      return NextResponse.json({
        success: true,
        studentNumber: studentNumber,
        mappingTable: {
          data: mappingData,
          error: mappingError
        },
        hashFromFunction: hashResult,
        validationResult: validationResult,
        tableResults: tableResults,
        summary: {
          mappingExists: !!mappingData && mappingData.length > 0,
          hashFound: !!hashResult,
          isValidInDatabase: validationResult,
          tablesFound: Object.keys(tableResults).length
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '映射表中未找到该学号',
        studentNumber: studentNumber,
        mappingTable: {
          data: mappingData,
          error: mappingError
        }
      });
    }
    
  } catch (error) {
    console.error('调试检查失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}