import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions, isSessionExpired } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({});
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    const sessionDebugInfo = {
      userId: session.userId,
      userHash: session.userHash ? session.userHash.substring(0, 8) + '...' : '',
      name: session.name,
      isLoggedIn: session.isLoggedIn,
      isCasAuthenticated: session.isCasAuthenticated,
      loginTime: session.loginTime ? new Date(session.loginTime).toISOString() : null,
      lastActiveTime: session.lastActiveTime ? new Date(session.lastActiveTime).toISOString() : null,
      currentTime: new Date().toISOString(),
      timeSinceLastActive: session.lastActiveTime ? 
        Math.round((Date.now() - session.lastActiveTime) / 1000 / 60) + ' minutes' : 'N/A',
      isExpired: isSessionExpired(session),
      sessionTimeoutThreshold: '30 minutes'
    };
    
    return NextResponse.json({
      success: true,
      session: sessionDebugInfo
    });
    
  } catch (error) {
    console.error('Error in debug-session GET:', error);
    return NextResponse.json(
      { error: 'Failed to get session info' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, lastActiveTime } = body;
    
    if (action === 'simulate_timeout' && lastActiveTime) {
      const response = NextResponse.json({ success: true });
      const session = await getIronSession<SessionData>(request, response, sessionOptions);
      
      // 模拟设置超时时间
      session.lastActiveTime = lastActiveTime;
      await session.save();
      
      console.log('🧪 Debug: Simulated timeout - set lastActiveTime to:', new Date(lastActiveTime).toISOString());
      
      return response;
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error in debug-session POST:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
} 