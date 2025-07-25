"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface AuthStatus {
  userId: string;
  userHash: string;
  name: string;
  isLoggedIn: boolean;
  isCasAuthenticated: boolean;
  loginTime: number;
}

export default function AuthStatusPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const [userInfo, setUserInfo] = useState<AuthStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkAuthStatus = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 检查CAS session状态
      const casResponse = await fetch('/api/auth/cas/check-session', {
        credentials: 'include',
      });
      
      if (casResponse.ok) {
        const casData = await casResponse.json();
        setAuthStatus(casData);
      }

      // 检查用户信息
      const userResponse = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserInfo(userData);
      } else {
        setUserInfo(null);
      }
      
    } catch (err) {
      setError('检查认证状态失败');
      console.error('Auth status check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const testCasLogin = () => {
    window.location.href = '/api/auth/cas/login?returnUrl=/auth-status';
  };

  const testLogout = () => {
    window.location.href = '/api/auth/cas/logout';
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const getStatusBadge = (status: boolean, label: string) => {
    return (
      <Badge variant={status ? "default" : "secondary"} className="gap-1">
        {status ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        {label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">CAS认证状态检查</h1>
          <p className="text-muted-foreground">用于调试和测试CAS认证流程</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-center gap-4">
          <Button onClick={checkAuthStatus} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新状态
          </Button>
          <Button onClick={testCasLogin}>
            测试CAS登录
          </Button>
          <Button onClick={testLogout} variant="destructive">
            登出
          </Button>
        </div>

        {error && (
          <div className="flex items-center justify-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* CAS Session状态 */}
          <Card>
            <CardHeader>
              <CardTitle>CAS Session状态</CardTitle>
              <CardDescription>来自 /api/auth/cas/check-session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {authStatus ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>CAS认证状态:</span>
                    {getStatusBadge(authStatus.isCasAuthenticated, authStatus.isCasAuthenticated ? 'CAS已认证' : 'CAS未认证')}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>登录状态:</span>
                    {getStatusBadge(authStatus.isLoggedIn, authStatus.isLoggedIn ? '已登录' : '未登录')}
                  </div>
                  {authStatus.userId && (
                    <div>
                      <p className="text-sm font-medium">学号: {authStatus.userId}</p>
                    </div>
                  )}
                  {authStatus.userHash && (
                    <div>
                      <p className="text-sm font-medium">学号哈希:</p>
                      <p className="text-xs text-muted-foreground break-all">{authStatus.userHash}</p>
                    </div>
                  )}
                  {authStatus.name && (
                    <div>
                      <p className="text-sm font-medium">姓名: {authStatus.name}</p>
                    </div>
                  )}
                  {authStatus.loginTime > 0 && (
                    <div>
                      <p className="text-sm font-medium">登录时间:</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(authStatus.loginTime).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">无认证信息</p>
              )}
            </CardContent>
          </Card>

          {/* 用户信息状态 */}
          <Card>
            <CardHeader>
              <CardTitle>用户信息状态</CardTitle>
              <CardDescription>来自 /api/auth/user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userInfo ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>API认证状态:</span>
                    {getStatusBadge(true, '已认证')}
                  </div>
                  <div>
                    <p className="text-sm font-medium">学号: {userInfo.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">学号哈希:</p>
                    <p className="text-xs text-muted-foreground break-all">{userInfo.userHash}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">姓名: {userInfo.name}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>CAS认证:</span>
                    {getStatusBadge(userInfo.isCasAuthenticated, userInfo.isCasAuthenticated ? '已认证' : '未认证')}
                  </div>
                  <div>
                    <p className="text-sm font-medium">登录时间:</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(userInfo.loginTime).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>API认证状态:</span>
                    {getStatusBadge(false, '未认证')}
                  </div>
                  <p className="text-muted-foreground">用户未登录或认证失败</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 认证流程说明 */}
        <Card>
          <CardHeader>
            <CardTitle>认证流程说明</CardTitle>
            <CardDescription>CAS认证到哈希值登录的完整流程</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>用户访问受保护的网址时，middleware检查认证状态</li>
              <li>未认证用户被重定向到CAS登录: <code>/api/auth/cas/login</code></li>
              <li>CAS认证成功后回调: <code>/api/auth/cas/callback</code></li>
              <li>验证ticket并存储session: <code>/api/auth/cas/verify</code></li>
              <li>将学号转换为哈希值并存储在session中</li>
              <li>重定向到登录页面: <code>/login</code></li>
              <li>登录页面检查CAS认证状态并自动完成登录</li>
              <li>登录成功后跳转到dashboard或原始目标页面</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 