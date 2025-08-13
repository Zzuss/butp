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

// 页面关闭时的部分清除函数（保留CAS认证信息）
async function clearLoginSession(request: NextRequest, response: NextResponse) {
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  
  // 只清除登录状态，保留CAS认证信息
  session.isLoggedIn = false;
  // 保留lastActiveTime作为页面关闭时间，用于30分钟超时检查
  // session.lastActiveTime = 0;  // ❌ 删除这行，保持关闭时的时间戳
  // 保留：userId, userHash, name, isCasAuthenticated, loginTime, lastActiveTime
  
  console.log('CAS logout POST: preserving lastActiveTime for timeout check:', session.lastActiveTime);
  
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
    
    // 🔧 强制清除CAS服务器认证状态：重定向到CAS logout，完成后重定向到登录页面而不是首页
    // 这样确保用户下次访问时必须重新进行完整的CAS认证流程
    const casLogoutUrl = buildCasLogoutUrl();
    const response = NextResponse.redirect(casLogoutUrl);
    
    // 复制session cookies到响应
    const sessionCookieHeader = tempResponse.headers.get('set-cookie');
    if (sessionCookieHeader) {
      response.headers.set('set-cookie', sessionCookieHeader);
    }
    
    console.log('✅ CAS logout GET: force logout from CAS server, redirecting to:', casLogoutUrl);
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
    console.log('CAS logout POST: clearing login session only (preserving CAS auth info)');
    
    // 只清除登录状态，保留CAS认证信息
    const response = NextResponse.json({ success: true, message: 'Login session cleared, CAS auth preserved' });
    await clearLoginSession(request, response);
    
    console.log('CAS logout POST: login session cleared, CAS auth info preserved');
    return response;
  } catch (error) {
    console.error('Error in CAS logout POST:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
} 