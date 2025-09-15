"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function DebugNotifications() {
  const [result, setResult] = useState<string>('')
  const [testId, setTestId] = useState<string>('0dfa4fbd-9617-4146-b6cb-660f40a6b8be')
  const [loading, setLoading] = useState<boolean>(false)

  const testEndpoint = async (method: string, url: string, body: any = null) => {
    setLoading(true)
    try {
      console.log(`🔍 测试 ${method} ${url}`)
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      }
      
      if (body) {
        options.body = JSON.stringify(body)
      }

      const response = await fetch(url, options)
      
      console.log(`📊 响应状态: ${response.status}`)
      console.log(`📋 响应头:`, Object.fromEntries(response.headers.entries()))
      console.log(`🍪 请求Cookie:`, document.cookie)

      let responseText = ''
      let responseJson = null
      
      try {
        responseText = await response.text()
        responseJson = JSON.parse(responseText)
      } catch (e) {
        // 如果不是JSON，使用原文本
      }

      const debugInfo = {
        method,
        url,
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        cookies: document.cookie,
        body: body,
        response: responseJson || responseText,
        timestamp: new Date().toISOString()
      }

      setResult(JSON.stringify(debugInfo, null, 2))
      
    } catch (error) {
      console.error(`❌ 请求错误:`, error)
      setResult(`请求错误: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>🔍 通知API调试工具</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">测试通知ID:</label>
            <Input
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              placeholder="输入通知ID"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => testEndpoint('GET', '/api/test-dynamic/test123')}
              disabled={loading}
              variant="default"
            >
              🧪 测试动态路由
            </Button>
            
            <Button 
              onClick={() => testEndpoint('GET', '/api/admin/notifications')}
              disabled={loading}
              variant="outline"
            >
              🔍 GET 通知列表
            </Button>
            
            <Button 
              onClick={() => testEndpoint('GET', `/api/admin/notifications/${testId}`)}
              disabled={loading}
              variant="outline"
            >
              🔍 GET 单个通知
            </Button>
            
            <Button 
              onClick={() => testEndpoint('POST', '/api/admin/notifications', {
                title: '调试测试通知',
                content: '这是一个调试测试通知',
                type: 'info',
                priority: 0,
                start_date: new Date().toISOString()
              })}
              disabled={loading}
              variant="secondary"
            >
              ➕ POST 创建通知
            </Button>
            
            <Button 
              onClick={() => testEndpoint('PATCH', `/api/admin/notifications/${testId}`, {
                is_active: false
              })}
              disabled={loading}
              variant="secondary"
            >
              ✏️ PATCH 更新通知
            </Button>
            
            <Button 
              onClick={() => testEndpoint('DELETE', `/api/admin/notifications/${testId}`)}
              disabled={loading}
              variant="destructive"
            >
              🗑️ DELETE 删除通知
            </Button>
          </div>
          
          <div className="mt-4">
            <h3 className="font-semibold mb-2">🔍 调试结果:</h3>
            <pre className="bg-gray-100 p-4 rounded-md text-xs max-h-96 overflow-auto whitespace-pre-wrap">
              {result || '点击上面的按钮开始调试...'}
            </pre>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <h4 className="font-semibold mb-2">🔧 使用说明:</h4>
            <ul className="text-sm space-y-1">
              <li>1. 确保您已经以管理员身份登录</li>
              <li>2. 点击"GET 通知列表"获取现有通知ID</li>
              <li>3. 将通知ID填入上方输入框</li>
              <li>4. 依次测试各个功能，观察结果差异</li>
              <li>5. 查看浏览器控制台获取更多调试信息</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
