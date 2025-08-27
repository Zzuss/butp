/**
 * Word文档读取工具
 * 用于从Word文档中提取文本内容
 */

import mammoth from 'mammoth'

export interface WordDocumentContent {
  title: string
  content: string
  lastUpdated: string
}

/**
 * 从Word文档URL读取内容
 * @param url Word文档的URL
 * @returns 文档内容
 */
export async function readWordDocument(url: string): Promise<WordDocumentContent> {
  try {
    // 获取Word文档
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    
    // 使用mammoth解析Word文档
    const result = await mammoth.extractRawText({ arrayBuffer })
    
    if (result.messages.length > 0) {
      console.warn('Word document parsing warnings:', result.messages)
    }

    // 提取文本内容
    const text = result.value
    
    // 尝试从文本中提取标题和更新时间
    const lines = text.split('\n').filter(line => line.trim())
    const title = lines[0] || '隐私政策与用户数据使用条款'
    
    // 查找更新时间（通常在文档开头或结尾）
    let lastUpdated = '2025年8月' // 默认值
    const datePatterns = [
      /最后更新时间[：:]\s*([^\n]+)/,
      /更新时间[：:]\s*([^\n]+)/,
      /版本[：:]\s*([^\n]+)/,
      /(\d{4}年\d{1,2}月)/,
      /(\d{4}-\d{1,2}-\d{1,2})/,
      /(\d{4}\/\d{1,2}\/\d{1,2})/
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
      lastUpdated
    }
    
  } catch (error) {
    console.error('读取Word文档失败:', error)
    throw new Error('无法读取Word文档内容')
  }
}
