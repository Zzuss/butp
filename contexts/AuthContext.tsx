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

    // 用于判断是否真正关闭标签页的状态
    let isTabClosing = false;
    let tabCloseTimer: NodeJS.Timeout | null = null;

    // 监听页面关闭事件，只在真正关闭标签页时清除本地session
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('🚨 页面关闭检测 - beforeunload事件触发');
      
      // 标记可能要关闭标签页
      isTabClosing = true;
      
      // 设置一个短暂的延迟来判断是否真的关闭了
      if (tabCloseTimer) {
        clearTimeout(tabCloseTimer);
      }
      
      tabCloseTimer = setTimeout(() => {
        console.log('⏰ beforeunload后2秒未检测到focus，确认为关闭标签页');
        // 只清除本地session，不调用CAS服务器登出
        // 这样CAS服务器保持认证状态，30分钟内重新打开可以快速重新认证
        navigator.sendBeacon('/api/auth/cas/logout');
        isTabClosing = false;
      }, 2000); // 2秒延迟判断
    };

    // 监听窗口重新获得焦点（说明没有真正关闭）
    const handleFocus = () => {
      if (isTabClosing && tabCloseTimer) {
        console.log('🎯 窗口重新获得焦点，取消关闭标签页操作');
        clearTimeout(tabCloseTimer);
        isTabClosing = false;
      }
    };

    // 监听页面可见性变化，但只作为备用机制
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面重新可见，取消关闭操作
        if (isTabClosing && tabCloseTimer) {
          console.log('👁️ 页面重新可见，取消关闭标签页操作');
          clearTimeout(tabCloseTimer);
          isTabClosing = false;
        }
      } else if (document.visibilityState === 'hidden') {
        console.log('🔍 页面隐藏检测 - visibilitychange事件触发（不执行登出）');
        // 不在这里执行登出操作，因为切换标签页也会触发
      }
    };

    // 页面卸载事件（最后的保障，仅在确实关闭时执行）
    const handlePageHide = (event: PageTransitionEvent) => {
      // 只有在persisted为false时才表示真正的页面卸载
      if (!event.persisted) {
        console.log('📤 页面真正卸载检测 - pagehide事件触发');
        // 只清除本地session
        navigator.sendBeacon('/api/auth/cas/logout');
      }
    };

    // 添加事件监听器
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    // 清理函数
    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      if (tabCloseTimer) {
        clearTimeout(tabCloseTimer);
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
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