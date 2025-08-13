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

    // 检查用户是否已登录
    if (!session.isLoggedIn || !session.isCasAuthenticated) {
      console.log('Auth check: user not logged in');
      return NextResponse.json(
        { 
          isLoggedIn: false,
          error: 'Not authenticated'
        },
        { status: 401 }
      );
    }

    console.log('Auth check: user is logged in');
    return NextResponse.json({
      isLoggedIn: true,
      userId: session.userId,
      userHash: session.userHash,
      name: session.name,
      isCasAuthenticated: session.isCasAuthenticated,
      loginTime: session.loginTime
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