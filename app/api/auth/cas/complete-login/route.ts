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
    
    // 开发环境：允许无CAS认证直接登录（仅用于测试）
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      console.log('Complete CAS login: DEVELOPMENT MODE - bypassing CAS authentication check');
      
      // 开发环境下，如果没有CAS认证信息，创建一个模拟的认证信息
      if (!session.isCasAuthenticated) {
        console.log('Complete CAS login: creating mock CAS authentication for development');
        session.isCasAuthenticated = true;
        session.userId = userHash.substring(0, 8); // 使用哈希值前8位作为模拟学号
        session.userHash = userHash;
        session.name = `测试用户_${userHash.substring(0, 6)}`; // 创建模拟姓名
        session.loginTime = Date.now();
      }
    } else {
      // 生产环境：严格检查CAS认证
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