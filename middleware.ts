import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions, isSessionExpired, updateSessionActivity } from '@/lib/session';

// 需要保护的路由路径
const PROTECTED_PATHS = [
  '/profile',
  '/dashboard',
  '/grades',
  '/analysis',
  '/charts',
  '/role-models',
  // 可以根据需要添加更多受保护的路由
];

// 不需要保护的路由路径
const PUBLIC_PATHS = [
  '/',
  '/api/auth',
  '/api/mock',
  '/login',
  '/auth-status',
  // 可以根据需要添加更多公开路由
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是API路由
  if (pathname.startsWith('/api/')) {
    // API路由不在中间件中处理认证，由各自的API处理
    return NextResponse.next();
  }

  // 检查是否是公开路径
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 检查是否是受保护的路径
  const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  
  if (isProtectedPath) {
    // 检查是否为本地开发环境
    const isLocalhost = request.nextUrl.hostname === 'localhost' || 
                       request.nextUrl.hostname === '127.0.0.1' ||
                       process.env.NODE_ENV === 'development';
    
    if (isLocalhost) {
      // 本地开发环境：直接重定向到登录页面，跳过CAS认证
      console.log('Middleware: localhost detected, redirecting to login page for path:', pathname);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    try {
      // 生产环境：检查用户会话
      const response = NextResponse.next();
      const session = await getIronSession<SessionData>(request, response, sessionOptions);
      
      console.log('Middleware: checking session for path:', pathname, {
        isLoggedIn: session.isLoggedIn,
        isCasAuthenticated: session.isCasAuthenticated,
        userId: session.userId,
        userHash: session.userHash,
        lastActiveTime: session.lastActiveTime,
        timeoutCheck: isSessionExpired(session)
      });
      
      // 检查session是否过期 (30分钟无活动)
      if (isSessionExpired(session)) {
        console.log('Middleware: session expired due to inactivity, forcing complete CAS logout');
        // 🔧 强制完整的CAS logout流程：这会清除本地session并强制CAS服务器也清除认证状态
        // 用户下次访问时必须进行完整的重新认证
        const logoutUrl = new URL('/api/auth/cas/logout', request.url);
        return NextResponse.redirect(logoutUrl);
      }
      
      // 检查用户是否已完全登录（既要CAS认证又要最终登录完成）
      if (!session.isLoggedIn || !session.isCasAuthenticated) {
        // 如果有CAS认证但未登录，说明是页面关闭后重新访问
        if (session.isCasAuthenticated && !session.isLoggedIn && session.userId && session.userHash) {
          console.log('Middleware: has CAS auth but not logged in, checking timeout before auto-login');
          
          // 先检查是否超过30分钟（使用保留的lastActiveTime）
          if (isSessionExpired(session)) {
            console.log('Middleware: session expired during auto-login check, forcing complete CAS logout');
            // 🔧 超时了，需要完全重新认证：强制清除CAS服务器认证状态
            const logoutUrl = new URL('/api/auth/cas/logout', request.url);
            return NextResponse.redirect(logoutUrl);
          }
          
          console.log('Middleware: within timeout window, completing auto-login');
          // 在30分钟内，自动完成登录
          session.isLoggedIn = true;
          session.lastActiveTime = Date.now();  // 更新为当前访问时间
          await session.save();
          
          // 创建新的响应继续处理
          const continueResponse = NextResponse.next();
          // 复制session cookie到响应
          const sessionCookieHeader = response.headers.get('set-cookie');
          if (sessionCookieHeader) {
            continueResponse.headers.set('set-cookie', sessionCookieHeader);
          }
          return continueResponse;
        }
        
        console.log('Middleware: redirecting to CAS login for path:', pathname);
        const loginUrl = new URL('/api/auth/cas/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      // 更新session活跃时间
      updateSessionActivity(session);
      await session.save();
      
      return response;
    } catch (error) {
      console.error('Middleware error:', error);
      // 如果会话检查失败，重定向到登录页面
      const loginUrl = new URL('/api/auth/cas/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// 配置中间件匹配的路径
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了以下开头的：
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (favicon文件)
     * - public文件夹下的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 