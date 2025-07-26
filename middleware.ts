import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

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
    try {
      // 检查用户会话
      const response = NextResponse.next();
      const session = await getIronSession<SessionData>(request, response, sessionOptions);
      
      console.log('Middleware: checking session for path:', pathname, {
        isLoggedIn: session.isLoggedIn,
        isCasAuthenticated: session.isCasAuthenticated,
        userId: session.userId,
        userHash: session.userHash
      });
      
      // 检查用户是否已完全登录（既要CAS认证又要最终登录完成）
      if (!session.isLoggedIn || !session.isCasAuthenticated) {
        console.log('Middleware: redirecting to CAS login for path:', pathname);
        const loginUrl = new URL('/api/auth/cas/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      
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