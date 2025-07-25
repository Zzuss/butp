import { SessionOptions } from 'iron-session';

export interface SessionData {
  userId: string;           // 学号
  userHash: string;         // 学号哈希值  
  name: string;             // 姓名  
  isLoggedIn: boolean;      // 是否已登录
  isCasAuthenticated: boolean; // 是否通过CAS认证
  loginTime: number;        // 登录时间
}

// 默认会话数据（导出以供将来使用）
export const defaultSession: SessionData = {
  userId: '',
  userHash: '',
  name: '',
  isLoggedIn: false,
  isCasAuthenticated: false,
  loginTime: 0,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET_KEY || 'your-super-secret-session-key-at-least-32-chars-long',
  cookieName: 'butp-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}; 