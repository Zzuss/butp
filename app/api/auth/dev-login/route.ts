import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { isValidStudentHashInDatabase } from '@/lib/student-data';

export async function POST(request: NextRequest) {
  try {
    // 检查是否为本地开发环境
    const isLocalhost = request.nextUrl.hostname === 'localhost' || 
                       request.nextUrl.hostname === '127.0.0.1' ||
                       process.env.NODE_ENV === 'development';
    
    if (!isLocalhost) {
      return NextResponse.json(
        { error: 'Dev login only available in localhost development mode' },
        { status: 403 }
      );
    }

    const { userHash } = await request.json();

    if (!userHash) {
      return NextResponse.json(
        { error: 'Missing userHash' },
        { status: 400 }
      );
    }

    // 验证哈希值格式（64位十六进制）
    if (!/^[a-fA-F0-9]{64}$/.test(userHash)) {
      return NextResponse.json(
        { error: 'Invalid hash format. Must be 64-character hexadecimal.' },
        { status: 400 }
      );
    }

    console.log('Dev login: verifying hash in database:', userHash.substring(0, 12) + '...');

    // 验证哈希值是否在数据库中存在
    const isValidInDatabase = await isValidStudentHashInDatabase(userHash);
    if (!isValidInDatabase) {
      console.log('Dev login: hash not found in database');
      return NextResponse.json(
        { error: 'Hash not found in database' },
        { status: 404 }
      );
    }

    console.log('Dev login: hash verified, creating session');

    // 创建会话
    const tempResponse = new NextResponse();
    const session = await getIronSession<SessionData>(request, tempResponse, sessionOptions);
    
    // 设置会话数据
    session.userId = `dev-${userHash.substring(0, 8)}`;
    session.userHash = userHash;
    session.name = `开发用户-${userHash.substring(0, 8)}`;
    session.isCasAuthenticated = true; // 模拟CAS认证完成
    session.isLoggedIn = true; // 直接完成登录
    session.loginTime = Date.now();
    
    await session.save();
    
    console.log('Dev login: session created successfully');

    // 创建成功响应
    const response = NextResponse.json({
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
    
    // 复制会话Cookie到响应
    const sessionCookieHeader = tempResponse.headers.get('set-cookie');
    if (sessionCookieHeader) {
      response.headers.set('set-cookie', sessionCookieHeader);
    }
    
    return response;

  } catch (error) {
    console.error('Error in dev login:', error);
    return NextResponse.json(
      { error: 'Failed to complete dev login' },
      { status: 500 }
    );
  }
} 