'use client'

import { useState, useEffect } from 'react'

export default function SessionDebugPage() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }

  const checkSession = async () => {
    try {
      setLoading(true)
      addLog('开始检查session状态...')
      
      const response = await fetch('/api/debug-session')
      const data = await response.json()
      
      addLog(`Session API响应: ${response.status}`)
      setSessionData(data)
      
      if (data.success) {
        addLog('Session数据获取成功')
        addLog(`isLoggedIn: ${data.session?.isLoggedIn}`)
        addLog(`isCasAuthenticated: ${data.session?.isCasAuthenticated}`)
        addLog(`userId: ${data.session?.userId || 'none'}`)
        addLog(`userHash: ${data.session?.userHash || 'none'}`)
        
        // 详细显示时间信息
        if (data.session?.lastActiveTimeISO) {
          addLog(`lastActiveTime: ${data.session.lastActiveTimeISO}`)
        }
        if (data.session?.loginTimeISO) {
          addLog(`loginTime: ${data.session.loginTimeISO}`)
        }
        
        // 显示API预计算的时间差
        if (data.session?.timeSinceLastActive) {
          addLog(`API计算的时间差: ${data.session.timeSinceLastActive}`)
        }
        
        // 检查超时状态
        if (data.session?.lastActiveTime) {
          const now = Date.now()
          const lastActiveTime = data.session.lastActiveTime
          
          // 验证lastActiveTime是否为有效数字
          if (typeof lastActiveTime === 'number' && !isNaN(lastActiveTime) && lastActiveTime > 0) {
            const timeSinceActive = now - lastActiveTime
            const minutesSinceActive = Math.round(timeSinceActive / 1000 / 60)
            addLog(`距离最后活跃时间: ${minutesSinceActive} 分钟`)
            addLog(`是否超时: ${minutesSinceActive > 30 ? '是' : '否'}`)
          } else {
            addLog(`lastActiveTime无效: ${lastActiveTime} (类型: ${typeof lastActiveTime})`)
            addLog(`建议检查session设置逻辑`)
          }
        } else {
          addLog(`lastActiveTime未设置或为空`)
          
          // 检查是否有loginTime作为参考
          if (data.session?.loginTime) {
            const loginTime = data.session.loginTime
            if (typeof loginTime === 'number' && !isNaN(loginTime) && loginTime > 0) {
              const now = Date.now()
              const timeSinceLogin = now - loginTime
              const minutesSinceLogin = Math.round(timeSinceLogin / 1000 / 60)
              addLog(`参考登录时间，距离登录: ${minutesSinceLogin} 分钟`)
            } else {
              addLog(`loginTime也无效: ${loginTime}`)
            }
          }
        }
      } else {
        addLog(`Session检查失败: ${data.message || 'Unknown error'}`)
      }
    } catch (error) {
      addLog(`Session检查异常: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testRefresh = () => {
    addLog('执行页面刷新测试...')
    window.location.reload()
  }

  const testProtectedRoute = () => {
    addLog('测试访问受保护路由...')
    window.location.href = '/dashboard'
  }

  const testPageClose = async () => {
    try {
      addLog('模拟页面关闭（调用logout API）...')
      const response = await fetch('/api/auth/cas/logout', {
        method: 'POST'
      })
      const data = await response.json()
      addLog(`页面关闭API响应: ${response.status}`)
      addLog(`响应数据: ${JSON.stringify(data)}`)
      
      // 重新检查session状态
      setTimeout(() => {
        addLog('页面关闭后重新检查session状态...')
        checkSession()
      }, 1000)
    } catch (error) {
      addLog(`页面关闭测试失败: ${error}`)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  useEffect(() => {
    checkSession()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔍 Session调试页面
        </h1>
        
        {/* 控制按钮 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">测试操作</h2>
          <div className="space-x-4">
            <button
              onClick={checkSession}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '检查中...' : '检查Session'}
            </button>
            
            <button
              onClick={testRefresh}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              测试页面刷新
            </button>
            
            <button
              onClick={testProtectedRoute}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            >
              访问受保护路由
            </button>
            
            <button
              onClick={testPageClose}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              模拟页面关闭
            </button>
            
            <button
              onClick={clearLogs}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              清除日志
            </button>
          </div>
        </div>

        {/* Session数据显示 */}
        {sessionData && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Session数据</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(sessionData, null, 2)}
            </pre>
          </div>
        )}

        {/* 操作日志 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">操作日志</h2>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">暂无日志...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 说明信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="text-blue-800 font-semibold">调试说明</h3>
          <ul className="text-blue-700 mt-2 list-disc list-inside space-y-1">
            <li>这个页面可以帮助调试session状态问题</li>
            <li>检查刷新后session数据是否保持</li>
            <li>验证中间件的认证逻辑</li>
            <li>分析超时机制是否正常工作</li>
            <li><strong>模拟页面关闭</strong>：测试关闭页面后lastActiveTime是否正确保留</li>
            <li><strong>关键验证</strong>：关闭页面后isLoggedIn=false，但其他认证信息保留</li>
          </ul>
        </div>

        {/* 环境信息 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <h3 className="text-yellow-800 font-semibold">环境信息</h3>
          <p className="text-yellow-700 mt-2">
            当前URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}
          </p>
          <p className="text-yellow-700">
            用户代理: {typeof window !== 'undefined' ? navigator.userAgent : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  )
} 