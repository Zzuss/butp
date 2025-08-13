'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle, ExternalLink, Copy } from 'lucide-react'
import Link from 'next/link'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error' | 'warning'
  message: string
  details?: any
  duration?: number
}

export default function TestUmamiConnection() {
  const [tests, setTests] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState<{success: number, total: number} | null>(null)

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const runDiagnostics = async () => {
    setRunning(true)
    setSummary(null)
    
    const testSuite: Omit<TestResult, 'status' | 'message'>[] = [
      { name: '基础网络连接测试', details: {} },
      { name: 'Umami服务器可达性', details: {} },
      { name: '本地API路由测试', details: {} },
      { name: '环境变量配置检查', details: {} },
      { name: '数据获取完整性测试', details: {} }
    ]

    setTests(testSuite.map(test => ({ ...test, status: 'pending', message: '等待执行...' })))

    let successCount = 0

    // 测试1: 基础网络连接
    const startTime1 = Date.now()
    try {
      updateTest(0, { status: 'pending', message: '正在测试网络连接...' })
      
      const response = await fetch('https://httpbin.org/status/200', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      const duration1 = Date.now() - startTime1
      
      if (response.ok) {
        updateTest(0, {
          status: 'success',
          message: '网络连接正常',
          duration: duration1,
          details: { 
            status: response.status, 
            responseTime: `${duration1}ms`,
            network: '可以访问外部服务'
          }
        })
        successCount++
      } else {
        updateTest(0, {
          status: 'error',
          message: '网络连接异常',
          duration: duration1,
          details: { status: response.status, error: '无法访问外部测试服务' }
        })
      }
    } catch (error) {
      updateTest(0, {
        status: 'error',
        message: '网络连接失败',
        duration: Date.now() - startTime1,
        details: { 
          error: error instanceof Error ? error.message : '未知错误',
          suggestion: '检查网络连接、防火墙设置或代理配置'
        }
      })
    }

    // 测试2: Umami服务器可达性
    const startTime2 = Date.now()
    try {
      updateTest(1, { status: 'pending', message: '正在测试Umami服务器...' })
      
      const response = await fetch('https://umami-teal-omega.vercel.app', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(8000)
      })
      const duration2 = Date.now() - startTime2
      
      if (response.ok) {
        updateTest(1, {
          status: 'success',
          message: 'Umami服务器可达',
          duration: duration2,
          details: { 
            status: response.status, 
            responseTime: `${duration2}ms`,
            server: response.headers.get('server') || '未知',
            umamiStatus: '服务器在线'
          }
        })
        successCount++
      } else {
        updateTest(1, {
          status: 'error',
          message: `服务器响应异常 (${response.status})`,
          duration: duration2,
          details: { 
            status: response.status,
            suggestion: 'Umami服务器可能暂时不可用'
          }
        })
      }
    } catch (error) {
      updateTest(1, {
        status: 'error',
        message: 'Umami服务器不可达',
        duration: Date.now() - startTime2,
        details: { 
          error: error instanceof Error ? error.message : '未知错误',
          serverUrl: 'https://umami-teal-omega.vercel.app',
          suggestion: '服务器可能离线或网络连接问题'
        }
      })
    }

    // 测试3: 本地API路由测试
    const startTime3 = Date.now()
    try {
      updateTest(2, { status: 'pending', message: '正在测试本地API路由...' })
      
      const response = await fetch('/api/umami-stats', {
        method: 'GET',
        signal: AbortSignal.timeout(20000)
      })
      const duration3 = Date.now() - startTime3
      const data = await response.json()
      
      if (response.ok && data.success) {
        updateTest(2, {
          status: 'success',
          message: 'API路由正常工作',
          duration: duration3,
          details: { 
            status: response.status,
            responseTime: `${duration3}ms`,
            dataSource: data.source || '未知',
            successRate: data.data?.meta?.successRate || '未知',
            apiStatus: '正常'
          }
        })
        successCount++
      } else {
        const errorLevel = data.fallbackAvailable ? 'warning' : 'error'
        updateTest(2, {
          status: errorLevel,
          message: data.error || 'API路由异常',
          duration: duration3,
          details: { 
            status: response.status,
            error: data.error,
            details: data.details,
            fallbackAvailable: data.fallbackAvailable,
            suggestion: data.fallbackAvailable ? '可以使用演示数据模式' : '需要检查配置'
          }
        })
        if (errorLevel === 'warning') successCount++
      }
    } catch (error) {
      updateTest(2, {
        status: 'error',
        message: 'API路由请求失败',
        duration: Date.now() - startTime3,
        details: { 
          error: error instanceof Error ? error.message : '未知错误',
          endpoint: '/api/umami-stats',
          suggestion: '检查Next.js应用是否正常运行'
        }
      })
    }

    // 测试4: 环境变量配置检查
    try {
      updateTest(3, { status: 'pending', message: '正在检查环境变量...' })
      
      const response = await fetch('/api/umami-stats')
      const data = await response.json()
      
      if (data.missingVars && data.missingVars.length > 0) {
        updateTest(3, {
          status: 'error',
          message: '环境变量配置不完整',
          details: {
            missingVars: data.missingVars,
            suggestion: '请在.env.local中配置必要的环境变量',
            requiredVars: ['UMAMI_BASE_URL', 'UMAMI_USERNAME', 'UMAMI_PASSWORD', 'UMAMI_WEBSITE_ID']
          }
        })
      } else if (!response.ok && data.error?.includes('配置')) {
        updateTest(3, {
          status: 'error',
          message: '环境变量可能有误',
          details: {
            error: data.error,
            suggestion: '检查用户名、密码和网站ID是否正确'
          }
        })
      } else {
        updateTest(3, {
          status: 'success',
          message: '环境变量配置完整',
          details: {
            status: '所有必需的环境变量已配置',
            note: '具体值的正确性需要通过认证测试验证'
          }
        })
        successCount++
      }
    } catch (error) {
      updateTest(3, {
        status: 'warning',
        message: '无法验证环境变量',
        details: {
          error: error instanceof Error ? error.message : '未知错误',
          suggestion: '可能需要手动检查.env.local文件'
        }
      })
    }

    // 测试5: 数据获取完整性
    try {
      updateTest(4, { status: 'pending', message: '正在测试数据完整性...' })
      
      const response = await fetch('/api/umami-stats')
      const data = await response.json()
      
      if (data.success && data.data) {
        const stats = data.data
        const periods = ['daily', 'weekly', 'monthly', 'halfYearly']
        const validPeriods = periods.filter(period => stats[period] && typeof stats[period].pageviews === 'number')
        
        updateTest(4, {
          status: validPeriods.length === periods.length ? 'success' : 'warning',
          message: `数据完整性: ${validPeriods.length}/${periods.length} 个时间段有效`,
          details: {
            validPeriods,
            totalPeriods: periods.length,
            dataSource: data.source,
            processingTime: data.processingTime || 0,
            lastUpdated: stats.meta?.lastUpdated || '未知'
          }
        })
        if (validPeriods.length > 0) successCount++
      } else {
        updateTest(4, {
          status: 'error',
          message: '无法获取有效数据',
          details: {
            error: data.error || '数据格式异常',
            suggestion: '可能是认证问题或网络问题'
          }
        })
      }
    } catch (error) {
      updateTest(4, {
        status: 'error',
        message: '数据完整性测试失败',
        details: {
          error: error instanceof Error ? error.message : '未知错误'
        }
      })
    }

    setSummary({ success: successCount, total: testSuite.length })
    setRunning(false)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">成功</Badge>
      case 'error':
        return <Badge variant="destructive">失败</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">警告</Badge>
      case 'pending':
        return <Badge variant="secondary">等待</Badge>
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Umami 连接诊断工具</span>
            <Button onClick={runDiagnostics} disabled={running}>
              <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
              {running ? '诊断中...' : '开始诊断'}
            </Button>
          </CardTitle>
          {summary && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                诊断结果: {summary.success}/{summary.total} 项通过
              </span>
              <Badge variant={summary.success === summary.total ? 'default' : summary.success > 0 ? 'secondary' : 'destructive'}>
                {summary.success === summary.total ? '全部通过' : summary.success > 0 ? '部分通过' : '需要修复'}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tests.map((test, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  {getStatusIcon(test.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{test.name}</h3>
                    <div className="flex items-center gap-2">
                      {test.duration && (
                        <span className="text-sm text-gray-500">{test.duration}ms</span>
                      )}
                      {getStatusBadge(test.status)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{test.message}</p>
                  {test.details && Object.keys(test.details).length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                        查看详情
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded border">
                        {Object.entries(test.details).map(([key, value]) => (
                          <div key={key} className="flex justify-between py-1">
                            <span className="font-medium text-gray-600">{key}:</span>
                            <span className="text-gray-800 ml-2">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 快速修复建议 */}
      <Card>
        <CardHeader>
          <CardTitle>快速修复指南</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-red-600 mb-2">❌ 网络连接问题</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>检查网络连接是否正常</li>
                <li>确认防火墙没有阻止外部连接</li>
                <li>如使用公司网络，可能需要配置代理</li>
                <li>尝试使用VPN或更换网络环境</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-red-600 mb-2">❌ Umami服务器不可达</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Umami服务器可能临时维护</li>
                <li>检查服务器URL: https://umami-teal-omega.vercel.app</li>
                <li>等待5-10分钟后重试</li>
                <li>
                  访问 
                  <Button 
                    variant="link" 
                    className="h-auto p-0 ml-1" 
                    onClick={() => window.open('https://umami-teal-omega.vercel.app', '_blank')}
                  >
                    Umami控制台
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                  确认服务状态
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-yellow-600 mb-2">⚠️ 环境变量配置</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">在项目根目录的 .env.local 文件中添加:</p>
                <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                  <div className="flex items-center justify-between">
                    <span>UMAMI_BASE_URL=https://umami-teal-omega.vercel.app</span>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard('UMAMI_BASE_URL=https://umami-teal-omega.vercel.app')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>UMAMI_USERNAME=your_username</span>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard('UMAMI_USERNAME=your_username')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>UMAMI_PASSWORD=your_password</span>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard('UMAMI_PASSWORD=your_password')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>UMAMI_WEBSITE_ID=your_website_id</span>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard('UMAMI_WEBSITE_ID=your_website_id')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-blue-600 mb-2">💡 使用演示模式</h4>
              <p className="text-sm text-gray-600 mb-2">
                如果暂时无法连接到Umami，可以使用演示数据模式查看界面效果:
              </p>
              <Link href="/about">
                <Button variant="outline" size="sm">
                  查看演示数据
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 有用的链接 */}
      <Card>
        <CardHeader>
          <CardTitle>相关链接</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => window.open('https://umami-teal-omega.vercel.app/dashboard', '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Umami 控制台
            </Button>
            <Link href="/about">
              <Button variant="outline" className="w-full">
                查看访问统计页面
              </Button>
            </Link>
            <Link href="/test-umami">
              <Button variant="outline" className="w-full">
                Umami 测试页面
              </Button>
            </Link>
            <Button variant="outline" onClick={() => window.open('/api/umami-stats', '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              API 调试接口
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 