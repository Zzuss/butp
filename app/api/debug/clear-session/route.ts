import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: 'Session已清除' });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    // 清除所有session数据
    session.userId = null;
    session.userHash = null;
    session.name = null;
    session.isLoggedIn = false;
    session.isCasAuthenticated = false;
    session.loginTime = null;
    session.lastActiveTime = null;
    
    await session.save();
    
    console.log('Session已完全清除');
    
    return response;
  } catch (error) {
    console.error('清除session失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '清除session失败'
    });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: '使用POST方法清除session',
    usage: 'POST /api/debug/clear-session'
  });
}
