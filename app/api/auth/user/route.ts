import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

    console.log('Auth check: session data:', {
      isLoggedIn: session.isLoggedIn,
      isCasAuthenticated: session.isCasAuthenticated,
      userId: session.userId,
      userHash: session.userHash,
      name: session.name
    });

    // 🔧 修复：与中间件逻辑保持一致，如果有CAS认证信息则自动恢复登录状态
    if (session.userId && session.userHash && session.isCasAuthenticated) {
      // 如果有完整的认证信息但isLoggedIn为false，说明是页面刷新或重新访问
      if (!session.isLoggedIn) {
        console.log('Auth check: restoring login state after page refresh');
        session.isLoggedIn = true;
        
        // 更新活跃时间
        session.lastActiveTime = Date.now();
        await session.save();
      }
      
      console.log('Auth check: user is authenticated');
    } else {
      console.log('Auth check: user not authenticated', {
        hasUserId: !!session.userId,
        hasUserHash: !!session.userHash,
        isCasAuthenticated: session.isCasAuthenticated
      });
      return NextResponse.json(
        { 
          isLoggedIn: false,
          error: 'Not authenticated'
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      isLoggedIn: true,
      userId: session.userId,
      userHash: session.userHash,
      name: session.name,
      isCasAuthenticated: session.isCasAuthenticated,
      loginTime: session.loginTime,
      lastActiveTime: session.lastActiveTime
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { 
        isLoggedIn: false,
        error: 'Session check failed'
      },
      { status: 500 }
    );
  }
} 