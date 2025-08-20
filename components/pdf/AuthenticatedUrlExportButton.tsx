"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2, ExternalLink, User } from 'lucide-react'

export function AuthenticatedUrlExportButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const exportWithAuth = async () => {
    setIsLoading(true)
    setMessage('正在准备认证信息...')
    
    try {
      // 获取当前页面的完整URL
      const currentUrl = window.location.href
      console.log('🌐 当前页面URL:', currentUrl)
      
      // 检查是否已登录
      if (!currentUrl.includes('/dashboard') && !currentUrl.includes('/role-models')) {
        throw new Error('请在Dashboard或Role Models页面使用此功能')
      }
      
      // 获取所有认证相关的Cookie
      const cookies = document.cookie
      console.log('🍪 获取Cookie:', cookies.substring(0, 100) + '...')
      
      if (!cookies) {
        throw new Error('未找到认证信息，请重新登录')
      }
      
      // 解析Cookie为校内服务器格式
      const cookiesArray = cookies.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=')
        return {
          name: name?.trim() || '',
          value: value?.trim() || '',
          domain: window.location.hostname,
          path: '/',
          secure: window.location.protocol === 'https:',
          httpOnly: false
        }
      }).filter(c => c.name && c.value)
      
      console.log('🔐 准备转发Cookie数量:', cookiesArray.length)
      
      setMessage('正在请求服务器访问页面（带认证）...')
      
      // 构造带有完整认证信息的请求
      const requestBody = {
        url: currentUrl,
        cookies: cookiesArray,
        viewportWidth: 1366,
        viewportHeight: 768,
        filename: `${window.location.pathname.replace('/', '')}-authenticated-${Date.now()}.pdf`,
        pdfOptions: {
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: false,
          margin: {
            top: '15mm',
            right: '15mm',
            bottom: '15mm', 
            left: '15mm'
          },
          scale: 0.8,
          waitUntil: 'networkidle0'
        },
        // 添加额外的认证配置
        extraHeaders: {
          'User-Agent': navigator.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Referer': window.location.origin
        }
      }
      
      console.log('📤 发送认证请求:', {
        url: requestBody.url,
        cookieCount: requestBody.cookies.length,
        hasExtraHeaders: !!requestBody.extraHeaders
      })
      
      setMessage('校内服务器正在以认证身份访问页面...')
      
      // 发送到校内PDF服务，包含认证头
      const response = await fetch('http://10.3.58.3:8000/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pdf-key': 'campus-pdf-2024-1755617095',
          // 转发当前页面的所有认证信息
          'Cookie': cookies,
          'User-Agent': navigator.userAgent
        },
        body: JSON.stringify(requestBody),
        mode: 'cors'
      })
      
      console.log('📥 收到服务器响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (response.ok) {
        const blob = await response.blob()
        console.log('✅ 认证PDF生成成功, 大小:', blob.size, 'bytes')
        
        setMessage('正在下载认证PDF...')
        
        // 下载PDF
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        // 根据页面类型生成文件名
        let pageName = 'page'
        if (currentUrl.includes('/dashboard')) {
          pageName = 'Dashboard报告-已认证'
        } else if (currentUrl.includes('/role-models')) {
          pageName = 'Role-Models分析-已认证'
        }
        
        a.download = `${pageName}-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        setMessage(`✅ 认证导出成功！PDF大小: ${(blob.size / 1024).toFixed(1)}KB`)
        
        // 3秒后清除消息
        setTimeout(() => setMessage(''), 3000)
      } else {
        const errorText = await response.text()
        console.error('❌ 认证访问失败:', response.status, errorText)
        
        if (response.status === 401) {
          throw new Error('认证失败，请重新登录后再试')
        } else if (response.status === 403) {
          throw new Error('权限不足，请检查登录状态')
        } else if (response.status === 504) {
          throw new Error('页面加载超时，认证过程可能需要更长时间')
        } else {
          throw new Error(`服务器错误: ${response.status} ${errorText}`)
        }
      }
      
    } catch (error) {
      console.error('❌ 认证导出失败:', error)
      
      let errorMessage = error instanceof Error ? error.message : String(error)
      
      if (errorMessage.includes('Failed to fetch')) {
        errorMessage = '无法连接校内服务器，请检查网络连接'
      }
      
      setMessage(`❌ 导出失败: ${errorMessage}`)
      
      // 5秒后清除错误消息
      setTimeout(() => setMessage(''), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button 
        onClick={exportWithAuth}
        disabled={isLoading}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        size="sm"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <User className="h-4 w-4" />
        )}
        {isLoading ? '认证导出中...' : '认证导出'}
      </Button>
      
      {message && (
        <div className={`text-xs px-2 py-1 rounded max-w-xs text-center ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 
          message.includes('❌') ? 'bg-red-100 text-red-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {message}
        </div>
      )}
      
      <div className="text-xs text-muted-foreground text-center max-w-xs">
        转发登录状态到校内服务器
      </div>
    </div>
  )
}
