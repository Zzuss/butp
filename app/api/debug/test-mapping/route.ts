import { NextRequest, NextResponse } from 'next/server';
import { getHashByStudentNumber, isValidStudentHashInDatabase } from '@/lib/student-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentNumber = searchParams.get('student_number');
  
  if (!studentNumber) {
    return NextResponse.json({ 
      error: '请提供学号参数', 
      usage: '添加 ?student_number=2023213592 到URL' 
    });
  }
  
  console.log('🔍 Debug: Testing student number mapping:', studentNumber);
  
  try {
    // 步骤1：查找映射
    console.log('Step 1: Looking up mapping...');
    const userHash = await getHashByStudentNumber(studentNumber);
    
    if (!userHash) {
      return NextResponse.json({
        success: false,
        error: 'no_mapping',
        message: '学号不在映射表中',
        studentNumber,
        debug: {
          step: 1,
          action: 'mapping_lookup',
          result: 'not_found'
        }
      });
    }
    
    console.log('Step 1 success: Found hash:', userHash);
    
    // 步骤2：验证哈希值
    console.log('Step 2: Validating hash in database...');
    const isValid = await isValidStudentHashInDatabase(userHash);
    
    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'invalid_mapping', 
        message: '哈希值在数据库中无效',
        studentNumber,
        userHash,
        debug: {
          step: 2,
          action: 'hash_validation',
          result: 'invalid'
        }
      });
    }
    
    console.log('Step 2 success: Hash is valid');
    
    // 成功返回
    return NextResponse.json({
      success: true,
      message: '学号映射测试成功',
      studentNumber,
      userHash,
      debug: {
        step: 'complete',
        mapping_found: true,
        hash_valid: true,
        ready_for_login: true
      }
    });
    
  } catch (error) {
    console.error('Debug mapping test error:', error);
    return NextResponse.json({
      success: false,
      error: 'mapping_error',
      message: '测试过程中发生错误',
      studentNumber,
      errorDetails: error instanceof Error ? error.message : String(error),
      debug: {
        step: 'error',
        action: 'exception_caught'
      }
    });
  }
}
