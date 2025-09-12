import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    // 创建响应用于session操作
    const response = NextResponse.json({ success: false });
    
    // 获取当前session
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    
    console.log('Auto-login: checking session state:', {
      isCasAuthenticated: session.isCasAuthenticated,
      userId: session.userId,
      userHash: session.userHash ? session.userHash.substring(0, 12) + '...' : null,
      isLoggedIn: session.isLoggedIn
    });
    
    // 验证session状态：必须已通过CAS认证且有完整数据，但还未登录
    if (!session.isCasAuthenticated || !session.userId || !session.userHash) {
      console.error('Auto-login: session incomplete, cannot complete login');
      return NextResponse.json({
        success: false,
        error: 'CAS认证信息不完整'
      });
    }
    
    if (session.isLoggedIn) {
      console.log('Auto-login: user already logged in');
      return NextResponse.json({
        success: true,
        message: '用户已登录'
      });
    }
    
    // 完成登录：设置登录状态
    session.isLoggedIn = true;
    session.lastActiveTime = Date.now();
    
    console.log('Auto-login: completing login for user:', {
      userId: session.userId,
      userHash: session.userHash.substring(0, 12) + '...',
      name: session.name
    });
    
    await session.save();
    
    // 更新响应为成功
    const successResponse = NextResponse.json({
      success: true,
      message: '自动登录完成',
      user: {
        userId: session.userId,
        name: session.name
      }
    });
    
    // 复制session cookies到成功响应
    const sessionCookies = response.headers.getSetCookie();
    sessionCookies.forEach(cookie => {
      successResponse.headers.append('set-cookie', cookie);
    });
    
    console.log('Auto-login: login completed successfully');
    return successResponse;
    
  } catch (error) {
    console.error('Auto-login error:', error);
    return NextResponse.json({
      success: false,
      error: '自动登录失败'
    }, { status: 500 });
  }
}
