import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { SessionData, sessionOptions, isSessionExpired } from '@/lib/session'

// GET - 检查当前session状态
export async function GET(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(request, NextResponse.next(), sessionOptions)
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      url: request.url,
      cookies: request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value })),
      session: {
        isLoggedIn: session.isLoggedIn,
        userHash: session.userHash,
        username: session.username,
        realName: session.realName,
        loginTime: session.loginTime,
        lastActivity: session.lastActivity,
        isExpired: session.loginTime ? isSessionExpired(session) : null,
        sessionAge: session.loginTime ? 
          Math.round((Date.now() - new Date(session.loginTime).getTime()) / 1000 / 60) : null, // 分钟
        lastActivityAge: session.lastActivity ? 
          Math.round((Date.now() - new Date(session.lastActivity).getTime()) / 1000 / 60) : null // 分钟
      },
      middlewareChecks: {
        // 检查各种路径是否需要隐私条款检查
        dashboardNeedsCheck: checkPathNeedsPrivacy('/dashboard'),
        profileNeedsCheck: checkPathNeedsPrivacy('/profile'),
        gradesNeedsCheck: checkPathNeedsPrivacy('/grades'),
        analysisNeedsCheck: checkPathNeedsPrivacy('/analysis'),
        chartsNeedsCheck: checkPathNeedsPrivacy('/charts'),
        roleModelsNeedsCheck: checkPathNeedsPrivacy('/role-models'),
        // 检查豁免路径
        privacyAgreementExempt: checkPathExempt('/privacy-agreement'),
        loginExempt: checkPathExempt('/login'),
        rootExempt: checkPathExempt('/'),
        apiAuthExempt: checkPathExempt('/api/auth')
      }
    }

    return NextResponse.json({
      success: true,
      diagnostics
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 })
  }
}

// 检查路径是否需要隐私条款检查
function checkPathNeedsPrivacy(pathname: string): boolean {
  const PROTECTED_PATHS = [
    '/profile',
    '/dashboard',
    '/grades',
    '/analysis',
    '/charts',
    '/role-models'
  ]

  const PRIVACY_EXEMPT_PATHS = [
    '/privacy-agreement',
    '/login',
    '/admin-login',
    '/',
    '/api/auth',
    '/api/mock',
    '/auth-status',
    '/testsupa'
  ]

  const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path))
  const isExempt = PRIVACY_EXEMPT_PATHS.some(path => 
    pathname === path || pathname.startsWith(path)
  )

  return isProtected && !isExempt
}

// 检查路径是否豁免
function checkPathExempt(pathname: string): boolean {
  const PRIVACY_EXEMPT_PATHS = [
    '/privacy-agreement',
    '/login',
    '/admin-login',
    '/',
    '/api/auth',
    '/api/mock',
    '/auth-status',
    '/testsupa'
  ]

  return PRIVACY_EXEMPT_PATHS.some(path => 
    pathname === path || pathname.startsWith(path)
  )
}
