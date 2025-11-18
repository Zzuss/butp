import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { isValidStudentHashInDatabase } from '@/lib/student-data';

export async function POST(request: NextRequest) {
  try {
    // 支持本地开发环境和生产环境的示例用户登录功能
    // 本地开发：完整的测试功能
    // 生产环境：示例用户一键登录功能

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
    const now = Date.now();
    // 为示例用户设置模拟学号，确保年级提取功能正常工作
    const demoStudentNumber = "2023001234"; // 2023级示例学号
    session.userId = demoStudentNumber; // 使用模拟学号作为userId
    session.userHash = userHash;
    session.name = `示例用户-电子信息工程`;
    session.isCasAuthenticated = true; // 模拟CAS认证完成
    session.isLoggedIn = true; // 直接完成登录
    session.loginTime = now;
    session.lastActiveTime = now; // 设置最后活跃时间
    
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
        loginTime: session.loginTime,
        lastActiveTime: session.lastActiveTime
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