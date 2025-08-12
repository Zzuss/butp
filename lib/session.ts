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

// 会话超时配置 (2分钟用于测试 = 2 * 60 * 1000 毫秒)
export const SESSION_TIMEOUT_MS = 2 * 60 * 1000; // 2分钟 (测试用)

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
    maxAge: 60 * 60 * 24 * 7, // 7 days (物理cookie过期时间，实际会话由服务端控制)
    path: '/', // 明确设置路径
  },
};

// 会话超时检查函数
export function isSessionExpired(session: SessionData): boolean {
  if (!session.isLoggedIn || !session.lastActiveTime) {
    return true;
  }
  
  const now = Date.now();
  const timeSinceLastActive = now - session.lastActiveTime;
  
  return timeSinceLastActive > SESSION_TIMEOUT_MS;
}

// 会话即将过期检查函数 (已移除，不再需要警告功能)
export function isSessionNearExpiry(session: SessionData): boolean {
  return false; // 始终返回false，不再显示警告
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