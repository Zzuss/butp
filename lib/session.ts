import { SessionOptions } from 'iron-session';

export interface SessionData {
  userId: string;           // 学号
  userHash: string;         // 学号哈希值  
  name: string;             // 姓名  
  isLoggedIn: boolean;      // 是否已登录
  isCasAuthenticated: boolean; // 是否通过CAS认证
  loginTime: number;        // 登录时间
  lastActiveTime: number;   // 最后活跃时间
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
    // 不设置maxAge，session会在浏览器关闭时自动清除
    path: '/', // 明确设置路径
  },
};

// 会话超时检查函数
// 🔧 修复说明：此函数检查本地会话是否超过30分钟无活动
// 当检测到超时时，系统会强制执行完整的CAS logout流程，确保CAS服务器端也清除认证状态
export function isSessionExpired(session: SessionData): boolean {
  // 如果没有lastActiveTime，说明从未活跃过，视为过期
  if (!session.lastActiveTime) {
    return true;
  }
  
  const now = Date.now();
  const timeSinceLastActive = now - session.lastActiveTime;
  
  console.log('Session timeout check:', {
    lastActiveTime: new Date(session.lastActiveTime).toISOString(),
    timeSinceLastActive: Math.round(timeSinceLastActive / 1000 / 60) + ' minutes',
    timeoutThreshold: SESSION_TIMEOUT_MS / 1000 / 60 + ' minutes',
    isExpired: timeSinceLastActive > SESSION_TIMEOUT_MS
  });
  
  return timeSinceLastActive > SESSION_TIMEOUT_MS;
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