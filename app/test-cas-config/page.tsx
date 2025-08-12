"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ExternalLink, Settings } from "lucide-react"

export default function TestCasConfigPage() {
  const [casConfig, setCasConfig] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCasConfig()
  }, [])

  const fetchCasConfig = async () => {
    try {
      const response = await fetch('/api/debug/cas-config')
      if (response.ok) {
        const config = await response.json()
        setCasConfig(config)
      } else {
        setError('无法获取CAS配置')
      }
    } catch (error) {
      console.error('获取CAS配置失败:', error)
      setError('获取CAS配置失败')
    }
  }

  const testCasLogin = () => {
    setLoading(true)
    setError("")
    console.log('🧪 测试CAS登录...')
    
    try {
      window.location.href = '/api/auth/cas/login?returnUrl=/test-cas-config'
    } catch (error) {
      console.error('测试失败:', error)
      setError('测试失败: ' + error)
      setLoading(false)
    }
  }

  const testDirectCasUrl = () => {
    if (casConfig?.casLoginUrl) {
      console.log('🔗 直接访问CAS URL:', casConfig.casLoginUrl)
      window.open(casConfig.casLoginUrl, '_blank')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-800">
            <Settings className="h-6 w-6" />
            CAS配置测试页面
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {casConfig && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-3">当前CAS配置</h3>
              <div className="space-y-2 text-sm">
                <div><strong>环境:</strong> {casConfig.environment}</div>
                <div><strong>CAS服务器:</strong> {casConfig.serverUrl}</div>
                <div><strong>回调URL:</strong> {casConfig.serviceUrl}</div>
                <div><strong>网站URL:</strong> {casConfig.siteUrl}</div>
                <div><strong>完整登录URL:</strong> 
                  <code className="ml-2 p-1 bg-white rounded text-xs break-all">
                    {casConfig.casLoginUrl}
                  </code>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={testCasLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  测试中...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  测试CAS登录API
                </div>
              )}
            </Button>

            {casConfig?.casLoginUrl && (
              <Button
                onClick={testDirectCasUrl}
                variant="outline"
                className="w-full"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  直接打开CAS登录URL（新窗口）
                </div>
              </Button>
            )}

            <Button
              onClick={() => window.location.href = '/login'}
              variant="secondary"
              className="w-full"
            >
              返回登录页面
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 