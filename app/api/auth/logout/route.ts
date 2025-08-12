import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions, defaultSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    console.log('Logout API: clearing session');
    
    // 获取并清除用户会话
    const response = NextResponse.json({ success: true });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    // 清除会话数据
    session.userId = defaultSession.userId;
    session.userHash = defaultSession.userHash;
    session.name = defaultSession.name;
    session.isLoggedIn = defaultSession.isLoggedIn;
    session.isCasAuthenticated = defaultSession.isCasAuthenticated;
    session.loginTime = defaultSession.loginTime;
    
    await session.save();
    
    console.log('Logout API: session cleared successfully');
    return response;
  } catch (error) {
    console.error('Error in logout API:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
} 