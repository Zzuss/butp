import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { buildCasLogoutUrl } from '@/lib/cas';
import { SessionData, sessionOptions, defaultSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // 检查是否为本地开发环境
    const isLocalhost = request.nextUrl.hostname === 'localhost' || 
                       request.nextUrl.hostname === '127.0.0.1' ||
                       process.env.NODE_ENV === 'development';
    
    // 获取并清除用户会话
    const tempResponse = new NextResponse();
    const session = await getIronSession<SessionData>(request, tempResponse, sessionOptions);
    
    // 清除会话数据（匹配新的session结构）
    session.userId = defaultSession.userId;
    session.userHash = defaultSession.userHash;
    session.name = defaultSession.name;
    session.isLoggedIn = defaultSession.isLoggedIn;
    session.isCasAuthenticated = defaultSession.isCasAuthenticated;
    session.loginTime = defaultSession.loginTime;
    
    await session.save();
    
    // 本地环境直接重定向到首页，不跳转到CAS服务器
    if (isLocalhost) {
      console.log('CAS logout: localhost detected, redirecting to home page');
      const response = NextResponse.redirect(new URL('/', request.url));
      
      // 复制session cookies到响应
      const sessionCookieHeader = tempResponse.headers.get('set-cookie');
      if (sessionCookieHeader) {
        response.headers.set('set-cookie', sessionCookieHeader);
      }
      
      return response;
    }
    
    // 生产环境跳转到CAS服务器退出
    const response = NextResponse.redirect(buildCasLogoutUrl());
    
    // 复制session cookies到响应
    const sessionCookieHeader = tempResponse.headers.get('set-cookie');
    if (sessionCookieHeader) {
      response.headers.set('set-cookie', sessionCookieHeader);
    }
    
    return response;
  } catch (error) {
    console.error('Error in CAS logout:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
} 