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

/**
 * 获取默认的隐私条款内容（当无法读取Word文档时使用）
 * @returns 默认内容
 */
export function getDefaultPrivacyContent(): WordDocumentContent {
  return {
    title: "隐私政策与用户数据使用条款",
    lastUpdated: "2025年8月",
    content: `
隐私政策与用户数据使用条款

最后更新时间：2025年8月

1. 信息收集
我们收集您在使用BuTP系统时提供的以下信息：
- 学号哈希值
- 学业成绩数据
- 系统使用记录

2. 信息使用
我们使用收集的信息用于：
- 提供个性化的学业分析服务
- 改进系统功能和用户体验
- 生成学业报告和建议

3. 信息保护
我们采取适当的技术和组织措施来保护您的个人信息：
- 使用加密技术保护数据传输
- 限制对个人信息的访问权限
- 定期审查和更新安全措施

4. 信息共享
我们不会向第三方出售、交易或转让您的个人信息，除非：
- 获得您的明确同意
- 法律要求或政府机构要求
- 保护我们的权利和财产

5. 您的权利
您有权：
- 访问我们持有的关于您的个人信息
- 要求更正不准确的信息
- 要求删除您的个人信息
- 撤回同意

6. 数据保留
我们仅在必要时保留您的个人信息，通常不超过：
- 学业数据：在校期间及毕业后2年
- 系统日志：12个月
- 用户账户：直到您要求删除

7. 联系信息
如果您对本隐私政策有任何疑问，请联系：
- 邮箱：privacy@butp.edu.cn
- 电话：010-12345678

8. 政策更新
我们可能会不时更新本隐私政策。重大变更将通过以下方式通知您：
- 系统内通知
- 电子邮件通知
- 网站公告

9. 同意声明
通过点击"我同意"按钮，您确认：
- 已阅读并理解本隐私政策
- 同意我们按照本政策收集、使用和保护您的个人信息
- 了解您可以随时撤回同意

10. 生效日期
本隐私政策自2025年8月1日起生效。
    `.trim()
  }
}
