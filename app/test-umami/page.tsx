"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TestTube2, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  BarChart3,
  ExternalLink
} from "lucide-react"

interface TestResult {
  test: string
  status: 'success' | 'error' | 'pending'
  message: string
  data?: any
}

export default function TestUmamiPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runTests = async () => {
    setIsRunning(true)
    setTestResults([])

    const tests = [
      {
        name: 'API路由连接测试',
        test: async () => {
          const response = await fetch('/api/umami-stats')
          const data = await response.json()
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`)
          }
          
          return { success: data.success, data: data.data }
        }
      },
      {
        name: '环境变量检查',
        test: async () => {
          const response = await fetch('/api/umami-stats')
          const data = await response.json()
          
          if (response.status === 500 && data.error === 'Umami configuration missing') {
            throw new Error('Umami环境变量未配置：UMAMI_USERNAME, UMAMI_PASSWORD, UMAMI_WEBSITE_ID')
          }
          
          return { configured: true }
        }
      },
      {
        name: 'Umami认证测试',
        test: async () => {
          const response = await fetch('/api/umami-stats')
          const data = await response.json()
          
          if (response.status === 401) {
            throw new Error('Umami认证失败：用户名或密码错误')
          }
          
          return { authenticated: true }
        }
      },
      {
        name: '数据完整性检查',
        test: async () => {
          const response = await fetch('/api/umami-stats')
          const data = await response.json()
          
          if (!data.success || !data.data) {
            throw new Error('API返回数据格式错误')
          }
          
          const periods = ['daily', 'weekly', 'monthly', 'halfYear']
          const missingPeriods = periods.filter(period => !data.data[period])
          
          if (missingPeriods.length > 0) {
            throw new Error(`缺少时间段数据: ${missingPeriods.join(', ')}`)
          }
          
          return { 
            periodsCount: periods.length,
            sampleData: data.data.weekly
          }
        }
      }
    ]

    for (const { name, test } of tests) {
      try {
        // 添加pending状态
        setTestResults(prev => [...prev, {
          test: name,
          status: 'pending',
          message: '测试中...'
        }])

        const result = await test()
        
        // 更新为成功状态
        setTestResults(prev => prev.map(item => 
          item.test === name 
            ? { 
                test: name, 
                status: 'success' as const, 
                message: '测试通过',
                data: result 
              }
            : item
        ))
        
      } catch (error) {
        // 更新为失败状态
        setTestResults(prev => prev.map(item => 
          item.test === name 
            ? { 
                test: name, 
                status: 'error' as const, 
                message: error instanceof Error ? error.message : '测试失败'
              }
            : item
        ))
      }

      // 添加延迟使测试过程更直观
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'pending':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-4 flex items-center justify-center gap-3">
            <TestTube2 className="h-10 w-10" />
            Umami 统计测试
          </h1>
          <p className="text-xl text-blue-700">测试Umami访问统计功能的连接和配置</p>
        </div>

        {/* 测试控制面板 */}
        <Card className="mb-8 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              测试控制台
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 mb-2">
                  点击运行测试来检查Umami配置和API连接状态
                </p>
                <p className="text-sm text-gray-500">
                  测试将验证环境变量、API认证和数据完整性
                </p>
              </div>
              <Button 
                onClick={runTests} 
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <TestTube2 className="h-4 w-4" />
                    运行测试
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 测试结果 */}
        {testResults.length > 0 && (
          <Card className="mb-8 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
              <CardTitle>测试结果</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <span className="font-medium">{result.test}</span>
                      </div>
                      <Badge 
                        variant={result.status === 'success' ? 'default' : 'destructive'}
                        className={result.status === 'pending' ? 'bg-blue-100 text-blue-800' : ''}
                      >
                        {result.status === 'success' ? '通过' : 
                         result.status === 'error' ? '失败' : '进行中'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                    {result.data && (
                      <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-auto">
                        <pre>{JSON.stringify(result.data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 快速链接 */}
        <Card className="border-blue-200">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
            <CardTitle>相关链接</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <a 
                href="https://umami-ruby-chi.vercel.app/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-blue-600" />
                <span>Umami 仪表板</span>
              </a>
              <a 
                href="/about"
                className="flex items-center gap-2 p-3 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
              >
                <BarChart3 className="h-4 w-4 text-green-600" />
                <span>关于页面（查看统计）</span>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* 配置说明 */}
        <Card className="mt-8 border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-yellow-800 mb-3">配置说明</h3>
            <div className="text-sm text-yellow-700 space-y-2">
              <p>如果测试失败，请检查以下环境变量配置：</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code>UMAMI_BASE_URL</code>: Umami服务器地址</li>
                <li><code>UMAMI_USERNAME</code>: Umami用户名</li>
                <li><code>UMAMI_PASSWORD</code>: Umami密码</li>
                <li><code>UMAMI_WEBSITE_ID</code>: 网站ID</li>
              </ul>
              <p className="mt-3">
                这些配置应该添加到您的 <code>.env.local</code> 文件中。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 