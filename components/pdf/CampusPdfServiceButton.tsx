"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function CampusPdfServiceButton({
  campusServiceUrl
}: { campusServiceUrl?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [viewport, setViewport] = useState<number>(1366)

  const [statusMessage, setStatusMessage] = useState<string>('')


  // 检测校园VPN连接（避免Mixed Content问题）
  const checkCampusVPNConnection = async (): Promise<boolean> => {
    try {
      const hostname = window.location.hostname
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'
      const isIntranet = hostname.includes('10.') || hostname.includes('192.168.') || hostname.includes('bupt')
      
      console.log('🔍 环境检测:', { hostname, isLocal, isIntranet })
      
      // 尝试快速ping校内服务（用于VPN检测）
      try {
        // 统一走应用的健康检查代理
        const testUrl = '/api/pdf/health'
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3秒超时
        
        console.log(`🔍 正在测试连接: ${testUrl}`)
        const testResponse = await fetch(testUrl, {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors' // 避免CORS问题
        })
        clearTimeout(timeoutId)
        
        console.log('✅ 校内服务健康检查成功', testResponse)
        return true
      } catch (testError) {
        console.log('⚠️ 校内服务健康检查失败:', testError)
        console.log('📋 错误详情:', {
          name: testError instanceof Error ? testError.name : 'Unknown',
          message: testError instanceof Error ? testError.message : String(testError),
          stack: testError instanceof Error ? testError.stack?.substring(0, 200) : undefined
        })
        
        // 如果是本地开发环境，仍然尝试
      if (isLocal || isIntranet) {
          console.log('🏠 本地/内网环境，仍会尝试校内服务')
        return true
        }
        return false
      }
      
    } catch (error) {
      console.log('❌ 环境检测失败:', error)
      return false
    }
  }

  const handleExport = async () => {
    setIsLoading(true)
    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''

      // 智能检测用户环境
      const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1'
      const isIntranet = hostname.includes('10.') || hostname.includes('192.168.')
      const isCampusVPN = await checkCampusVPNConnection()
      
      // 华为云PDF服务对所有环境开放
      const canUseCampusService = true
      
      // 统一走应用代理，避免Mixed Content，并复用后端环境变量
      const campusService = campusServiceUrl || '/api/pdf/generate'
      
      console.log('🔒 校内服务URL:', campusService)

      const body: any = { viewportWidth: viewport }

      // 本地开发发送HTML（云端无法访问localhost），线上发送URL以获得高保真
      const useHtml = hostname === 'localhost' || hostname === '127.0.0.1' || window.location.protocol === 'file:'
      if (useHtml) {
        let html = document.documentElement.outerHTML || '<html></html>'
        if (!/<base\b/i.test(html)) {
          if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${origin}">`)
          else html = `<head><base href="${origin}"></head>` + html
        }
        body.html = html
      } else {
        body.url = currentUrl
      }

      // 1) 浏览器直接调用校内PDF服务（用户需要在校园网或VPN环境）
      if (canUseCampusService) {
        try {
          setStatusMessage('尝试连接校内PDF服务...')
          
          // 对于HTTPS站点访问HTTP校内服务，需要用户允许Mixed Content
          if (window.location.protocol === 'https:' && campusService.startsWith('http:')) {
            const userConfirm = confirm(
              '检测到您在HTTPS站点尝试使用校内PDF服务。\n\n' +
              '由于浏览器安全限制，您需要：\n' +
              '1. 允许此页面的"不安全内容"（Mixed Content）\n' +
              '2. 或者在浏览器地址栏点击"盾牌"图标，选择"允许不安全内容"\n\n' +
              '是否继续尝试连接校内服务？\n' +
              '（如果失败会自动使用客户端导出）'
            )
            
            if (!userConfirm) {
              setStatusMessage('用户取消，使用客户端导出...')
              throw new Error('用户取消校内服务')
            }
            
            setStatusMessage('正在尝试连接校内服务（可能需要允许Mixed Content）...')
          }
          
          // 获取当前页面的主要内容（针对校内PDF服务优化）
          const getPageHTML = () => {
            // 智能识别主要内容区域，排除侧边栏等UI元素
            // 检测当前页面类型并选择合适的内容区域
            const isDashboard = window.location.pathname.includes('/dashboard')
            const isRoleModels = window.location.pathname.includes('/role-models')
            
            let mainContent
            if (isDashboard) {
              // Dashboard页面：优先选择包含实际内容的容器
              mainContent = document.querySelector('.container.mx-auto') ||
                           document.querySelector('div[class*="container"][class*="mx-auto"]') ||
                           document.querySelector('main') ||
                           document.querySelector('.dashboard-content')
            } else if (isRoleModels) {
              // Role Models页面：选择主要内容区域
              mainContent = document.querySelector('main') ||
                           document.querySelector('.container') ||
                           document.querySelector('[role="main"]')
                } else {
              // 其他页面：使用通用选择器
              mainContent = document.querySelector('main') || 
                           document.querySelector('.dashboard-content') || 
                           document.querySelector('[role="main"]') ||
                           document.querySelector('.container') ||
                           document.querySelector('.max-w-4xl')
            }
            
            if (!mainContent) {
              console.error('❌ 未找到主要内容区域')
              throw new Error('未找到要导出的主要内容区域')
            }
            
            console.log('🎯 选中的内容区域:', {
              selector: mainContent.tagName + (mainContent.className ? '.' + mainContent.className.split(' ').join('.') : ''),
              textLength: (mainContent as HTMLElement).innerText?.length || 0,
              childrenCount: mainContent.children.length,
              hasCards: mainContent.querySelectorAll('[class*="card"]').length,
              hasDashboardContent: mainContent.querySelectorAll('.dashboard-content').length
            })
            
            // 获取页面标题
            const pageTitle = document.title || '页面导出'
            const currentPath = window.location.pathname
            let contentTitle = pageTitle
            
            // 根据路径智能识别页面类型
            if (currentPath.includes('/dashboard')) {
              contentTitle = '数据总览 - Dashboard'
            } else if (currentPath.includes('/role-models')) {
              contentTitle = 'Role Models - 职业规划'
            } else if (currentPath.includes('/analysis')) {
              contentTitle = '分析模块'
            } else if (currentPath.includes('/grades')) {
              contentTitle = '成绩查看'
            }
            
            console.log('📄 正在导出页面:', { 
              title: contentTitle, 
              path: currentPath,
              contentElement: mainContent.tagName,
              contentSize: mainContent.innerHTML.length
            })
            
            // 创建简化的HTML结构
            const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${viewport}, initial-scale=1">
  <title>${contentTitle}</title>
  <style>
    /* 基础重置和中文字体优化 */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    body {
      font-family: "Microsoft YaHei", "PingFang SC", "SimHei", "SimSun", Arial, sans-serif !important;
      font-size: 14px;
      line-height: 1.6;
      color: #333 !important;
      background: white !important;
      padding: 20px;
      max-width: none;
      width: auto;
    }
    
    /* 标题样式 */
    h1, h2, h3, h4, h5, h6 {
      font-family: "Microsoft YaHei", "PingFang SC", "SimHei", sans-serif !important;
      color: #1f2937 !important;
      margin: 16px 0 8px 0;
      font-weight: 600;
    }
    
    h1 { font-size: 24px; }
    h2 { font-size: 20px; }
    h3 { font-size: 18px; }
    h4 { font-size: 16px; }
    
    /* 段落和文本 */
    p {
      margin: 8px 0;
      color: #374151 !important;
    }
    
    /* 表格样式 */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      text-align: left;
      font-family: "Microsoft YaHei", "PingFang SC", sans-serif !important;
    }
    
    th {
      background-color: #f9fafb !important;
      font-weight: 600;
    }
    
    /* 卡片样式 */
    .card, .info-box {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      background: white !important;
    }
    
    /* 网格布局 */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 16px 0;
    }
    
    /* 统计数字样式 */
    .text-2xl {
      font-size: 24px !important;
      font-weight: 700 !important;
      color: #1f2937 !important;
    }
    
    .text-xl {
      font-size: 20px !important;
      font-weight: 600 !important;
    }
    
    /* 隐藏不需要的元素 */
    .sidebar, nav, button, .fixed, .no-print,
    [class*="sidebar"], [style*="position: fixed"],
    script, noscript, iframe {
      display: none !important;
    }
    
    /* 确保主要内容可见 */
    main, .main-content, .dashboard-content,
    .container, .max-w-4xl {
      display: block !important;
      visibility: visible !important;
      position: relative !important;
      max-width: none !important;
      width: 100% !important;
      margin: 0 !important;
    }
    
    /* 颜色修复 */
    .text-muted-foreground {
      color: #6b7280 !important;
    }
    
    .text-primary {
      color: #2563eb !important;
    }
    
    .bg-primary {
      background-color: #2563eb !important;
      color: white !important;
    }
    
    .border {
      border-color: #e5e7eb !important;
    }
    
    /* 确保中文内容可见 */
    [lang="zh"], [lang="zh-CN"] {
      font-family: "Microsoft YaHei", "PingFang SC", "SimHei", "SimSun", sans-serif !important;
    }
  </style>
</head>
<body>
  <div class="pdf-header">
    <h1 style="text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333;">${contentTitle}</h1>
    <p style="text-align: center; color: #666; font-size: 12px; margin-bottom: 30px;">导出时间: ${new Date().toLocaleString('zh-CN')}</p>
  </div>
  
  <div class="pdf-content">
    ${mainContent.innerHTML}
  </div>
  
  <div class="pdf-footer" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; color: #666; font-size: 10px;">
    <p>本报告由系统自动生成 | 页面: ${currentPath} | 导出时间: ${new Date().toLocaleString('zh-CN')}</p>
  </div>
</body>
</html>`
            
            return htmlContent
          }

          // 构建请求体
          let pdfRequestBody: any
          if (useHtml) {
            const pageHTML = getPageHTML()
            pdfRequestBody = {
              html: pageHTML,
              viewportWidth: viewport,
              filename: `export_${new Date().toISOString().slice(0,10)}.pdf`,
              pdfOptions: {
                printBackground: true,
                format: 'A4',
                preferCSSPageSize: false,
                height: null,
                pageRanges: '',
                margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
                displayHeaderFooter: false,
                scale: 1
              }
            }
          } else {
            pdfRequestBody = {
              url: currentUrl,
              viewportWidth: viewport,
              filename: `export_${new Date().toISOString().slice(0,10)}.pdf`,
              pdfOptions: {
                printBackground: true,
                format: 'A4',
                preferCSSPageSize: false,
                margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
                displayHeaderFooter: false,
                scale: 1
              }
            }
          }

          setStatusMessage('正在生成PDF...')
          const debugPreview = ((): string | null => {
            if ((pdfRequestBody as any).html) return (pdfRequestBody as any).html as string
            return null
          })()
          console.log('📤 发送PDF生成请求:', {
            url: campusService,
            bodySize: JSON.stringify(pdfRequestBody).length,
            hasHtml: Boolean((pdfRequestBody as any).html),
            hasUrl: Boolean((pdfRequestBody as any).url),
            viewport: viewport,
            filename: 'campus_export.pdf'
          })
          if (debugPreview) {
            console.log('📄 HTML内容预览 (前500字符):', debugPreview.substring(0, 500))
            console.log('📄 HTML内容预览 (后500字符):', debugPreview.substring(debugPreview.length - 500))
          }
          
          const controller = new AbortController()
          const id = setTimeout(() => controller.abort(), 30000) // 30秒超时
          
          const resp = await fetch(campusService, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'x-pdf-key': 'huawei-pdf-2024-secure-key', // 华为云服务密钥
              // 添加必要的CORS头
              'Access-Control-Request-Method': 'POST',
              'Access-Control-Request-Headers': 'Content-Type, x-pdf-key'
            },
            body: JSON.stringify(pdfRequestBody),
            signal: controller.signal,
            mode: 'cors',
            credentials: 'include' // 让Next API接收到cookie并转发给服务端，保证登录态
          })
          
          console.log('📥 收到PDF服务响应:', {
            status: resp.status,
            statusText: resp.statusText,
            headers: Object.fromEntries(resp.headers.entries()),
            ok: resp.ok
          })
          
          clearTimeout(id)
          
          if (resp.ok) {
            setStatusMessage('下载中...')
            const blob = await resp.blob()
            const a = document.createElement('a')
            const u = URL.createObjectURL(blob)
            a.href = u
            const outName = `export_campus_${new Date().toISOString().slice(0,10)}.pdf`
            a.download = outName
            document.body.appendChild(a)
            a.click()
            a.remove(); URL.revokeObjectURL(u)
            setIsLoading(false)
            setStatusMessage('')
            return
          } else {
            const errorText = await resp.text().catch(() => '')
            throw new Error(`校内服务错误: ${resp.status} ${errorText}`)
          }
        } catch (err) {
          console.error('🚨 校内PDF服务调用失败详情:', err)
          console.error('🔗 请求URL:', campusService)
          const environmentInfo = {
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            isLocalDev,
            isIntranet,
            isCampusVPN,
            canUseCampusService,
            userAgent: navigator.userAgent.substring(0, 100)
          }
          console.error('🌐 当前环境:', environmentInfo)
          const errorMsg = err instanceof Error ? err.message : String(err)
          
          if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
            setStatusMessage('⚠️ 无法连接PDF服务，尝试使用客户端导出（已修复OKLCH）...')
          } else {
            setStatusMessage(`PDF服务连接失败，尝试使用客户端导出（已修复OKLCH）...`)
          }
          // 不中断，继续走客户端兜底导出
        }
      }

      // 2) 客户端生成（已加入OKLCH兼容修复）
      setStatusMessage('使用客户端生成PDF...')
      
      // 使用改进的客户端PDF生成逻辑（类似ClientPdfButton）
      const contentElement = document.querySelector('main') || document.querySelector('#root') || document.body
      if (!contentElement) {
        throw new Error('未找到要导出的内容')
      }

      // 创建临时容器进行客户端PDF生成
      const tempContainer = document.createElement('div')
      tempContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: -9999px;
        width: ${viewport}px;
        background: white;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #000;
        overflow: visible;
      `
      
      const clonedContent = contentElement.cloneNode(true) as HTMLElement
      
      // 温和修复oklch颜色函数问题 - 只针对problematic颜色进行替换
      const fixModernColors = (element: HTMLElement) => {
        // 1. 只针对CSS样式表中的oklch函数进行替换
        const styleSheets = Array.from(document.styleSheets)
        const problematicRules: string[] = []
        
        styleSheets.forEach(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || sheet.rules || [])
            rules.forEach(rule => {
              const cssText = rule.cssText
              if (cssText && (cssText.includes('oklch(') || cssText.includes('lch(') || cssText.includes('lab('))) {
                problematicRules.push(cssText)
              }
            })
          } catch (e) {
            // 忽略跨域样式表
          }
        })
        
        // 2. 只有发现problematic CSS规则时才添加覆盖样式
        if (problematicRules.length > 0) {
          const colorFixStyle = document.createElement('style')
          colorFixStyle.textContent = `
            /* 仅替换已知的oklch颜色类 */
            .text-blue-600 { color: #2563eb !important; }
            .text-blue-500 { color: #3b82f6 !important; }
            .bg-blue-600 { background-color: #2563eb !important; }
            .bg-blue-500 { background-color: #3b82f6 !important; }
            .border-blue-500 { border-color: #3b82f6 !important; }
            .text-slate-900 { color: #0f172a !important; }
            .text-slate-800 { color: #1e293b !important; }
            .text-slate-700 { color: #334155 !important; }
            .text-slate-600 { color: #475569 !important; }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .bg-slate-100 { background-color: #f1f5f9 !important; }
          `
          element.appendChild(colorFixStyle)
        }
        
        // 3. 遍历元素，只修复包含现代颜色函数的内联样式
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_ELEMENT,
          null
        )
        
        const elementsToFix: Element[] = []
        let node = walker.nextNode()
        while (node) {
          elementsToFix.push(node as Element)
          node = walker.nextNode()
        }
        
        elementsToFix.forEach(el => {
          const htmlEl = el as HTMLElement
          
          // 4. 只修复内联样式中的现代颜色函数
          if (htmlEl.style.cssText) {
            let styleText = htmlEl.style.cssText
            let needsUpdate = false
            
            // 检查是否包含现代颜色函数
            if (styleText.includes('oklch(') || styleText.includes('lch(') || styleText.includes('lab(')) {
              console.log('🎨 发现现代颜色函数，进行替换:', styleText)
              
              // 替换现代颜色函数为传统RGB值
              styleText = styleText.replace(/oklch\([^)]*\)/gi, (match) => {
                needsUpdate = true
                console.log('🔧 替换oklch:', match)
                // 尝试提取亮度值来决定颜色
                if (match.includes('0.9') || match.includes('90')) return '#f8f9fa' // 浅色
                if (match.includes('0.1') || match.includes('10')) return '#212529' // 深色
                return '#6c757d' // 中性色
              })
              styleText = styleText.replace(/lch\([^)]*\)/gi, (match) => {
                console.log('🔧 替换lch:', match)
                needsUpdate = true
                return '#6c757d'
              })
              styleText = styleText.replace(/lab\([^)]*\)/gi, (match) => {
                console.log('🔧 替换lab:', match)
                needsUpdate = true
                return '#6c757d'
              })
              
              if (needsUpdate) {
                console.log('✅ 更新样式:', styleText)
                htmlEl.style.cssText = styleText
              }
            }
            
            // 特别处理background和background-image中的渐变
            const backgroundProps = ['background', 'backgroundImage']
            backgroundProps.forEach(prop => {
              const bgValue = window.getComputedStyle(htmlEl).getPropertyValue(prop)
              if (bgValue && (bgValue.includes('oklch(') || bgValue.includes('lch(') || bgValue.includes('lab('))) {
                console.log('🌈 发现渐变中的现代颜色函数:', bgValue)
                let safeBg = bgValue
                  .replace(/oklch\([^)]*\)/gi, '#6c757d')
                  .replace(/lch\([^)]*\)/gi, '#6c757d')
                  .replace(/lab\([^)]*\)/gi, '#6c757d')
                htmlEl.style.setProperty(prop, safeBg, 'important')
                console.log('✅ 替换后的渐变:', safeBg)
              }
            })
          }
        })
      }
      
      // 深度修复：在克隆前先处理当前文档常见类名/变量
      fixModernColors(clonedContent)
      
      // 在克隆文档中执行的深度清理函数（style标签/内联样式）
      const deepSanitizeOklch = (doc: Document) => {
        try {
          // 1) 替换所有<style>内容中的现代颜色函数
          const styleTags = Array.from(doc.querySelectorAll('style'))
          styleTags.forEach(tag => {
            if (tag.textContent && /oklch\(|lch\(|lab\(/i.test(tag.textContent)) {
              tag.textContent = tag.textContent
                .replace(/oklch\([^)]*\)/gi, '#6c757d')
                .replace(/lch\([^)]*\)/gi, '#6c757d')
                .replace(/lab\([^)]*\)/gi, '#6c757d')
            }
          })
          
          // 2) 替换所有元素的inline style中的现代颜色函数
          const allEls = doc.querySelectorAll('*')
          allEls.forEach(el => {
            const he = el as HTMLElement
            if (he.getAttribute && he.getAttribute('style')) {
              const s = he.getAttribute('style') || ''
              if (/oklch\(|lch\(|lab\(/i.test(s)) {
                he.setAttribute('style', s
                  .replace(/oklch\([^)]*\)/gi, '#6c757d')
                  .replace(/lch\([^)]*\)/gi, '#6c757d')
                  .replace(/lab\([^)]*\)/gi, '#6c757d'))
              }
            }
          })
          
          // 3) 注入一层强制覆盖的安全调色板
          const override = doc.createElement('style')
          override.textContent = `
            .text-blue-600 { color: #2563eb !important; }
            .text-blue-500 { color: #3b82f6 !important; }
            .bg-blue-600 { background-color: #2563eb !important; }
            .bg-blue-500 { background-color: #3b82f6 !important; }
            .text-slate-900 { color: #0f172a !important; }
            .text-slate-800 { color: #1e293b !important; }
            .text-slate-700 { color: #334155 !important; }
            .text-slate-600 { color: #475569 !important; }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .bg-slate-100 { background-color: #f1f5f9 !important; }
          `
          doc.head.appendChild(override)
        } catch {}
      }

      // 基于计算样式与SVG属性的兜底清理（将计算得到的OKLCH颜色转为安全色并写入inline）
      const applyComputedFallbacks = (root: HTMLElement) => {
        const colorProps = [
          'color','background','backgroundColor','borderColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor',
          'outlineColor','textShadow','boxShadow','fill','stroke'
        ]
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
        const elements: Element[] = []
        let n = walker.nextNode()
        while (n) { elements.push(n as Element); n = walker.nextNode() }

        elements.forEach(el => {
          const he = el as HTMLElement
          // 1) 计算样式字段
          const cs = window.getComputedStyle(he)
          colorProps.forEach(p => {
            const v = cs.getPropertyValue(p as any)
            if (v && /(oklch\(|lch\(|lab\()/i.test(v)) {
              const fallback = p.includes('background') ? '#ffffff' : (p.includes('shadow') ? 'none' : '#6c757d')
              he.style.setProperty(p as any, fallback, 'important')
            }
          })
          // 2) SVG常见属性
          if ((el as any).namespaceURI && (el as any).namespaceURI.includes('svg')) {
            ['fill','stroke','stop-color'].forEach(attr => {
              const val = (el as Element).getAttribute(attr)
              if (val && /(oklch\(|lch\(|lab\()/i.test(val)) {
                (el as Element).setAttribute(attr, attr === 'fill' ? '#6c757d' : '#0f172a')
              }
            })
          }
        })
      }
      tempContainer.appendChild(clonedContent)
      document.body.appendChild(tempContainer)
      
      // 等待渲染
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 最后一步：彻底清理所有可能的oklch残留
      console.log('🧹 开始最终的oklch清理...')
      const allElements = tempContainer.querySelectorAll('*')
      allElements.forEach(el => {
        const htmlEl = el as HTMLElement
        // 检查所有可能包含颜色的CSS属性
        const colorProps = [
          'color', 'backgroundColor', 'borderColor', 'background', 'backgroundImage',
          'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
          'fill', 'stroke', 'outlineColor', 'boxShadow', 'textShadow'
        ]
        
        colorProps.forEach(prop => {
          const value = htmlEl.style.getPropertyValue(prop)
          if (value && (value.includes('oklch') || value.includes('lch') || value.includes('lab'))) {
            console.log(`🎯 清理 ${prop}:`, value)
            const cleanValue = value
              .replace(/oklch\([^)]*\)/gi, '#6c757d')
              .replace(/lch\([^)]*\)/gi, '#6c757d')
              .replace(/lab\([^)]*\)/gi, '#6c757d')
            htmlEl.style.setProperty(prop, cleanValue, 'important')
            console.log(`✅ 清理完成 ${prop}:`, cleanValue)
          }
        })
      })
      
      // 动态导入html2canvas和jsPDF
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ])

      // 封装一次绘制，失败时重试更强清理
      const renderCanvas = async (strict: boolean) => {
        return await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          foreignObjectRendering: false,
          imageTimeout: 15000,
          logging: false,
          onclone: (clonedDoc) => {
            // 基础修复
            const extra = clonedDoc.createElement('style')
            extra.textContent = 'body{background:#fff !important}'
            clonedDoc.head.appendChild(extra)
            // 严格模式：深度移除OKLCH
            if (strict) {
              deepSanitizeOklch(clonedDoc)
              applyComputedFallbacks(clonedDoc.body as unknown as HTMLElement)
            }
          }
        })
      }

      let canvas
      try {
        // 先尝试宽松模式（更快），随后严格模式兜底
        applyComputedFallbacks(tempContainer)
        canvas = await renderCanvas(false)
      } catch (e) {
        console.warn('html2canvas 初次渲染失败，启用严格清理后重试...', e)
        canvas = await renderCanvas(true)
      }
      
      // 清理临时元素
      document.body.removeChild(tempContainer)
      
      // 生成PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
      
      // 下载
      const finalName = `export_client_${new Date().toISOString().slice(0,10)}.pdf`
      pdf.save(finalName)
      setStatusMessage('')
    } catch (err) {
      console.error('外部 PDF 服务导出失败', err)
      alert(err instanceof Error ? err.message : '导出失败')
    } finally {
      setIsLoading(false)
      setStatusMessage('')
    }
  }

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <select value={viewport} onChange={e => setViewport(Number(e.target.value))} className="border px-2 py-1 text-sm">
          <option value={1920}>1920</option>
          <option value={1366}>1366</option>
          <option value={1280}>1280</option>
          <option value={1024}>1024</option>
          <option value={800}>800</option>
        </select>

        <Button onClick={handleExport} disabled={isLoading} size="sm">
          {isLoading ? (statusMessage || '导出中...') : '导出（校内服务）'}
        </Button>
      </div>
      

      
      <div className="text-xs text-muted-foreground mt-1">
        {statusMessage ? (
          <span className={statusMessage.includes('⚠️') || statusMessage.includes('失败') ? 'text-orange-600' : 'text-blue-600'}>
            {statusMessage}
          </span>
        ) : (
          `使用华为云 PDF 服务生成高质量PDF，支持公网访问。`
        )}
      </div>
    </div>
  )
}


