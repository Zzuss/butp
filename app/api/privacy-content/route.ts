import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import mammoth from 'mammoth'

interface PrivacyContent {
  title: string
  content: string
  lastUpdated: string
  fileType: string
}

// GET - 从Supabase Storage读取隐私条款内容
export async function GET() {
  try {
    // 首先从数据库获取当前活跃的隐私条款信息
    const { data: policyRecord, error: dbError } = await supabase
      .from('privacy_policy')
      .select('*')
      .eq('is_active', true)
      .single()

    if (dbError && dbError.code !== 'PGRST116') {
      console.error('查询数据库失败:', dbError)
      return NextResponse.json({
        success: false,
        error: '查询数据库失败: ' + dbError.message
      }, { status: 500 })
    }

    // 如果数据库中有记录且有文件路径，从Storage读取
    if (policyRecord?.file_path) {
      try {
        const storageFileName = policyRecord.file_path.replace('privacy-files/', '')
        
        // 从Supabase Storage下载文件
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('privacy-files')
          .download(storageFileName)

        if (downloadError) {
          console.error('从Storage下载文件失败:', downloadError)
          return NextResponse.json({
            success: false,
            error: '从Storage下载文件失败: ' + downloadError.message
          }, { status: 500 })
        }

        // 根据文件类型处理内容
        const content = await processFileContent(fileData, policyRecord.file_type, storageFileName)
        
        return NextResponse.json({
          success: true,
          data: {
            ...content,
            fileName: policyRecord.file_name,
            fileSize: policyRecord.file_size,
            fileModified: policyRecord.updated_at
          }
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })

      } catch (storageError) {
        console.error('Storage操作失败:', storageError)
        return NextResponse.json({
          success: false,
          error: 'Storage操作失败: ' + storageError.message
        }, { status: 500 })
      }
    }

    // 最后的后备方案：返回默认内容
    return NextResponse.json({
      success: true,
      data: {
        title: '隐私政策与用户数据使用条款',
        content: '隐私条款内容正在加载中，请稍后刷新页面...',
        lastUpdated: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
        fileType: 'default'
      }
    })

  } catch (error) {
    console.error('读取隐私条款失败:', error)
    return NextResponse.json({
      success: false,
      error: '读取隐私条款失败: ' + error.message
    }, { status: 500 })
  }
}

// 处理不同类型的文件内容
async function processFileContent(fileBlob: Blob, fileType: string, fileName: string): Promise<PrivacyContent> {
  const defaultTitle = '隐私政策与用户数据使用条款'
  const defaultDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
  
  try {
    const extension = fileName.split('.').pop()?.toLowerCase() || 'txt'
    
    switch (extension) {
      case 'docx':
      case 'doc':
        const arrayBuffer = await fileBlob.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        
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
        const textContent = await fileBlob.text()
        const textLines = textContent.split('\n').filter(line => line.trim())
        const textTitle = textLines[0]?.replace(/^#\s*/, '') || defaultTitle
        
        return {
          title: textTitle,
          content: textContent,
          lastUpdated: defaultDate,
          fileType: 'text'
        }
        
      case 'html':
        const htmlContent = await fileBlob.text()
        // 简单提取文本内容
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
          content: `此隐私条款为 PDF 格式文件：${fileName}\n\n由于技术限制，无法直接显示PDF内容。请联系管理员获取文档内容，或要求管理员上传文本格式版本。`,
          lastUpdated: defaultDate,
          fileType: 'pdf'
        }
        
      default:
        // 尝试作为文本处理
        const unknownContent = await fileBlob.text()
        return {
          title: defaultTitle,
          content: unknownContent,
          lastUpdated: defaultDate,
          fileType: 'unknown'
        }
    }
  } catch (error) {
    console.error(`处理文件内容失败 (${fileName}):`, error)
    return {
      title: defaultTitle,
      content: '文件内容解析失败，请联系管理员检查文件格式',
      lastUpdated: defaultDate,
      fileType: 'error'
    }
  }
}