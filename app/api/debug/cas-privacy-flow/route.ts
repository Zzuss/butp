import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { SessionData, sessionOptions } from '@/lib/session'

export async function GET(request: NextRequest) {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    step1_sessionCheck: {} as any,
    step2_privacyApiCall: {} as any,
    step3_privacyApiResponse: {} as any,
    conclusion: '' as string
  }

  try {
    // 步骤1：检查session状态
    console.log('🔍 调试：开始检查CAS登录后的隐私条款流程...')
    
    const response = NextResponse.next()
    const session = await getIronSession<SessionData>(request, response, sessionOptions)
    
    debugInfo.step1_sessionCheck = {
      hasSession: !!session,
      isLoggedIn: session.isLoggedIn,
      isCasAuthenticated: session.isCasAuthenticated,
      userId: session.userId,
      userHash: session.userHash ? session.userHash.substring(0, 12) + '...' : null,
      name: session.name,
      loginTime: session.loginTime ? new Date(session.loginTime).toISOString() : null,
      lastActiveTime: session.lastActiveTime ? new Date(session.lastActiveTime).toISOString() : null
    }

    console.log('🔍 调试：Session状态:', debugInfo.step1_sessionCheck)

    if (!session.isLoggedIn || !session.userHash) {
      debugInfo.conclusion = '❌ Session无效：用户未登录或缺少userHash'
      return NextResponse.json({ success: false, debugInfo })
    }

    // 步骤2：模拟调用隐私条款API
    console.log('🔍 调试：模拟调用隐私条款API...')
    
    try {
      const privacyResponse = await fetch(new URL('/api/auth/privacy-agreement', request.url).toString(), {
        method: 'GET',
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
          'Content-Type': 'application/json'
        }
      })

      debugInfo.step2_privacyApiCall = {
        status: privacyResponse.status,
        statusText: privacyResponse.statusText,
        ok: privacyResponse.ok
      }

      if (privacyResponse.ok) {
        const privacyData = await privacyResponse.json()
        debugInfo.step3_privacyApiResponse = privacyData

        console.log('🔍 调试：隐私条款API响应:', privacyData)

        if (privacyData.hasAgreed) {
          debugInfo.conclusion = '✅ 用户已同意隐私条款，应该跳转到dashboard'
        } else {
          debugInfo.conclusion = '⚠️ 用户未同意隐私条款，应该跳转到隐私条款页面'
        }
      } else {
        const errorText = await privacyResponse.text()
        debugInfo.step3_privacyApiResponse = { error: errorText }
        debugInfo.conclusion = '❌ 隐私条款API调用失败：' + errorText
      }

    } catch (apiError) {
      debugInfo.step2_privacyApiCall = { error: (apiError as Error).message }
      debugInfo.conclusion = '❌ 隐私条款API调用异常：' + (apiError as Error).message
    }

    return NextResponse.json({ success: true, debugInfo })

  } catch (error) {
    debugInfo.conclusion = '❌ 调试过程异常：' + (error as Error).message
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message,
      debugInfo 
    }, { status: 500 })
  }
}
