'use client'

import { useState } from 'react'

export default function TestUmamiScrapingPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testDirectAccess = async () => {
    setLoading(true)
    setError(null)
    try {
      // 直接在客户端尝试访问共享页面
      const shareUrl = 'https://umami-mysql-mauve.vercel.app/share/oA6eRHp6Lw5bdkQy/butp.tech'
      console.log('🌐 客户端尝试访问:', shareUrl)
      
      const response = await fetch(shareUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      })
      
      console.log('📊 客户端响应:', response.status, response.statusText)
      
      if (response.ok) {
        const text = await response.text()
        console.log('✅ 客户端获取HTML长度:', text.length)
        
        setResult({
          success: true,
          status: response.status,
          htmlLength: text.length,
          htmlPreview: text.substring(0, 500),
          hasNextData: text.includes('__NEXT_DATA__'),
          hasStats: text.includes('pageviews') || text.includes('visitors')
        })
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (err) {
      console.error('❌ 客户端访问失败:', err)
      setError(err instanceof Error ? err.message : String(err))
      setResult({
        success: false,
        error: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setLoading(false)
    }
  }

  const testServerAPI = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('🌐 测试服务端API')
      const response = await fetch('/api/umami-stats')
      console.log('📊 API响应:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ API数据:', data)
        setResult({
          success: true,
          apiData: data,
          dataSource: data.meta?.dataSource,
          note: data.meta?.note
        })
      } else {
        const errorText = await response.text()
        throw new Error(`API错误 ${response.status}: ${errorText}`)
      }
    } catch (err) {
      console.error('❌ API调用失败:', err)
      setError(err instanceof Error ? err.message : String(err))
      setResult({
        success: false,
        error: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setLoading(false)
    }
  }

  const testCORS = async () => {
    setLoading(true)
    setError(null)
    try {
      // 测试CORS预检请求
      const shareUrl = 'https://umami-mysql-mauve.vercel.app/share/oA6eRHp6Lw5bdkQy/butp.tech'
      
      const response = await fetch(shareUrl, {
        method: 'HEAD', // 使用HEAD请求测试
      })
      
      setResult({
        success: true,
        corsTest: true,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult({
        success: false,
        corsTest: false,
        error: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔍 Umami共享页面抓取测试
        </h1>
        
        <div className="space-y-6">
          {/* 测试按钮 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">测试选项</h2>
            <div className="space-x-4">
              <button
                onClick={testDirectAccess}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? '测试中...' : '客户端直接访问'}
              </button>
              
              <button
                onClick={testServerAPI}
                disabled={loading}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? '测试中...' : '服务端API调用'}
              </button>
              
              <button
                onClick={testCORS}
                disabled={loading}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {loading ? '测试中...' : 'CORS测试'}
              </button>
            </div>
          </div>

          {/* 错误显示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-red-800 font-semibold">错误</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* 结果显示 */}
          {result && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">测试结果</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {/* 说明 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-800 font-semibold">测试说明</h3>
            <ul className="text-yellow-700 mt-2 list-disc list-inside space-y-1">
              <li><strong>客户端直接访问</strong>: 在浏览器中直接请求共享页面</li>
              <li><strong>服务端API调用</strong>: 通过我们的API路由获取数据</li>
              <li><strong>CORS测试</strong>: 检查跨域请求策略</li>
            </ul>
          </div>

          {/* 共享页面链接 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-blue-800 font-semibold">共享页面</h3>
            <p className="text-blue-700 mt-2">
              <a 
                href="https://umami-mysql-mauve.vercel.app/share/oA6eRHp6Lw5bdkQy/butp.tech" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-blue-900"
              >
                https://umami-mysql-mauve.vercel.app/share/oA6eRHp6Lw5bdkQy/butp.tech
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 