"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Download, AlertCircle } from 'lucide-react'

export function AnalyzeHtmlContent() {
  const [analysis, setAnalysis] = useState<any>(null)

  const analyzeCurrentPage = () => {
    // 分析当前页面的资源依赖
    const analysis = {
      // 1. CSS 链接
      cssLinks: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(link => ({
        href: (link as HTMLLinkElement).href,
        isExternal: !(link as HTMLLinkElement).href.startsWith(window.location.origin)
      })),
      
      // 2. 内联样式
      inlineStyles: Array.from(document.querySelectorAll('style')).map((style, index) => ({
        id: index,
        content: style.textContent?.substring(0, 200) + '...',
        length: style.textContent?.length || 0
      })),
      
      // 3. 图片资源
      images: Array.from(document.querySelectorAll('img')).map(img => ({
        src: (img as HTMLImageElement).src,
        isExternal: !(img as HTMLImageElement).src.startsWith(window.location.origin)
      })),
      
      // 4. 字体资源
      fonts: Array.from(document.styleSheets).flatMap(sheet => {
        try {
          return Array.from(sheet.cssRules || []).filter(rule => 
            rule.cssText.includes('@font-face')
          ).map(rule => rule.cssText)
        } catch (e) {
          return [`无法访问样式表: ${sheet.href}`]
        }
      }),
      
      // 5. 生成的HTML预览
      generatedHtml: (() => {
        // 复制当前的HTML生成逻辑
        const mainContent = document.querySelector('main') || document.querySelector('.dashboard-content') || document.body
        
        const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1366, initial-scale=1">
  <title>PDF导出</title>
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
  </style>
</head>
<body>
  <div class="pdf-content">
    ${mainContent ? mainContent.innerHTML : document.body.innerHTML}
  </div>
</body>
</html>`
        
        return {
          length: htmlContent.length,
          preview: htmlContent.substring(0, 1000) + '...'
        }
      })()
    }
    
    setAnalysis(analysis)
    console.log('📊 页面资源分析:', analysis)
  }

  const downloadHtml = () => {
    if (!analysis) return
    
    const blob = new Blob([analysis.generatedHtml.preview], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'page-analysis.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          页面资源依赖分析
        </CardTitle>
        <CardDescription>
          分析当前页面的资源依赖，找出校内服务器无法访问的资源
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={analyzeCurrentPage} className="flex-1">
            <Search className="h-4 w-4 mr-2" />
            分析当前页面
          </Button>
          
          {analysis && (
            <Button onClick={downloadHtml} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              下载HTML预览
            </Button>
          )}
        </div>

        {analysis && (
          <div className="space-y-4">
            {/* CSS链接分析 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                CSS样式表 ({analysis.cssLinks.length})
              </h3>
              {analysis.cssLinks.length > 0 ? (
                <div className="space-y-1">
                  {analysis.cssLinks.map((css: any, index: number) => (
                    <div key={index} className={`text-xs p-2 rounded ${
                      css.isExternal ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
                    }`}>
                      <span className="font-mono break-all">{css.href}</span>
                      <span className="ml-2 text-xs">
                        {css.isExternal ? '❌ 外部资源' : '✅ 同域资源'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">无外部CSS链接</p>
              )}
            </div>

            {/* 内联样式分析 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">内联样式 ({analysis.inlineStyles.length})</h3>
              {analysis.inlineStyles.map((style: any) => (
                <div key={style.id} className="text-xs bg-blue-50 p-2 rounded mb-1">
                  <span className="font-medium">样式块 {style.id + 1}</span>
                  <span className="ml-2 text-blue-600">({style.length} 字符)</span>
                  <pre className="mt-1 text-xs">{style.content}</pre>
                </div>
              ))}
            </div>

            {/* 图片资源分析 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">图片资源 ({analysis.images.length})</h3>
              {analysis.images.length > 0 ? (
                <div className="space-y-1">
                  {analysis.images.map((img: any, index: number) => (
                    <div key={index} className={`text-xs p-2 rounded ${
                      img.isExternal ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
                    }`}>
                      <span className="font-mono break-all">{img.src}</span>
                      <span className="ml-2">
                        {img.isExternal ? '❌ 外部资源' : '✅ 同域资源'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">无图片资源</p>
              )}
            </div>

            {/* 字体分析 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">字体资源 ({analysis.fonts.length})</h3>
              {analysis.fonts.length > 0 ? (
                <div className="space-y-1">
                  {analysis.fonts.map((font: string, index: number) => (
                    <div key={index} className="text-xs bg-orange-50 p-2 rounded">
                      <pre className="font-mono">{font.substring(0, 100)}...</pre>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">无@font-face定义</p>
              )}
            </div>

            {/* HTML预览 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">生成的HTML预览</h3>
              <div className="text-sm text-gray-600 mb-2">
                总大小: {(analysis.generatedHtml.length / 1024).toFixed(2)} KB
              </div>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono max-h-48 overflow-auto">
                <pre>{analysis.generatedHtml.preview}</pre>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h4 className="font-medium text-orange-900 mb-2">⚠️ 关键问题:</h4>
          <ul className="text-sm text-orange-800 space-y-1">
            <li>• 校内服务器(10.3.58.3)无法访问localhost:3000的CSS文件</li>
            <li>• Next.js的样式文件无法加载，导致页面样式丢失</li>
            <li>• 需要将所有CSS内联到HTML中</li>
            <li>• 字体文件可能也无法加载</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
