import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions, isSessionExpired, updateSessionActivity } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { getStorageSupabase } from '@/lib/storageSupabase';

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

// 需要管理员权限的路由路径
const ADMIN_PROTECTED_PATHS = [
  '/admin',
  // 所有以/admin开头的路由都需要管理员权限
];

// 不需要隐私条款检查的路由路径
const PRIVACY_EXEMPT_PATHS = [
  '/privacy-agreement',
  '/login',
  '/admin-login',
  '/',
  '/api/auth',
  '/api/mock',
  '/auth-status',
  '/testsupa',
];

// 不需要保护的路由路径
const PUBLIC_PATHS = [
  '/',
  '/api/auth',
  '/api/mock',
  '/login',
  '/admin-login',
  '/auth-status',
  '/testsupa',
  // 可以根据需要添加更多公开路由
];

// 检查管理员身份的辅助函数
function checkAdminPermission(request: NextRequest): boolean {
  try {
    const adminSessionCookie = request.cookies.get('admin-session');
    console.log('🍪 Cookie check - admin-session:', adminSessionCookie ? 'EXISTS' : 'NOT_FOUND');
    console.log('🍪 All cookies:', request.cookies.getAll().map(c => c.name));
    
    if (!adminSessionCookie?.value) {
      console.log('🚫 No admin-session cookie found');
      return false;
    }

    // 解析管理员session cookie
    const adminSession = JSON.parse(adminSessionCookie.value);
    
    // 检查session是否有效（检查必要字段和过期时间）
    if (!adminSession.id || !adminSession.username || !adminSession.loginTime) {
      console.log('🚫 Invalid admin session data');
      return false;
    }

    // 检查session是否过期（24小时）
    const loginTime = new Date(adminSession.loginTime);
    const now = new Date();
    const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLogin > 24) {
      console.log('🚫 Admin session expired');
      return false;
    }

    console.log('✅ Valid admin session for user:', adminSession.username);
    return true;
  } catch (error) {
    console.error('🚫 检查管理员权限失败:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('🔥🔥🔥 MIDDLEWARE EXECUTING FOR PATH:', pathname);
  console.log('🚀 Middleware triggered for path:', pathname);

  // 检查是否是API路由
  if (pathname.startsWith('/api/')) {
    // API路由不在中间件中处理认证，由各自的API处理
    console.log('📝 Middleware: API route detected, skipping auth check');
    return NextResponse.next();
  }

  // 检查是否是公开路径（精确匹配或特定前缀匹配）
  const isPublicPath = PUBLIC_PATHS.some(path => {
    if (path === '/') {
      return pathname === '/';  // 只匹配根路径
    }
    return pathname.startsWith(path);
  });
  
  if (isPublicPath) {
    console.log('🔓 Middleware: public path detected, allowing access');
    return NextResponse.next();
  }

  // 检查是否需要隐私条款同意
  const needsPrivacyCheck = !PRIVACY_EXEMPT_PATHS.some(path => pathname.startsWith(path));

  // 检查是否是受保护的路径
  const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  const isAdminProtectedPath = ADMIN_PROTECTED_PATHS.some(path => pathname.startsWith(path));
  
  // 检查管理员路由保护
  if (isAdminProtectedPath) {
    console.log('🛡️ Middleware: admin protected path detected:', pathname);
    console.log('🔍 Middleware: checking admin permission...');
    
    const hasAdminPermission = checkAdminPermission(request);
    console.log('🔍 Middleware: admin permission result:', hasAdminPermission);
    
    if (!hasAdminPermission) {
      console.log('🚫 Middleware: user does not have admin permission, redirecting to admin login');
      const adminLoginUrl = new URL('/admin-login', request.url);
      adminLoginUrl.searchParams.set('error', 'admin_required');
      adminLoginUrl.searchParams.set('message', '该页面需要管理员权限，请以管理员身份登录');
      return NextResponse.redirect(adminLoginUrl);
    }
    
    console.log('✅ Middleware: admin permission verified, allowing access to admin path');
    return NextResponse.next();
  }
  
  if (isProtectedPath) {
    console.log('🔒 Middleware: protected path detected, checking auth');
    
    // 检查是否为本地开发环境
    const isLocalhost = request.nextUrl.hostname === 'localhost' || 
                       request.nextUrl.hostname === '127.0.0.1' ||
                       process.env.NODE_ENV === 'development';
    
    try {
      // 本地和生产环境：都需要检查用户会话
      const response = NextResponse.next();
      const session = await getIronSession<SessionData>(request, response, sessionOptions);
      
      console.log(`🔍 Middleware: checking session for path ${pathname} (${isLocalhost ? 'localhost' : 'production'}):`, {
        isLoggedIn: session.isLoggedIn,
        isCasAuthenticated: session.isCasAuthenticated,
        userId: session.userId,
        userHash: session.userHash ? session.userHash.substring(0, 12) + '...' : 'none',
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
        let sessionChanged = false;
        
        // 如果有完整的认证信息但isLoggedIn为false，说明是页面刷新或重新访问
        if (!session.isLoggedIn) {
          console.log('🔄 Middleware: restoring login state after page refresh/reopen');
          session.isLoggedIn = true;
          sessionChanged = true;
          
          // 📝 显示上次活跃时间信息，帮助调试
          if (session.lastActiveTime) {
            const timeSinceLastActive = Date.now() - session.lastActiveTime;
            const minutesSince = Math.round(timeSinceLastActive / 1000 / 60);
            console.log(`📊 Last active: ${new Date(session.lastActiveTime).toISOString()} (${minutesSince} minutes ago)`);
          }
        }
        
        // 更新活跃时间为当前访问时间
        const oldActiveTime = session.lastActiveTime;
        updateSessionActivity(session);
        if (session.lastActiveTime !== oldActiveTime) {
          sessionChanged = true;
          console.log('⏰ Updated lastActiveTime from', oldActiveTime ? new Date(oldActiveTime).toISOString() : 'none', 'to', new Date(session.lastActiveTime).toISOString());
        }
        
        // 只有在session数据发生变化时才保存
        if (sessionChanged) {
          console.log('✅ Middleware: session data changed, saving...');
          await session.save();
        } else {
          console.log('✅ Middleware: session valid, no changes needed');
        }
        
        // 检查隐私条款同意状态 - 只检查完全登录的用户
        console.log('🔍 Middleware隐私条款检查条件:', {
          needsPrivacyCheck,
          isLoggedIn: session.isLoggedIn,
          hasUserHash: !!session.userHash,
          pathname
        });
        
        if (needsPrivacyCheck && session.isLoggedIn && session.userHash) {
          try {
            console.log('🔒 Middleware: checking privacy agreement for path:', pathname);
            
            // 🔥 新方案：直接从Storage获取隐私条款文件信息
            const storageSupabase = getStorageSupabase();
            const possibleFiles = [
              'privacy-policy-latest.docx',
              'privacy-policy-latest.doc', 
              'privacy-policy-latest.pdf',
              'privacy-policy-latest.txt',
              'privacy-policy-latest.html'
            ];

            let currentFileInfo: any = null;
            let fileName = '';

            // 找到存在的隐私条款文件
            for (const testFileName of possibleFiles) {
              try {
                const { data: files, error: listError } = await storageSupabase.storage
                  .from('privacy-files')
                  .list('', {
                    search: testFileName
                  });

                if (!listError && files && files.length > 0) {
                  currentFileInfo = files[0];
                  fileName = testFileName;
                  console.log(`📋 Middleware: 找到隐私条款文件: ${testFileName}`);
                  break;
                }
              } catch (err) {
                continue;
              }
            }

            if (!currentFileInfo) {
              console.log('⚠️  Middleware: 未找到隐私条款文件，但仍需要用户同意');
              // 即使没有找到文件，也要求用户访问隐私条款页面
              const privacyUrl = new URL('/privacy-agreement', request.url);
              privacyUrl.searchParams.set('returnUrl', pathname);
              return NextResponse.redirect(privacyUrl);
            }

            // 使用文件修改时间作为版本标识
            const fileVersion = currentFileInfo.updated_at || currentFileInfo.created_at;

            console.log('🔍 Middleware版本检查:', {
              file: fileName,
              version: fileVersion,
              userHash: session.userHash?.substring(0, 8) + '...'
            });

            // 从主数据库查询用户同意记录
            const { data: agreementData, error: agreementError } = await supabase
              .from('user_privacy_agreements')
              .select('id, agreed_at')
              .eq('user_id', session.userHash)
              .eq('privacy_policy_file', fileName)
              .eq('privacy_policy_version', fileVersion)
              .single()

            if (agreementError && (agreementError as any).code !== 'PGRST116') {
              console.error('❌ Middleware: privacy agreement check failed:', agreementError);
              // 如果查询失败，重定向到隐私条款页面（安全优先）
              console.log('⚠️  Middleware: 数据库查询失败，重定向到隐私条款页面');
              const privacyUrl = new URL('/privacy-agreement', request.url);
              privacyUrl.searchParams.set('returnUrl', pathname);
              privacyUrl.searchParams.set('error', 'db_error');
              return NextResponse.redirect(privacyUrl);
            }

            // 如果没有找到同意记录，说明未同意隐私条款
            if (!agreementData) {
              console.log('📋 Middleware: user has not agreed to privacy policy, redirecting to privacy agreement page');
              const privacyUrl = new URL('/privacy-agreement', request.url);
              privacyUrl.searchParams.set('returnUrl', pathname);
              return NextResponse.redirect(privacyUrl);
            }

            console.log('✅ Middleware: privacy agreement check passed');
          } catch (error) {
            console.error('❌ Middleware: privacy agreement check error:', error);
            // 如果检查失败，重定向到隐私条款页面（安全优先）
            console.log('⚠️  Middleware: 隐私条款检查失败，重定向到隐私条款页面');
            const privacyUrl = new URL('/privacy-agreement', request.url);
            privacyUrl.searchParams.set('returnUrl', pathname);
            privacyUrl.searchParams.set('error', 'check_error');
            return NextResponse.redirect(privacyUrl);
          }
        }
        
        return response;
      }
      
      // 如果没有完整的认证信息，重定向到登录
      if (isLocalhost) {
        console.log('🚪 Middleware: localhost - no valid authentication, redirecting to local login page for path:', pathname);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
      } else {
        console.log('🚪 Middleware: production - no valid authentication, redirecting to CAS login for path:', pathname);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } catch (error) {
      console.error('❌ Middleware error:', error);
      // 如果会话检查失败，重定向到登录页面
      if (isLocalhost) {
        console.log('❌ Middleware error in localhost, redirecting to local login');
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
      } else {
        console.log('❌ Middleware error in production, redirecting to CAS login');
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
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
