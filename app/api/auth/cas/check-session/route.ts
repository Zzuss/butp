import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    console.log('Check CAS session: checking session');
    
    const response = NextResponse.json({ temp: true });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    console.log('Check CAS session: session data:', {
      isLoggedIn: session.isLoggedIn,
      isCasAuthenticated: session.isCasAuthenticated,
      userId: session.userId,
      userHash: session.userHash,
      name: session.name,
      loginTime: session.loginTime
    });
    
    // 返回session状态信息
    return NextResponse.json({
      userId: session.userId || '',
      userHash: session.userHash || '',
      name: session.name || '',
      isLoggedIn: session.isLoggedIn || false,
      isCasAuthenticated: session.isCasAuthenticated || false,
      loginTime: session.loginTime || 0,
    });

  } catch (error) {
    console.error('Error checking CAS session:', error);
    return NextResponse.json(
      { error: 'Failed to check session' },
      { status: 500 }
    );
  }
} 