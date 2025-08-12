import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { buildCasLogoutUrl } from '@/lib/cas';
import { SessionData, sessionOptions, defaultSession } from '@/lib/session';

// 清除session的通用函数
async function clearSession(request: NextRequest, response: NextResponse) {
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  
  // 清除会话数据
  session.userId = defaultSession.userId;
  session.userHash = defaultSession.userHash;
  session.name = defaultSession.name;
  session.isLoggedIn = defaultSession.isLoggedIn;
  session.isCasAuthenticated = defaultSession.isCasAuthenticated;
  session.loginTime = defaultSession.loginTime;
  session.lastActiveTime = defaultSession.lastActiveTime;
  
  await session.save();
  return session;
}

export async function GET(request: NextRequest) {
  try {
    // 检查是否为本地开发环境
    const isLocalhost = request.nextUrl.hostname === 'localhost' || 
                       request.nextUrl.hostname === '127.0.0.1' ||
                       process.env.NODE_ENV === 'development';
    
    // 获取并清除用户会话
    const tempResponse = new NextResponse();
    await clearSession(request, tempResponse);
    
    console.log('CAS logout GET: session cleared successfully');
    
    // 本地环境直接重定向到首页，不跳转到CAS服务器
    if (isLocalhost) {
      console.log('CAS logout GET: localhost detected, redirecting to home page');
      const response = NextResponse.redirect(new URL('/', request.url));
      
      // 复制session cookies到响应
      const sessionCookieHeader = tempResponse.headers.get('set-cookie');
      if (sessionCookieHeader) {
        response.headers.set('set-cookie', sessionCookieHeader);
      }
      
      return response;
    }
    
    // 生产环境跳转到CAS服务器退出
    console.log('CAS logout GET: production environment, redirecting to CAS logout');
    const response = NextResponse.redirect(buildCasLogoutUrl());
    
    // 复制session cookies到响应
    const sessionCookieHeader = tempResponse.headers.get('set-cookie');
    if (sessionCookieHeader) {
      response.headers.set('set-cookie', sessionCookieHeader);
    }
    
    console.log('✅ CAS logout GET: redirecting to:', buildCasLogoutUrl());
    return response;
  } catch (error) {
    console.error('Error in CAS logout GET:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

// POST方法用于处理sendBeacon和AJAX调用
export async function POST(request: NextRequest) {
  try {
    console.log('CAS logout POST: clearing session via sendBeacon/fetch (local session only)');
    
    // 清除session
    const response = NextResponse.json({ success: true, message: 'Local session cleared' });
    await clearSession(request, response);
    
    console.log('CAS logout POST: local session cleared successfully');
    return response;
  } catch (error) {
    console.error('Error in CAS logout POST:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
} 