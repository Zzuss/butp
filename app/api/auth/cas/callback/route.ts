import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { validateCasTicket } from '@/lib/cas';
import { SessionData, sessionOptions } from '@/lib/session';
import { getHashByStudentNumber, isValidStudentHashInDatabase } from '@/lib/student-data';
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

    console.log('CAS callback: ticket validation successful, checking student mapping');

    // 🆕 必须从学号哈希映射表中查找对应的哈希值
    let userHash: string | null = null;
    
    try {
      userHash = await getHashByStudentNumber(casUser.userId);
      console.log('CAS callback: mapping table lookup result:', { 
        studentNumber: casUser.userId, 
        foundHash: userHash ? 'yes' : 'no' 
      });
      
      if (userHash) {
        // 验证找到的哈希值是否在数据库中有效
        const isValidInDatabase = await isValidStudentHashInDatabase(userHash);
        if (!isValidInDatabase) {
          console.error('CAS callback: hash found in mapping table but not valid in database');
          return NextResponse.redirect(new URL('/login?error=invalid_mapping&message=您的学号映射信息无效，请联系管理员', request.url));
        }
        console.log('CAS callback: found valid hash in mapping table, proceeding with auto-login');
      } else {
        // 没有找到映射，拒绝登录
        console.error('CAS callback: no mapping found for student number:', casUser.userId);
        return NextResponse.redirect(new URL('/login?error=no_mapping&message=您的学号未在系统中注册，请联系管理员添加权限', request.url));
      }
    } catch (error) {
      console.error('CAS callback: error looking up hash from mapping table:', error);
      return NextResponse.redirect(new URL('/login?error=mapping_error&message=查询学号映射时发生错误，请重试或联系管理员', request.url));
    }

    console.log('CAS callback: mapping validation successful, proceeding with login');

    // 修复: 先创建response用于session设置  
    const response = new NextResponse();
    
    // 获取session并设置数据
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    const now = Date.now();
    session.userId = casUser.userId; // 原始学号
    session.userHash = userHash; // 从映射表获取的哈希值
    session.name = casUser.name || `学生${casUser.userId}`; // CAS返回的真实姓名
    session.isCasAuthenticated = true;
    session.isLoggedIn = true; // 直接设置为已登录
    session.loginTime = now;
    session.lastActiveTime = now; // 设置最后活跃时间
    
    console.log('CAS callback: creating session with data:', {
      userId: session.userId,
      userHash: session.userHash,
      name: session.name,
      isCasAuthenticated: session.isCasAuthenticated,
      isLoggedIn: session.isLoggedIn,
      loginTime: session.loginTime,
      lastActiveTime: session.lastActiveTime
    });
    
    await session.save();
    console.log('CAS callback: session saved successfully');

    // 修复: session保存后创建重定向响应
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));
    
    // 复制session cookie到重定向响应
    const sessionCookies = response.headers.get('set-cookie');
    if (sessionCookies) {
      redirectResponse.headers.set('set-cookie', sessionCookies);
    }

    // 清除可能存在的返回URL cookie
    redirectResponse.cookies.set('cas-return-url', '', {
      expires: new Date(0),
      path: '/'
    });
    
    console.log('CAS callback: auto-login successful, redirecting to dashboard');
    return redirectResponse;
      
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