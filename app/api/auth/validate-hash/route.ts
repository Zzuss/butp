import { NextRequest, NextResponse } from 'next/server';
import { isValidStudentHashInDatabase } from '@/lib/student-data';

export async function POST(request: NextRequest) {
  try {
    const { userHash, hash } = await request.json();
    const hashToValidate = userHash || hash;
    
    if (!hashToValidate) {
      return NextResponse.json(
        { error: 'Missing hash parameter' },
        { status: 400 }
      );
    }

    console.log('Validate hash: checking hash in database:', hashToValidate);
    
    // 验证哈希值是否在数据库中存在
    const isValid = await isValidStudentHashInDatabase(hashToValidate);
    
    if (isValid) {
      return NextResponse.json({
        success: true,
        valid: true,
        message: 'Hash found in database'
      });
    } else {
      return NextResponse.json(
        { error: 'Hash not found in database' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error validating hash:', error);
    return NextResponse.json(
      { error: 'Failed to validate hash' },
      { status: 500 }
    );
  }
} 