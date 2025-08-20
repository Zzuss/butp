"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Globe, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

export function QuickExternalTestButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const quickTestExternal = async () => {
    setIsLoading(true)
    setStatus('idle')
    
    try {
      console.log('🧪 快速测试外部URL: butp.tech')
      
      const response = await fetch('http://10.3.58.3:8000/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pdf-key': 'campus-pdf-2024-1755617095'
        },
        body: JSON.stringify({
          url: 'https://butp.tech',
          viewportWidth: 1366,
          viewportHeight: 768,
          filename: `butp-tech-test-${Date.now()}.pdf`,
          pdfOptions: {
            format: 'A4',
            printBackground: true,
            waitUntil: 'networkidle0',
            scale: 0.8
          }
        }),
        mode: 'cors'
      })
      
      if (response.ok) {
        const blob = await response.blob()
        console.log('✅ butp.tech PDF测试成功:', blob.size, 'bytes')
        
        // 下载PDF
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `butp-tech-测试-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        setStatus('success')
        
        // 3秒后重置状态
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        console.error('❌ butp.tech测试失败:', response.status)
        setStatus('error')
        setTimeout(() => setStatus('idle'), 3000)
      }
      
    } catch (error) {
      console.error('❌ 快速外部测试失败:', error)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonVariant = () => {
    if (status === 'success') return 'default'
    if (status === 'error') return 'destructive'
    return 'outline'
  }

  const getButtonText = () => {
    if (isLoading) return '测试中...'
    if (status === 'success') return '✅ 测试成功'
    if (status === 'error') return '❌ 测试失败'
    return '快速测试'
  }

  const getIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />
    if (status === 'success') return <CheckCircle className="h-4 w-4 text-green-600" />
    if (status === 'error') return <AlertTriangle className="h-4 w-4 text-red-600" />
    return <Globe className="h-4 w-4" />
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <Button 
        onClick={quickTestExternal}
        disabled={isLoading}
        variant={getButtonVariant()}
        size="sm"
        className="flex items-center gap-2"
      >
        {getIcon()}
        {getButtonText()}
      </Button>
      
      <div className="text-xs text-muted-foreground text-center">
        测试校内服务访问外部网站
      </div>
    </div>
  )
}
