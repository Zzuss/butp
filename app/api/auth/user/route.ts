import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { 
  SessionData, 
  sessionOptions, 
  isSessionExpired, 
  isSessionNearExpiry, 
  updateSessionActivity, 
  getSessionRemainingTime,
  defaultSession 
} from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    console.log('User API: checking session');
    console.log('User API: cookies:', request.cookies.getAll().map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })));
    
    const response = NextResponse.json({ temp: true });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    console.log('User API: session data:', {
      isLoggedIn: session.isLoggedIn,
      isCasAuthenticated: session.isCasAuthenticated,
      userId: session.userId,
      userHash: session.userHash,
      name: session.name,
      loginTime: session.loginTime,
      lastActiveTime: session.lastActiveTime
    });
    
    // 检查用户是否已登录
    if (!session.isLoggedIn) {
      console.log('User API: user not logged in');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 🆕 检查会话是否过期
    if (isSessionExpired(session)) {
      console.log('User API: session expired, logging out');
      
      // 清除会话数据
      Object.assign(session, defaultSession);
      await session.save();
      
      return NextResponse.json(
        { 
          error: 'Session expired', 
          reason: 'TIMEOUT',
          message: '会话已过期，请重新登录'
        },
        { status: 401 }
      );
    }

    // 🆕 更新最后活跃时间
    updateSessionActivity(session);
    await session.save();
    
    console.log('User API: session activity updated');

    // 返回用户信息
    console.log('User API: returning user info');
    return NextResponse.json({
      userId: session.userId,
      userHash: session.userHash,
      name: session.name,
      isLoggedIn: session.isLoggedIn,
      isCasAuthenticated: session.isCasAuthenticated,
      loginTime: session.loginTime,
      lastActiveTime: session.lastActiveTime
    });

  } catch (error) {
    console.error('Error getting user info:', error);
    return NextResponse.json(
      { error: 'Failed to get user information' },
      { status: 500 }
    );
  }
} 