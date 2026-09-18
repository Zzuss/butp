import { SessionOptions } from 'iron-session';

export interface SessionData {
  userId: string;           // 学号
  userHash: string;         // 学号哈希值  
  name: string;             // 姓名  
  isLoggedIn: boolean;      // 是否已登录
  isCasAuthenticated: boolean; // 是否通过CAS认证
  loginTime: number;        // 登录时间
  lastActiveTime: number;   // 最后活跃时间
  casSignedState?: string;  // 由本站签发的CAS登录状态
  casSignedStartedAt?: number; // 本站签发状态的时间
}

// 会话超时配置 (30分钟 = 30 * 60 * 1000 毫秒)
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30分钟

// 默认会话数据（导出以供将来使用）
export const defaultSession: SessionData = {
  userId: '',
  userHash: '',
  name: '',
  isLoggedIn: false,
  isCasAuthenticated: false,
  loginTime: 0,
  lastActiveTime: 0,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET_KEY || 'your-super-secret-session-key-at-least-32-chars-long-for-iron-session-security',
  cookieName: 'butp-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // 生产环境使用HTTPS
    sameSite: 'lax',
    maxAge: SESSION_TIMEOUT_MS / 1000, // 30分钟，以秒为单位
    path: '/', // 明确设置路径
  },
};

// 会话超时检查函数
// 🔧 修复说明：此函数检查本地会话是否超过30分钟无活动
// 当检测到超时时，系统会强制执行完整的CAS logout流程，确保CAS服务器端也清除认证状态
export function isSessionExpired(session: SessionData): boolean {
  // 🔧 关键修复：如果用户已经通过CAS认证但没有lastActiveTime，不应该视为过期
  // 这种情况通常发生在页面关闭后重新打开，此时应该保持认证状态
  if (!session.lastActiveTime) {
    // 如果有CAS认证信息，使用loginTime作为lastActiveTime
    if (session.isCasAuthenticated && session.loginTime > 0) {
      console.log('⚠️ Session timeout check: No lastActiveTime but has CAS auth, using loginTime as fallback');
      // 不要直接修改session对象，而是用loginTime作为参考时间
      const referenceTime = session.loginTime;
      const now = Date.now();
      const timeSinceLogin = now - referenceTime;
      const isExpired = timeSinceLogin > SESSION_TIMEOUT_MS;
      
      console.log('🕒 Session timeout check (using loginTime):', {
        loginTime: new Date(referenceTime).toISOString(),
        currentTime: new Date(now).toISOString(),
        timeSinceLogin: Math.round(timeSinceLogin / 1000 / 60) + ' minutes',
        timeoutThreshold: SESSION_TIMEOUT_MS / 1000 / 60 + ' minutes',
        isExpired: isExpired
      });
      
      return isExpired;
    } else {
      console.log('⚠️ Session timeout check: No lastActiveTime and no CAS auth, treating as expired');
      return true;
    }
  }
  
  const now = Date.now();
  const timeSinceLastActive = now - session.lastActiveTime;
  const isExpired = timeSinceLastActive > SESSION_TIMEOUT_MS;
  
  console.log('🕒 Session timeout check:', {
    lastActiveTime: new Date(session.lastActiveTime).toISOString(),
    currentTime: new Date(now).toISOString(),
    timeSinceLastActive: Math.round(timeSinceLastActive / 1000 / 60) + ' minutes',
    timeoutThreshold: SESSION_TIMEOUT_MS / 1000 / 60 + ' minutes',
    isExpired: isExpired
  });
  
  if (isExpired) {
    console.log('🚨 Session has expired! Time since last active (' + Math.round(timeSinceLastActive / 1000 / 60) + ' min) > threshold (' + (SESSION_TIMEOUT_MS / 1000 / 60) + ' min)');
  } else {
    console.log('✅ Session is still valid. Remaining time: ' + Math.round((SESSION_TIMEOUT_MS - timeSinceLastActive) / 1000 / 60) + ' minutes');
  }
  
  return isExpired;
}

// 更新会话活跃时间
export function updateSessionActivity(session: SessionData): void {
  session.lastActiveTime = Date.now();
}

// 获取会话剩余时间（毫秒）
export function getSessionRemainingTime(session: SessionData): number {
  if (!session.isLoggedIn || !session.lastActiveTime) {
    return 0;
  }
  
  const now = Date.now();
  const timeSinceLastActive = now - session.lastActiveTime;
  const remainingTime = SESSION_TIMEOUT_MS - timeSinceLastActive;
  
  return Math.max(0, remainingTime);
}
