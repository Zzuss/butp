import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { validateCasTicket } from '@/lib/cas';
import { SessionData, sessionOptions } from '@/lib/session';
import crypto from 'crypto';

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

    // 生成学号哈希值但不验证数据库（留给最终登录步骤）
    const hash = crypto.createHash('sha256').update(casUser.userId).digest('hex');
    console.log('CAS verify: generated hash for student:', hash);

    // 获取返回URL，默认重定向到登录页面进行最终认证
    const returnUrl = request.cookies.get('cas-return-url')?.value || '/login';
    console.log('CAS verify: return URL:', returnUrl);
    
    // 先创建一个临时响应来正确设置session
    const tempResponse = new NextResponse();
    
    // 获取session并设置数据
    const session = await getIronSession<SessionData>(request, tempResponse, sessionOptions);
    const now = Date.now();
    session.userId = casUser.userId; // 原始学号
    session.userHash = hash; // 学号哈希值
    session.name = casUser.name || `学生${casUser.userId}`; // CAS返回的真实姓名，如果没有则使用学号
    session.isCasAuthenticated = true;
    session.isLoggedIn = false; // 最终登录在login页面完成
    session.loginTime = now;
    session.lastActiveTime = now; // 🆕 设置最后活跃时间
    
    console.log('CAS verify: creating session with data:', {
      userId: session.userId,
      userHash: session.userHash,
      name: session.name,
      isCasAuthenticated: session.isCasAuthenticated,
      isLoggedIn: session.isLoggedIn,
      loginTime: session.loginTime,
      lastActiveTime: session.lastActiveTime
    });
    
    await session.save();
    console.log('CAS verify: session saved successfully');
    
    // 创建重定向响应
    const response = NextResponse.redirect(new URL('/login', request.url));
    
    // 复制session cookies到重定向响应
    const sessionCookieHeader = tempResponse.headers.get('set-cookie');
    if (sessionCookieHeader) {
      response.headers.set('set-cookie', sessionCookieHeader);
      console.log('CAS verify: session cookie copied:', sessionCookieHeader);
    }
    
    // 清除返回URL cookie
    const existingCookie = response.headers.get('set-cookie') || '';
    const newCookieHeader = existingCookie + 
      (existingCookie ? ', ' : '') + 
      'cas-return-url=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
    response.headers.set('set-cookie', newCookieHeader);
    
    // 输出调试信息
    console.log('CAS verify: final response headers:', Array.from(response.headers.entries()));
    console.log('CAS verify: final response cookies:', response.cookies.getAll());

    return response;

  } catch (error) {
    console.error('Error in CAS verify:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 