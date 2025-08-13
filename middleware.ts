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

  console.log('🚀 Middleware triggered for path:', pathname);

  // 检查是否是API路由
  if (pathname.startsWith('/api/')) {
    // API路由不在中间件中处理认证，由各自的API处理
    console.log('📝 Middleware: API route detected, skipping auth check');
    return NextResponse.next();
  }

  // 检查是否是公开路径
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    console.log('🔓 Middleware: public path detected, allowing access');
    return NextResponse.next();
  }

  // 检查是否是受保护的路径
  const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  
  if (isProtectedPath) {
    console.log('🔒 Middleware: protected path detected, checking auth');
    
    // 检查是否为本地开发环境
    const isLocalhost = request.nextUrl.hostname === 'localhost' || 
                       request.nextUrl.hostname === '127.0.0.1' ||
                       process.env.NODE_ENV === 'development';
    
    if (isLocalhost) {
      // 本地开发环境：直接重定向到登录页面，跳过CAS认证
      console.log('💻 Middleware: localhost detected, redirecting to login page for path:', pathname);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    try {
      // 生产环境：检查用户会话
      const response = NextResponse.next();
      const session = await getIronSession<SessionData>(request, response, sessionOptions);
      
      console.log('🔍 Middleware: checking session for path:', pathname, {
        isLoggedIn: session.isLoggedIn,
        isCasAuthenticated: session.isCasAuthenticated,
        userId: session.userId,
        userHash: session.userHash,
        lastActiveTime: session.lastActiveTime ? new Date(session.lastActiveTime).toISOString() : 'none',
        timeoutCheck: isSessionExpired(session)
      });
      
      // 🔧 关键修复：只有在真正超时时才清除session
      if (isSessionExpired(session)) {
        console.log('⏰ Middleware: session expired due to inactivity (30min), forcing complete CAS logout');
        console.log('🔄 Middleware: redirecting to CAS logout URL');
        const logoutUrl = new URL('/api/auth/cas/logout', request.url);
        return NextResponse.redirect(logoutUrl);
      }
      
      // 🔧 修复：检查用户是否已登录
      // 如果session存在且未过期，但登录状态不完整，则自动恢复登录状态
      if (session.userId && session.userHash && session.isCasAuthenticated) {
        // 如果有完整的认证信息但isLoggedIn为false，说明是页面刷新或重新访问
        if (!session.isLoggedIn) {
          console.log('🔄 Middleware: restoring login state after page refresh');
          session.isLoggedIn = true;
        }
        
        // 更新活跃时间并保存
        console.log('✅ Middleware: user authenticated, updating activity time');
        updateSessionActivity(session);
        await session.save();
        
        return response;
      }
      
      // 如果没有完整的认证信息，重定向到登录
      console.log('🚪 Middleware: no valid authentication, redirecting to CAS login for path:', pathname);
      const loginUrl = new URL('/api/auth/cas/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    } catch (error) {
      console.error('❌ Middleware error:', error);
      // 如果会话检查失败，重定向到登录页面
      const loginUrl = new URL('/api/auth/cas/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  console.log('🔓 Middleware: non-protected path, allowing access');
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