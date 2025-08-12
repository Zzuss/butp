import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { validateCasTicket } from '@/lib/cas';
import { SessionData, sessionOptions } from '@/lib/session';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticket = searchParams.get('ticket');
    const username = searchParams.get('username'); // Mock CAS可能传递用户名

    console.log('CAS callback: received params', { ticket, username });

    if (!ticket) {
      console.error('CAS callback: missing ticket parameter');
      return NextResponse.redirect(new URL('/login?error=missing_ticket', request.url));
    }

    console.log('CAS callback: starting ticket validation directly');
    
    // 🆕 直接在 callback 中验证票据，避免额外重定向
    const casUser = await validateCasTicket(ticket, username);
    console.log('CAS callback: validateCasTicket result:', casUser);
    
    if (!casUser) {
      console.error('CAS callback: ticket validation failed');
      // 票据验证失败，重定向到登录页面并显示友好错误信息
      return NextResponse.redirect(new URL('/login?error=ticket_expired&message=登录票据已过期，请重新登录', request.url));
    }

    console.log('CAS callback: ticket validation successful, creating session');

    // 🆕 直接在这里创建会话，避免额外跳转
    // 生成学号哈希值
    const hash = crypto.createHash('sha256').update(casUser.userId).digest('hex');
    console.log('CAS callback: generated hash for student:', hash);

    // 创建响应对象用于设置 session
    const response = NextResponse.redirect(new URL('/login', request.url));
    
    // 获取session并设置数据
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    const now = Date.now();
    session.userId = casUser.userId; // 原始学号
    session.userHash = hash; // 学号哈希值
    session.name = casUser.name || `学生${casUser.userId}`; // CAS返回的真实姓名
    session.isCasAuthenticated = true;
    session.isLoggedIn = false; // 最终登录在login页面完成
    session.loginTime = now;
    session.lastActiveTime = now; // 设置最后活跃时间
    session.casSessionCheckTime = now; // 设置CAS session检查时间
    
    console.log('CAS callback: creating session with data:', {
      userId: session.userId,
      userHash: session.userHash,
      name: session.name,
      isCasAuthenticated: session.isCasAuthenticated,
      isLoggedIn: session.isLoggedIn,
      loginTime: session.loginTime,
      lastActiveTime: session.lastActiveTime,
      casSessionCheckTime: session.casSessionCheckTime
    });
    
    await session.save();
    console.log('CAS callback: session saved successfully');

    // 清除可能存在的返回URL cookie
    response.cookies.set('cas-return-url', '', {
      expires: new Date(0),
      path: '/'
    });
    
    console.log('CAS callback: redirecting to login page for final authentication');
    return response;
      
  } catch (error) {
    console.error('Error in CAS callback:', error);
    
    // 提供更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('CAS callback: detailed error:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.redirect(new URL('/login?error=auth_failed&message=认证过程中发生错误，请重试', request.url));
  }
} 