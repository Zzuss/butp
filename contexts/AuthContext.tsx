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

  // 初始化时获取用户信息
  useEffect(() => {
    refreshUser();

    let inactivityTimer: NodeJS.Timeout;
    
    // 重置无活动计时器
    const resetInactivityTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      console.log('重置30分钟无访问计时器 - 路径:', pathname);
      
      // 30分钟后跳转到CAS登出页面
      inactivityTimer = setTimeout(() => {
        console.log('30分钟无页面访问，跳转到CAS登出页面');
        // 跳转到CAS登出页面，这会清除CAS服务器认证并重定向回登录
        window.location.href = '/api/auth/cas/logout';
      }, 30 * 60 * 1000); // 30分钟
    };

    // 初始启动计时器（访问当前页面时重置）
    resetInactivityTimer();

    // 监听页面关闭事件，只删除本地session
    const handleBeforeUnload = () => {
      console.log('🚨 页面关闭检测 - beforeunload事件触发');
      
      // 只清除本地session，不调用CAS服务器登出
      // 这样CAS服务器保持认证状态，30分钟内重新打开可以快速重新认证
      const beaconSuccess = navigator.sendBeacon('/api/auth/cas/logout');
      console.log('📡 本地session清除结果:', beaconSuccess);
      
      // 注释掉CAS服务器登出，让30分钟超时机制处理
      // const casLogoutUrl = 'https://auth.bupt.edu.cn/authserver/logout?service=https%3A%2F%2Fbutp.tech';
      // navigator.sendBeacon(casLogoutUrl);
    }

    // 添加页面关闭监听器
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 添加更可靠的页面隐藏检测
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('🔍 页面隐藏检测 - visibilitychange事件触发');
        
        // 只清除本地session
        fetch('/api/auth/cas/logout', {
          method: 'POST',
          keepalive: true,
          credentials: 'include'
        }).catch(error => {
          console.error('❌ 本地登出请求失败:', error);
        });
        
        // 注释掉CAS服务器登出
        // const casLogoutUrl = 'https://auth.bupt.edu.cn/authserver/logout?service=https%3A%2F%2Fbutp.tech';
        // navigator.sendBeacon(casLogoutUrl);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    // 添加页面卸载事件（作为最后的保障）
    const handlePageHide = () => {
      console.log('📤 页面卸载检测 - pagehide事件触发');
      // 只清除本地session
      navigator.sendBeacon('/api/auth/cas/logout');
      
      // 注释掉CAS服务器登出
      // const casLogoutUrl = 'https://auth.bupt.edu.cn/authserver/logout?service=https%3A%2F%2Fbutp.tech';
      // navigator.sendBeacon(casLogoutUrl);
    };

    window.addEventListener('pagehide', handlePageHide);

    // 清理函数
    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    }
  }, [pathname]); // 依赖于pathname，每次路由变化都会重新运行

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