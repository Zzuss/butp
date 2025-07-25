'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface UserInfoProps {
  className?: string;
}

export function UserInfo({ className }: UserInfoProps) {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 w-32 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (!user || !user.isLoggedIn) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  // 获取用户姓名的首字符作为头像
  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* 简单的头像 */}
      <div className="h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
        {getInitial(user.name)}
      </div>
      
      {/* 用户信息 */}
      <div className="flex flex-col">
        <span className="text-sm font-medium">{user.name}</span>
        <span className="text-xs text-muted-foreground">学号: {user.userId}</span>
      </div>
      
      {/* 登出按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="h-8 w-8 p-0"
        title="退出登录"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
} 