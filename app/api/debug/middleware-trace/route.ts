import { NextRequest, NextResponse } from 'next/server'

// GET - 模拟middleware逻辑来追踪问题
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const testPath = url.searchParams.get('path') || '/dashboard'
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    testPath,
    middlewareSimulation: {} as any
  }

  try {
    // 模拟middleware逻辑
    const pathname = testPath
    
    // 1. 检查是否是受保护路径
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

    const isProtectedPath = PROTECTED_PATHS.some(path => pathname.startsWith(path))
    const isPublicPath = PRIVACY_EXEMPT_PATHS.some(path => 
      pathname === path || pathname.startsWith(path)
    )

    diagnostics.middlewareSimulation.pathChecks = {
      pathname,
      isProtectedPath,
      isPublicPath,
      shouldCheckAuth: isProtectedPath && !isPublicPath
    }

    if (!isProtectedPath || isPublicPath) {
      diagnostics.middlewareSimulation.result = {
        action: 'ALLOW',
        reason: isPublicPath ? 'Public path' : 'Non-protected path'
      }
      return NextResponse.json({ success: true, diagnostics })
    }

    // 2. 检查session cookie
    const sessionCookie = request.cookies.get('butp-session')
    diagnostics.middlewareSimulation.sessionCheck = {
      hasSessionCookie: !!sessionCookie,
      cookieLength: sessionCookie?.value?.length || 0
    }

    if (!sessionCookie) {
      diagnostics.middlewareSimulation.result = {
        action: 'REDIRECT_TO_LOGIN',
        reason: 'No session cookie'
      }
      return NextResponse.json({ success: true, diagnostics })
    }

    // 3. 检查隐私条款
    const needsPrivacyCheck = isProtectedPath && !isPublicPath
    diagnostics.middlewareSimulation.privacyCheck = {
      needsPrivacyCheck,
      reason: needsPrivacyCheck ? 'Protected path requires privacy check' : 'No privacy check needed'
    }

    if (needsPrivacyCheck) {
      // 模拟隐私条款检查流程
      diagnostics.middlewareSimulation.privacyCheckFlow = {
        step1: 'Would check Storage for privacy policy file',
        step2: 'Would check user agreement in database',
        step3: 'Would redirect to /privacy-agreement if no agreement found'
      }

      diagnostics.middlewareSimulation.result = {
        action: 'SHOULD_CHECK_PRIVACY',
        reason: 'Protected path with valid session - privacy check required'
      }
    } else {
      diagnostics.middlewareSimulation.result = {
        action: 'ALLOW',
        reason: 'Valid session and no privacy check needed'
      }
    }

    // 4. 检查当前用户的cookie详情
    const allCookies = request.cookies.getAll()
    diagnostics.middlewareSimulation.cookieDetails = {
      totalCookies: allCookies.length,
      cookieNames: allCookies.map(c => c.name),
      sessionCookieExists: allCookies.some(c => c.name === 'butp-session'),
      adminCookieExists: allCookies.some(c => c.name === 'admin-session')
    }

    return NextResponse.json({ success: true, diagnostics })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      diagnostics
    }, { status: 500 })
  }
}
