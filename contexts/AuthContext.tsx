'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';

// 用户信息接口
export interface User {
  userId: string;
  userHash: string;
  name: string;
  isLoggedIn: boolean;
  isCasAuthenticated: boolean;
  loginTime: number;
  lastActiveTime: number;
}

// AuthContext接口
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (returnUrl?: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  checkCasSession: () => Promise<boolean>;
}

// 创建Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider Props
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider组件
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const casCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 检查CAS session状态
  const checkCasSession = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔍 Checking CAS session status...');
      
      const response = await fetch('/api/auth/cas/check-session', {
        method: 'GET',
        credentials: 'include',
      });

      const result = await response.json();
      
      if (!result.isValid) {
        console.log('❌ CAS session invalid:', result.error);
        
        // CAS session过期，清除本地用户状态
        setUser(null);
        
        // 如果需要重定向到登录页
        if (result.shouldRedirect) {
          console.log('🔄 Redirecting to login due to CAS session expiry');
          window.location.href = '/login?error=cas_session_expired';
        }
        
        return false;
      }
      
      console.log('✅ CAS session valid');
      
      // 更新用户信息（如果有变化）
      if (result.user && user) {
        setUser(prev => prev ? { ...prev, lastActiveTime: Date.now() } : null);
      }
      
      return true;
    } catch (error) {
      console.error('❌ CAS session check failed:', error);
      return false;
    }
  }, [user]);

  // 获取用户信息
  const fetchUser = async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        return userData;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return null;
    }
  };

  // 刷新用户信息
  const refreshUser = async () => {
    setLoading(true);
    try {
      const userData = await fetchUser();
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  // 登录
  const login = (returnUrl?: string) => {
    const loginUrl = returnUrl 
      ? `/api/auth/cas/login?returnUrl=${encodeURIComponent(returnUrl)}`
      : '/api/auth/cas/login';
    window.location.href = loginUrl;
  };

  // 登出
  const logout = () => {
    setUser(null);
    window.location.href = '/api/auth/cas/logout';
  };

  // 初始化时获取用户信息
  useEffect(() => {
    refreshUser();
  }, []);

  // 启动CAS session定期检查
  useEffect(() => {
    // 只有在用户已登录且通过CAS认证时才启动定期检查
    if (!user?.isLoggedIn || !user?.isCasAuthenticated) {
      return;
    }

    console.log('🔄 Starting CAS session periodic check (every 5 minutes)');
    const interval = setInterval(checkCasSession, 5 * 60 * 1000); // 每5分钟检查一次
    casCheckIntervalRef.current = interval;

    return () => {
      if (casCheckIntervalRef.current) {
        console.log('🛑 Stopping CAS session periodic check');
        clearInterval(casCheckIntervalRef.current);
        casCheckIntervalRef.current = null;
      }
    };
  }, [user?.isLoggedIn, user?.isCasAuthenticated, checkCasSession]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    checkCasSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth Hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 