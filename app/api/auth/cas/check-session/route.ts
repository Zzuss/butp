import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions, CAS_CHECK_INTERVAL_MS } from '@/lib/session';
import { checkCasSessionStatus } from '@/lib/cas';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 CAS session check started');
    
    // 获取当前session
    const session = await getIronSession<SessionData>(request, NextResponse.next(), sessionOptions);
    
    // 如果用户未登录或未通过CAS认证，直接返回无效
    if (!session.isLoggedIn || !session.isCasAuthenticated) {
      console.log('❌ User not logged in or not CAS authenticated');
      return NextResponse.json({ 
        isValid: false, 
        error: 'User not authenticated',
        shouldRedirect: true,
        redirectUrl: '/login'
      });
    }

    const now = Date.now();
    const timeSinceLastCheck = now - (session.casSessionCheckTime || 0);
    
    // 如果距离上次检查时间不足5分钟，直接返回有效（避免频繁检查）
    if (timeSinceLastCheck < CAS_CHECK_INTERVAL_MS) {
      console.log('⏰ CAS session check skipped - too recent', {
        timeSinceLastCheck: Math.round(timeSinceLastCheck / 1000),
        intervalSeconds: Math.round(CAS_CHECK_INTERVAL_MS / 1000)
      });
      
      // 更新活跃时间
      session.lastActiveTime = now;
      await session.save();
      
      return NextResponse.json({
        isValid: true,
        user: {
          userId: session.userId,
          name: session.name,
          userHash: session.userHash
        },
        skipReason: 'Recent check'
      });
    }

    // 检查CAS服务器端的session状态
    console.log('🌐 Checking CAS server session status...');
    const casStatus = await checkCasSessionStatus();
    console.log('🎯 CAS session status:', casStatus);

    // 更新检查时间
    session.casSessionCheckTime = now;

    if (!casStatus.isValid) {
      // CAS session已过期，清除本地session
      session.destroy();
      
      console.log('🔄 CAS session expired, local session cleared');
      
      return NextResponse.json({
        isValid: false,
        error: casStatus.error || 'CAS session expired',
        shouldRedirect: true,
        redirectUrl: '/login?error=cas_session_expired'
      });
    }

    // CAS session有效，更新本地session的活跃时间
    session.lastActiveTime = now;
    await session.save();

    console.log('✅ CAS session valid, local session updated');
    
    return NextResponse.json({
      isValid: true,
      user: {
        userId: session.userId,
        name: session.name,
        userHash: session.userHash
      }
    });

  } catch (error) {
    console.error('❌ CAS session check error:', error);
    
    return NextResponse.json({
      isValid: false,
      error: 'Session check failed',
      shouldRedirect: true,
      redirectUrl: '/login'
    }, { status: 500 });
  }
} 