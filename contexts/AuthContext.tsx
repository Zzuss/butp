'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

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
  const pathname = usePathname(); // 监听路由变化

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

  // 监听页面关闭事件，重定向到CAS logout
  const handleBeforeUnload = () => {
    console.log('🚨 页面关闭检测 - beforeunload事件触发');
    
    // 只清除本地session，不依赖CAS服务器登出
    // 因为页面关闭时网络请求可能无法完成
    const beaconSuccess = navigator.sendBeacon('/api/auth/cas/logout');
    console.log('📡 本地session清除结果:', beaconSuccess);
    
    // 不再尝试CAS服务器登出，因为时间限制可能导致失败
    // 改为依赖会话超时和定期检查机制
  };

  // 添加页面关闭监听器
  window.addEventListener('beforeunload', handleBeforeUnload);

  // 更可靠的方案：定期检查会话状态和清理
  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;
    
    // 每30秒检查一次会话状态
    const checkSessionStatus = async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.log('🔄 会话已失效，需要重新认证');
          // 会话失效时，清除CAS服务器状态
          window.location.href = 'https://auth.bupt.edu.cn/authserver/logout?service=https%3A%2F%2Fbutp.tech';
        }
      } catch (error) {
        console.error('❌ 会话检查失败:', error);
      }
    };
    
    // 启动定期检查
    sessionCheckInterval = setInterval(checkSessionStatus, 30000); // 30秒检查一次
    
    // 页面可见性变化时也检查
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔍 页面重新可见，检查会话状态');
        checkSessionStatus();
      } else if (document.visibilityState === 'hidden') {
        console.log('🔍 页面隐藏检测 - visibilitychange事件触发');
        // 只清除本地session
        navigator.sendBeacon('/api/auth/cas/logout');
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    // 页面卸载时只做最小化操作
    const handlePageHide = () => {
      console.log('📤 页面卸载检测 - pagehide事件触发');
      // 只清除本地session，不依赖网络请求
      navigator.sendBeacon('/api/auth/cas/logout');
    };

    window.addEventListener('pagehide', handlePageHide);

    // 清理函数
    return () => {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    }
  }, [pathname]);

  // 30分钟无活动计时器保持不变
  useEffect(() => {
    refreshUser();

    let inactivityTimer: NodeJS.Timeout;
    
    // 重置无活动计时器
    const resetInactivityTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      console.log('重置30分钟无访问计时器 - 路径:', pathname);
      
      // 30分钟后自动退出到CAS logout
      inactivityTimer = setTimeout(() => {
        console.log('30分钟无页面访问，自动退出到CAS logout');
        window.location.href = 'https://auth.bupt.edu.cn/authserver/logout?service=https%3A%2F%2Fbutp.tech';
      }, 30 * 60 * 1000); // 30分钟
    };

    // 初始启动计时器
    resetInactivityTimer();

    // 清理函数
    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    }
  }, [pathname]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
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