"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TestSessionPage() {
  const [sessionData, setSessionData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [cookies, setCookies] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  const checkSession = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/cas/check-session', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSessionData(data);
      } else {
        setSessionData({ error: `HTTP ${response.status}` });
      }
    } catch (error) {
      setSessionData({ error: error instanceof Error ? error.message : '未知错误' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    checkSession();
    if (typeof window !== 'undefined') {
      setCookies(document.cookie);
    }
  }, []);

  const clearCookies = () => {
    // 清除所有cookies
    if (typeof window !== 'undefined') {
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      setCookies('');
      alert('Cookies已清除，请刷新页面');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Session状态测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={checkSession} disabled={loading}>
              {loading ? "检查中..." : "刷新Session状态"}
            </Button>
            <Button onClick={clearCookies} variant="outline">
              清除Cookies
            </Button>
          </div>

          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-bold mb-2">当前Session数据：</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(sessionData, null, 2)}
            </pre>
          </div>

          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-bold mb-2">浏览器Cookies：</h3>
            <pre className="text-sm overflow-auto">
              {mounted ? (cookies || '无cookies') : '加载中...'}
            </pre>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={() => window.location.href = '/api/auth/cas/login'}
              className="w-full"
            >
              重新进行CAS登录
            </Button>
            <Button 
              onClick={() => window.location.href = '/login'}
              variant="outline"
              className="w-full"
            >
              返回登录页面
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 