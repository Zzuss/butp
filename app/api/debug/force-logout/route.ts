import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    // 创建响应
    const response = NextResponse.json({ 
      success: true, 
      message: '已强制清除所有session数据，请重新进行CAS登录' 
    });
    
    // 获取session并完全清除
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
    
    console.log('Debug: 已强制清除所有session数据');
    
    return response;
    
  } catch (error) {
    console.error('清除session失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
}
