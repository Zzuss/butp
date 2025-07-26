import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { buildCasLogoutUrl } from '@/lib/cas';
import { SessionData, sessionOptions, defaultSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // 获取并清除用户会话
    const response = NextResponse.redirect(buildCasLogoutUrl());
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    // 清除会话数据（匹配新的session结构）
    session.userId = defaultSession.userId;
    session.userHash = defaultSession.userHash;
    session.name = defaultSession.name;
    session.isLoggedIn = defaultSession.isLoggedIn;
    session.isCasAuthenticated = defaultSession.isCasAuthenticated;
    session.loginTime = defaultSession.loginTime;
    
    await session.save();

    return response;
  } catch (error) {
    console.error('Error in CAS logout:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
} 