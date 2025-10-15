import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import mammoth from 'mammoth'
import { existsSync } from 'fs'

interface PrivacyContent {
  title: string
  content: string
  lastUpdated: string
  fileType: string
}

export async function GET() {
  try {
    const baseName = '隐私政策与用户数据使用条款_clean_Aug2025'
    const possibleExtensions = ['docx', 'doc', 'pdf', 'txt', 'html']
    const publicPath = join(process.cwd(), 'public')
    
    for (const ext of possibleExtensions) {
      const fileName = `${baseName}.${ext}`
      const filePath = join(publicPath, fileName)
      
      if (existsSync(filePath)) {
        console.log(`找到文件: ${fileName}`)
        
        const fileStats = await stat(filePath)
        console.log(`文件修改时间: ${fileStats.mtime.toISOString()}`)
        console.log(`文件大小: ${fileStats.size} bytes`)
        
        const result = await readFileContent(filePath, ext)
        
        return NextResponse.json({
          success: true,
          data: {
            ...result,
            fileName,
            fileSize: fileStats.size,
            fileModified: fileStats.mtime.toISOString()
          }
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      }
    }
    
    return NextResponse.json({
      success: false,
      error: '未找到隐私条款文件'
    }, { status: 404 })
    
  } catch (error) {
    console.error('读取隐私条款失败:', error)
    return NextResponse.json({
      success: false,
      error: '读取隐私条款失败: ' + error.message
    }, { status: 500 })
  }
}

async function readFileContent(filePath: string, extension: string): Promise<PrivacyContent> {
  const defaultTitle = '隐私政策与用户数据使用条款'
  const defaultDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
  
  switch (extension.toLowerCase()) {
    case 'docx':
    case 'doc':
      const fileBuffer = await readFile(filePath)
      const result = await mammoth.extractRawText({ arrayBuffer: fileBuffer })
      
      const text = result.value
      const lines = text.split('\n').filter(line => line.trim())
      const title = lines[0] || defaultTitle
      
      // 查找更新时间
      let lastUpdated = defaultDate
      const datePatterns = [
        /最后更新时间[：:]\s*([^\n]+)/,
        /更新时间[：:]\s*([^\n]+)/,
        /(\d{4}年\d{1,2}月)/,
        /(\d{4}-\d{1,2}-\d{1,2})/
      ]
      
      for (const pattern of datePatterns) {
        const match = text.match(pattern)
        if (match) {
          lastUpdated = match[1]
          break
        }
      }

      return {
        title,
        content: text,
        lastUpdated,
        fileType: 'word'
      }
      
    case 'txt':
      const textContent = await readFile(filePath, 'utf-8')
      const textLines = textContent.split('\n').filter(line => line.trim())
      const textTitle = textLines[0]?.replace(/^#\s*/, '') || defaultTitle
      
      return {
        title: textTitle,
        content: textContent,
        lastUpdated: defaultDate,
        fileType: 'text'
      }
      
    case 'html':
      const htmlContent = await readFile(filePath, 'utf-8')
      // 简单提取文本内容（这里可以用更复杂的HTML解析）
      const htmlText = htmlContent.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      
      const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i) || 
                        htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i)
      const htmlTitle = titleMatch ? titleMatch[1].trim() : defaultTitle
      
      return {
        title: htmlTitle,
        content: htmlText,
        lastUpdated: defaultDate,
        fileType: 'html'
      }
      
    case 'pdf':
      return {
        title: defaultTitle,
        content: '此隐私条款为 PDF 格式文件。由于浏览器限制，无法直接显示PDF内容。请下载文件查看完整内容。',
        lastUpdated: defaultDate,
        fileType: 'pdf'
      }
      
    default:
      throw new Error(`不支持的文件格式: ${extension}`)
  }
}
