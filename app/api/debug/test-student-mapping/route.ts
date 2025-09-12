import { NextRequest, NextResponse } from 'next/server';
import { getHashByStudentNumber, isValidStudentHashInDatabase, getStudentInfoByHash } from '@/lib/student-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentNumber = searchParams.get('studentNumber') || '2023213592';
  
  try {
    console.log(`测试学号映射流程 - 学号: ${studentNumber}`);
    
    // 步骤1：查询学号映射
    const userHash = await getHashByStudentNumber(studentNumber);
    console.log(`步骤1 - 学号映射结果:`, { 
      studentNumber, 
      foundHash: userHash ? 'yes' : 'no',
      hashValue: userHash
    });
    
    if (!userHash) {
      return NextResponse.json({
        success: false,
        step: 1,
        error: '学号映射表中未找到该学号',
        studentNumber,
        details: {
          studentNumber,
          hashFound: false
        }
      });
    }
    
    // 步骤2：验证哈希值在数据库中是否有效
    const isValidInDatabase = await isValidStudentHashInDatabase(userHash);
    console.log(`步骤2 - 数据库验证结果:`, {
      hash: userHash,
      isValid: isValidInDatabase
    });
    
    if (!isValidInDatabase) {
      return NextResponse.json({
        success: false,
        step: 2,
        error: '哈希值在数据库中无效',
        studentNumber,
        userHash,
        details: {
          hashFound: true,
          hashValue: userHash,
          validInDatabase: false
        }
      });
    }
    
    // 步骤3：获取学生详细信息
    const studentInfo = await getStudentInfoByHash(userHash);
    console.log(`步骤3 - 学生信息查询结果:`, studentInfo);
    
    return NextResponse.json({
      success: true,
      studentNumber,
      userHash,
      isValidInDatabase,
      studentInfo,
      details: {
        step1_hashMapping: '成功',
        step2_databaseValidation: '成功',
        step3_studentInfo: studentInfo ? '成功' : '失败'
      }
    });
    
  } catch (error) {
    console.error('测试学号映射过程中出错:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      studentNumber,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
