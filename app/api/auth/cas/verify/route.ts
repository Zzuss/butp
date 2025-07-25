import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { validateCasTicket } from '@/lib/cas';
import { SessionData, sessionOptions } from '@/lib/session';
import { validateCasStudentId } from '@/lib/student-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticket = searchParams.get('ticket');
    const username = searchParams.get('username'); // 开发环境下可能包含用户名

    if (!ticket) {
      return NextResponse.json(
        { error: 'Missing ticket parameter' },
        { status: 400 }
      );
    }

    console.log(`CAS verify: validating ticket ${ticket} for username ${username}`);
    
    // 验证CAS ticket（开发环境下会传递username）
    const casUser = await validateCasTicket(ticket, username);
    console.log('CAS verify: validateCasTicket result:', casUser);
    
    if (!casUser) {
      console.error('CAS verify: ticket validation failed');
      return NextResponse.json(
        { error: 'Invalid or expired ticket' },
        { status: 401 }
      );
    }

    // 验证学号是否在数据库中存在并获取哈希值
    const validation = await validateCasStudentId(casUser.userId);
    console.log('CAS verify: student validation result:', validation);
    
    if (!validation.isValid) {
      console.error('CAS verify: student not found in database');
      return NextResponse.json(
        { error: 'Student not found in database' },
        { status: 403 }
      );
    }

    // 获取返回URL，默认重定向到登录页面进行最终认证
    const returnUrl = request.cookies.get('cas-return-url')?.value || '/login';
    console.log('CAS verify: return URL:', returnUrl);
    
    // 创建JSON响应先设置会话，然后通过客户端重定向
    const response = NextResponse.json({ 
      success: true, 
      redirect: '/login', // 总是重定向到登录页面进行最终认证
      user: casUser,
      studentHash: validation.hash,
      studentInfo: validation.studentInfo
    });
    
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    // 存储CAS认证信息，但还未完成最终登录
    session.userId = casUser.userId;
    session.userHash = validation.hash;
    session.name = casUser.name;
    session.isCasAuthenticated = true;
    session.isLoggedIn = false; // 最终登录在login页面完成
    session.loginTime = Date.now();
    
    console.log('CAS verify: creating session with data:', {
      userId: session.userId,
      userHash: session.userHash,
      name: session.name,
      isCasAuthenticated: session.isCasAuthenticated,
      isLoggedIn: session.isLoggedIn,
      loginTime: session.loginTime
    });
    
    await session.save();
    console.log('CAS verify: session saved successfully');
    
    // 输出所有headers进行调试
    console.log('CAS verify: response headers after session save:', Array.from(response.headers.entries()));
    
    // 清除返回URL cookie
    response.cookies.delete('cas-return-url');
    
    console.log('CAS verify: final response cookies:', response.cookies.getAll());
    console.log('CAS verify: Set-Cookie header:', response.headers.get('set-cookie'));

    // 设置重定向header让客户端处理重定向
    response.headers.set('X-Redirect-To', '/login');

    return response;

  } catch (error) {
    console.error('Error in CAS verify:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 