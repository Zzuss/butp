import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { isValidStudentHashInDatabase } from '@/lib/student-data';

export async function POST(request: NextRequest) {
  try {
    const { userHash, preserveCasInfo } = await request.json();
    
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

    // 先创建一个临时响应来处理session
    const tempResponse = new NextResponse();
    const session = await getIronSession<SessionData>(request, tempResponse, sessionOptions);
    
    // 添加详细的请求调试信息
    console.log('Complete CAS login: request cookies:', request.cookies.getAll());
    console.log('Complete CAS login: request headers:', Object.fromEntries(request.headers.entries()));
    
    console.log('Complete CAS login: current session:', {
      isLoggedIn: session.isLoggedIn,
      isCasAuthenticated: session.isCasAuthenticated,
      userId: session.userId,
      userHash: session.userHash,
      name: session.name
    });
    
    // 检查是否已通过CAS认证
    if (!session.isCasAuthenticated) {
      console.error('Complete CAS login: not CAS authenticated');
      return NextResponse.json(
        { error: 'Not CAS authenticated' },
        { status: 401 }
      );
    }

    // 如果保留CAS信息，使用用户输入的哈希值更新session
    if (preserveCasInfo) {
      console.log('Complete CAS login: using user input hash:', userHash);
      session.userHash = userHash; // 使用用户输入的哈希值
    } else {
      // 否则验证哈希值匹配
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
    console.log('Complete CAS login: session before save:', {
      isLoggedIn: session.isLoggedIn,
      isCasAuthenticated: session.isCasAuthenticated,
      userId: session.userId,
      userHash: session.userHash,
      name: session.name
    });
    
    await session.save();
    
    console.log('Complete CAS login: session saved successfully');
    
    // 创建成功响应并复制session cookies
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
    
    // 复制session cookie到最终响应
    const sessionCookieHeader = tempResponse.headers.get('set-cookie');
    if (sessionCookieHeader) {
      response.headers.set('set-cookie', sessionCookieHeader);
      console.log('Complete CAS login: session cookie copied to response');
    }
    
    return response;

  } catch (error) {
    console.error('Error completing CAS login:', error);
    return NextResponse.json(
      { error: 'Failed to complete login' },
      { status: 500 }
    );
  }
} 