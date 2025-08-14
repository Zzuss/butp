'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function TestSessionBehavior() {
  const { user, loading } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  // 检查session状态
  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/cas/check-session');
      const data = await response.json();
      setSessionInfo(data);
      addLog(`Session检查: ${JSON.stringify(data)}`);
    } catch (error) {
      addLog(`Session检查失败: ${error}`);
    }
  };

  // 模拟页面隐藏（切换标签页）
  const simulatePageHide = () => {
    addLog('模拟切换到其他标签页...');
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'hidden'
    });
    document.dispatchEvent(new Event('visibilitychange'));
    
    setTimeout(() => {
      addLog('模拟回到当前标签页...');
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible'
      });
      document.dispatchEvent(new Event('visibilitychange'));
    }, 3000);
  };

  // 模拟窗口失去焦点
  const simulateWindowBlur = () => {
    addLog('模拟窗口失去焦点...');
    window.dispatchEvent(new Event('blur'));
    
    setTimeout(() => {
      addLog('模拟窗口重新获得焦点...');
      window.dispatchEvent(new Event('focus'));
    }, 3000);
  };

  useEffect(() => {
    checkSession();
    addLog('页面加载完成');

    // 监听所有相关事件
    const eventHandler = (event: Event) => {
      addLog(`事件触发: ${event.type}`);
    };

    const events = ['beforeunload', 'focus', 'blur', 'visibilitychange', 'pagehide'];
    events.forEach(eventName => {
      window.addEventListener(eventName, eventHandler);
    });

    return () => {
      events.forEach(eventName => {
        window.removeEventListener(eventName, eventHandler);
      });
    };
  }, []);

  if (loading) {
    return <div className="p-8">加载中...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Session行为测试</h1>
      
      {/* 当前用户状态 */}
      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">当前用户状态</h2>
        {user ? (
          <div className="space-y-2">
            <p><strong>用户ID:</strong> {user.userId}</p>
            <p><strong>姓名:</strong> {user.name}</p>
            <p><strong>登录状态:</strong> {user.isLoggedIn ? '已登录' : '未登录'}</p>
            <p><strong>CAS认证:</strong> {user.isCasAuthenticated ? '已认证' : '未认证'}</p>
            <p><strong>登录时间:</strong> {new Date(user.loginTime).toLocaleString()}</p>
          </div>
        ) : (
          <p className="text-red-600">未登录</p>
        )}
      </div>

      {/* Session详细信息 */}
      <div className="bg-green-50 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Session详细信息</h2>
        {sessionInfo ? (
          <pre className="bg-white p-4 rounded border text-sm overflow-auto">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        ) : (
          <p>暂无数据</p>
        )}
        <button 
          onClick={checkSession}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          刷新Session信息
        </button>
      </div>

      {/* 测试按钮 */}
      <div className="bg-yellow-50 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">测试操作</h2>
        <div className="space-x-4">
          <button 
            onClick={simulatePageHide}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            模拟切换标签页（3秒）
          </button>
          <button 
            onClick={simulateWindowBlur}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            模拟窗口失焦（3秒）
          </button>
          <button 
            onClick={() => window.open('https://www.baidu.com', '_blank')}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            打开新标签页
          </button>
        </div>
      </div>

      {/* 事件日志 */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">事件日志</h2>
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">暂无日志...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
        <button 
          onClick={() => setLogs([])}
          className="mt-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          清空日志
        </button>
      </div>

      {/* 说明 */}
      <div className="mt-8 bg-amber-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">测试说明</h2>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li><strong>切换标签页测试:</strong> 应该不会清除session，只会在日志中显示事件</li>
          <li><strong>窗口失焦测试:</strong> 应该不会清除session，只会在日志中显示事件</li>
          <li><strong>打开新标签页:</strong> 原标签页session应该保持不变</li>
          <li><strong>关闭标签页:</strong> 才会真正清除session（保留CAS认证信息）</li>
        </ul>
      </div>
    </div>
  );
} 