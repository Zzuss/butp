import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { isValidStudentHashInDatabase } from '@/lib/student-data';

export async function POST(request: NextRequest) {
  try {
    const { userHash } = await request.json();
    
    if (!userHash) {
      return NextResponse.json(
        { error: 'Missing userHash parameter' },
        { status: 400 }
      );
    }

    console.log('Complete CAS login: userHash provided:', userHash);
    
    // 验证哈希值是否在数据库中存在
    const isValidInDatabase = await isValidStudentHashInDatabase(userHash);
    if (!isValidInDatabase) {
      console.error('Complete CAS login: student hash not found in database');
      return NextResponse.json(
        { error: 'Student not found in database' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    console.log('Complete CAS login: current session:', {
      isLoggedIn: session.isLoggedIn,
      isCasAuthenticated: session.isCasAuthenticated,
      userId: session.userId,
      userHash: session.userHash,
      name: session.name
    });
    
    // 检查是否已通过CAS认证且哈希值匹配
    if (!session.isCasAuthenticated) {
      console.error('Complete CAS login: not CAS authenticated');
      return NextResponse.json(
        { error: 'Not CAS authenticated' },
        { status: 401 }
      );
    }

    if (session.userHash !== userHash) {
      console.error('Complete CAS login: userHash mismatch');
      return NextResponse.json(
        { error: 'UserHash mismatch' },
        { status: 401 }
      );
    }

    // 完成最终登录
    session.isLoggedIn = true;
    
    console.log('Complete CAS login: updating session to logged in');
    await session.save();
    
    return NextResponse.json({
      success: true,
      user: {
        userId: session.userId,
        userHash: session.userHash,
        name: session.name,
        isLoggedIn: session.isLoggedIn,
        isCasAuthenticated: session.isCasAuthenticated,
        loginTime: session.loginTime
      }
    });

  } catch (error) {
    console.error('Error completing CAS login:', error);
    return NextResponse.json(
      { error: 'Failed to complete login' },
      { status: 500 }
    );
  }
} 