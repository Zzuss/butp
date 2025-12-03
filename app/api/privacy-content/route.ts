import { NextRequest, NextResponse } from 'next/server'
import { getStorageSupabase } from '@/lib/storageSupabase'
import mammoth from 'mammoth'

interface PrivacyContent {
  title: string
  content: string
  lastUpdated: string
  fileType: string
}

// GET - 直接从Supabase Storage读取隐私条款内容
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 直接从Storage读取隐私条款文件')

    // 获取 Supabase 客户端
    const storageSupabase = getStorageSupabase()

    // 固定文件名：privacy-policy-latest.* (支持多种格式)
    const possibleFiles = [
      'privacy-policy-latest.docx',
      'privacy-policy-latest.doc', 
      'privacy-policy-latest.pdf',
      'privacy-policy-latest.txt',
      'privacy-policy-latest.html'
    ]

    let fileData: Blob | null = null
    let fileName = ''
    let fileInfo: any = null

    // 尝试找到存在的文件
    for (const testFileName of possibleFiles) {
      try {
        console.log(`🔍 尝试下载文件: ${testFileName}`)
        
        // 先获取文件信息（包含修改时间）
        const { data: files, error: listError } = await storageSupabase.storage
          .from('privacy-files')
          .list('', {
            search: testFileName
          })

        if (!listError && files && files.length > 0) {
          fileInfo = files[0]
          console.log(`📋 找到文件信息:`, fileInfo)
        }

        // 下载文件
        const { data: downloadData, error: downloadError } = await storageSupabase.storage
          .from('privacy-files')
          .download(testFileName)

        if (!downloadError && downloadData) {
          fileData = downloadData
          fileName = testFileName
          console.log(`✅ 成功下载文件: ${testFileName}`)
          break
        }
      } catch (err) {
        console.log(`⚠️ 文件 ${testFileName} 不存在，继续尝试下一个`)
        continue
      }
    }

    if (!fileData) {
      console.error('❌ 未找到任何隐私条款文件')
      return NextResponse.json({
        success: false,
        error: '未找到隐私条款文件'
      }, { status: 404 })
    }

    // 获取文件类型
    const fileExtension = fileName.split('.').pop()?.toLowerCase()
    const mimeTypeMap: { [key: string]: string } = {
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'html': 'text/html'
    }
    const fileType = mimeTypeMap[fileExtension || ''] || 'application/octet-stream'

    // 处理文件内容
    const content = await processFileContent(fileData, fileType, fileName)
    
    return NextResponse.json({
      success: true,
      data: {
        ...content,
        fileName: fileName,
        fileSize: fileData.size,
        fileModified: fileInfo?.updated_at || fileInfo?.created_at || new Date().toISOString(),
        lastModified: fileInfo?.updated_at || fileInfo?.created_at || new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache', 
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('读取隐私条款失败:', error)
    return NextResponse.json({
      success: false,
      error: '读取隐私条款失败: ' + (error as Error).message
    }, { status: 500 })
  }
}

// 处理不同类型的文件内容
async function processFileContent(fileBlob: Blob, fileType: string, fileName: string): Promise<PrivacyContent> {
  const defaultTitle = '隐私政策与用户数据使用条款'
  const defaultDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
  
  console.log(`开始处理文件: ${fileName}, 类型: ${fileType}, 文件大小: ${fileBlob.size} bytes`)
  
  try {
    const extension = fileName.split('.').pop()?.toLowerCase() || 'txt'
    console.log(`文件扩展名: ${extension}`)
    
    switch (extension) {
      case 'docx':
      case 'doc':
        try {
          console.log('开始处理Word文档...')
          const arrayBuffer = await fileBlob.arrayBuffer()
          console.log(`ArrayBuffer大小: ${arrayBuffer.byteLength}`)
          
          // 尝试多种方式处理mammoth
          let result
          try {
            // 方法1: 直接使用arrayBuffer
            result = await mammoth.extractRawText({ arrayBuffer })
            console.log('方法1 (arrayBuffer) 成功')
          } catch (error1) {
            console.log('方法1失败，尝试方法2 (buffer):', error1.message)
            // 方法2: 转换为Buffer
            const buffer = Buffer.from(arrayBuffer)
            result = await mammoth.extractRawText({ buffer })
            console.log('方法2 (buffer) 成功')
          }
          
          const text = result.value || ''
          console.log(`文本提取成功，长度: ${text.length}`)
          
          if (!text.trim()) {
            return {
              title: defaultTitle,
              content: '文档内容为空，请检查文件是否正确上传',
              lastUpdated: defaultDate,
              fileType: 'word'
            }
          }
          
          const lines = text.split('\n').filter(line => line.trim())
          const title = lines[0]?.substring(0, 100) || defaultTitle
          
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
              lastUpdated = match[1].trim()
              break
            }
          }

          console.log(`Word文档处理完成，标题: ${title.substring(0, 50)}...`)
          return {
            title,
            content: text,
            lastUpdated,
            fileType: 'word'
          }
          
        } catch (wordError) {
          console.error('Word文档处理失败:', wordError)
          return {
            title: defaultTitle,
            content: `Word文档解析失败: ${wordError.message}\n\n请确保上传的是有效的.docx或.doc文件。`,
            lastUpdated: defaultDate,
            fileType: 'word-error'
          }
        }
        
      case 'txt':
        console.log('处理文本文件...')
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
        console.log('处理HTML文件...')
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
        console.log('处理PDF文件...')
        return {
          title: defaultTitle,
          content: `此隐私条款为 PDF 格式文件：${fileName}\n\n由于技术限制，无法直接显示PDF内容。请联系管理员获取文档内容，或要求管理员上传Word格式版本。`,
          lastUpdated: defaultDate,
          fileType: 'pdf'
        }
        
      default:
        console.log('处理未知格式文件，尝试作为文本...')
        try {
          const unknownContent = await fileBlob.text()
          return {
            title: defaultTitle,
            content: unknownContent,
            lastUpdated: defaultDate,
            fileType: 'unknown'
          }
        } catch (unknownError) {
          console.error('未知格式文件处理失败:', unknownError)
          return {
            title: defaultTitle,
            content: `不支持的文件格式: ${extension}`,
            lastUpdated: defaultDate,
            fileType: 'unsupported'
          }
        }
    }
  } catch (error) {
    console.error(`处理文件内容失败 (${fileName}):`, error)
    return {
      title: defaultTitle,
      content: '文件内容解析失败，请联系管理员检查文件格式。\n\n错误详情: ' + (error instanceof Error ? error.message : String(error)),
      lastUpdated: defaultDate,
      fileType: 'error'
    }
  }
}