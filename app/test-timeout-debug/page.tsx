'use client'

import { useEffect, useState } from 'react'

export default function TestTimeoutDebugPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchSessionInfo = async () => {
    try {
      const response = await fetch('/api/debug-session')
      const data = await response.json()
      setSessionInfo(data)
    } catch (error) {
      console.error('Failed to fetch session info:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessionInfo()
  }, [])

  const triggerPageReload = () => {
    window.location.reload()
  }

  const simulateTimeout = async () => {
    try {
      // 模拟设置一个31分钟前的lastActiveTime
      const response = await fetch('/api/debug-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'simulate_timeout',
          lastActiveTime: Date.now() - (31 * 60 * 1000) // 31分钟前
        })
      })
      
      if (response.ok) {
        alert('已模拟超时状态（31分钟前），现在刷新页面应该会触发CAS登出')
        await fetchSessionInfo()
      }
    } catch (error) {
      console.error('Failed to simulate timeout:', error)
    }
  }

  if (loading) {
    return <div className="p-4">加载中...</div>
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">会话超时调试页面</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h2 className="text-lg font-semibold mb-2">当前会话信息：</h2>
        <pre className="bg-white p-2 rounded text-sm overflow-auto">
          {JSON.stringify(sessionInfo, null, 2)}
        </pre>
      </div>

      <div className="space-y-4">
        <button 
          onClick={fetchSessionInfo}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          刷新会话信息
        </button>

        <button 
          onClick={simulateTimeout}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
        >
          模拟会话超时（31分钟前）
        </button>

        <button 
          onClick={triggerPageReload}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          刷新页面（触发middleware检查）
        </button>
      </div>

      <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">测试步骤：</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>点击"模拟会话超时"按钮</li>
          <li>点击"刷新页面"按钮</li>
          <li>检查浏览器控制台中的middleware日志</li>
          <li>确认是否跳转到CAS登出页面</li>
        </ol>
      </div>

      <div className="mt-4 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">期望行为：</h3>
        <p className="text-sm">
          当会话超过30分钟后，再次访问受保护页面应该：
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm mt-2">
          <li>middleware检测到会话过期</li>
          <li>输出 "⏰ Middleware: session expired due to inactivity, forcing complete CAS logout" 日志</li>
          <li>重定向到 /api/auth/cas/logout</li>
          <li>最终跳转到 CAS 服务器的登出页面</li>
        </ul>
      </div>
    </div>
  )
} 