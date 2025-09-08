import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
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
      timestamp: new Date().toISOString()
    };
    
    console.log('Session debug:', sessionInfo);
    
    return NextResponse.json({
      success: true,
      session: sessionInfo,
      cookieHeader: request.headers.get('cookie') || 'no cookies',
      userAgent: request.headers.get('user-agent') || 'no user agent'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
