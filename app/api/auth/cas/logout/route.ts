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
  
  // 🔧 关键修复：更新lastActiveTime为当前时间（页面关闭时间）
  // 这样下次重新打开页面时可以正确计算30分钟超时
  const now = Date.now();
  session.lastActiveTime = now;
  
  // 保留：userId, userHash, name, isCasAuthenticated, loginTime, lastActiveTime（已更新为关闭时间）
  
  console.log('CAS logout POST: updated lastActiveTime to page close time:', {
    closeTime: new Date(now).toISOString(),
    preservedUserId: session.userId,
    preservedCasAuth: session.isCasAuthenticated
  });
  
  await session.save();
  return session;
}

export async function GET(request: NextRequest) {
  try {
    // 检查是否强制执行CAS服务器登出
    const forceServerLogout = request.nextUrl.searchParams.get('force') === 'true';
    
    // 检查是否为本地开发环境
    const isLocalhost = request.nextUrl.hostname === 'localhost' || 
                       request.nextUrl.hostname === '127.0.0.1' ||
                       process.env.NODE_ENV === 'development';
    
    // 获取并清除用户会话
    const tempResponse = new NextResponse();
    await clearSession(request, tempResponse);
    
    console.log('CAS logout GET: session cleared successfully');
    
    // 如果强制服务器登出，或者在生产环境，都跳转到CAS服务器
    if (forceServerLogout || !isLocalhost) {
      console.log('CAS logout GET: redirecting to CAS server logout', { 
        forceServerLogout, 
        isLocalhost,
        environment: process.env.NODE_ENV 
      });
      
      // 🔧 强制清除CAS服务器认证状态：重定向到CAS logout，完成后重定向到登录页面
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
    }
    
    // 本地环境且非强制模式，直接重定向到首页
    console.log('CAS logout GET: localhost detected, redirecting to home page');
    const response = NextResponse.redirect(new URL('/', request.url));
    
    // 复制session cookies到响应
    const sessionCookieHeader = tempResponse.headers.get('set-cookie');
    if (sessionCookieHeader) {
      response.headers.set('set-cookie', sessionCookieHeader);
    }
    
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