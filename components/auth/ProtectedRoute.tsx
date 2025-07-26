'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoginButton } from './LoginButton';
import { usePathname } from 'next/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 如果用户未登录，显示登录界面
  if (!user || !user.isLoggedIn) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">需要登录</h2>
          <p className="text-muted-foreground">
            请使用北邮统一认证登录以访问此页面
          </p>
          <LoginButton returnUrl={pathname} />
        </div>
      </div>
    );
  }

  // 用户已登录，显示受保护的内容
  return <>{children}</>;
} 