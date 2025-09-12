import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    console.log('=== 检查当前session状态 ===');
    
    const response = new NextResponse();
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    const sessionInfo = {
      userId: session.userId || null,
      userHash: session.userHash || null,
      name: session.name || null, 
      isLoggedIn: session.isLoggedIn || false,
      isCasAuthenticated: session.isCasAuthenticated || false,
      loginTime: session.loginTime || null,
      lastActiveTime: session.lastActiveTime || null,
    };
    
    console.log('Session详细信息:', sessionInfo);
    
    // 分析session状态
    let analysis = '';
    if (!sessionInfo.isCasAuthenticated) {
      analysis = 'NO_CAS_AUTH - 用户未通过CAS认证';
    } else if (!sessionInfo.userId) {
      analysis = 'MISSING_USER_ID - CAS认证成功但缺少学号';
    } else if (!sessionInfo.userHash) {
      analysis = 'MISSING_HASH - CAS认证成功但缺少哈希值';  
    } else if (!sessionInfo.isLoggedIn) {
      analysis = 'AUTHENTICATED_BUT_NOT_LOGGED_IN - CAS认证成功，有学号和哈希值，但登录状态为false';
    } else {
      analysis = 'FULLY_LOGGED_IN - 完全登录成功';
    }
    
    return NextResponse.json({
      success: true,
      session: sessionInfo,
      analysis,
      cookies: request.headers.get('cookie') || 'no cookies',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('检查session时发生错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
