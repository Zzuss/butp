import { NextResponse } from 'next/server';
import { hashStudentId, isValidStudentHashInDatabase } from '@/lib/student-data';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 测试学号2023213592的哈希生成
    const testStudentId = '2023213592';
    const generatedHash = hashStudentId(testStudentId);
    
    // 检查这个哈希是否在数据库中
    const isValidInDb = await isValidStudentHashInDatabase(generatedHash);
    
    // 从数据库获取前几个SNH值作为参考
    const { data: sampleHashes, error } = await supabase
      .from('academic_results')
      .select('SNH')
      .limit(10);
    
    return NextResponse.json({
      testStudentId,
      generatedHash,
      isValidInDb,
      sampleHashesFromDb: sampleHashes?.map(item => item.SNH) || [],
      error: error?.message,
      // 检查生成的哈希是否匹配样本中的任何一个
      matchFound: sampleHashes?.some(item => item.SNH === generatedHash) || false
    });

  } catch (error) {
    console.error('Test hash error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 