'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

interface LoginButtonProps {
  returnUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

export function LoginButton({ returnUrl, className, children }: LoginButtonProps) {
  const { login, loading } = useAuth();

  const handleLogin = () => {
    if (!loading) {
      login(returnUrl);
    }
  };

  return (
    <Button
      onClick={handleLogin}
      disabled={loading}
      className={className}
      variant="default"
    >
      <LogIn className="mr-2 h-4 w-4" />
      {children || '北邮统一认证登录'}
    </Button>
  );
} 