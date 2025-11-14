import { NextRequest, NextResponse } from 'next/server'
import { getStorageSupabase } from '@/lib/storageSupabase'
import mammoth from 'mammoth'

interface PrivacyContent {
  title: string
  content: string
  lastUpdated: string
  fileType: string
}

// GET - 从Supabase Storage读取隐私条款内容
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Supabase Storage URL:', process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL)
    console.log('🔑 Supabase Storage Anon Key:', process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY ? '✅ 存在' : '❌ 未设置')

    // 获取 Supabase 客户端
    const storageSupabase = getStorageSupabase()

    // 尝试获取所有桶的列表
    const { data: buckets, error: bucketsError } = await storageSupabase.storage.listBuckets()
    console.log('🗃️ 可用的桶:', buckets?.map(bucket => bucket.name))
    if (bucketsError) {
      console.error('❌ 获取桶列表失败:', bucketsError)
    }

    // 首先从数据库获取当前活跃的隐私条款信息
    const { data: policyRecord, error: dbError } = await storageSupabase
      .from('privacy_policy')
      .select('*')
      .eq('is_active', true)
      .single()

    console.log('🔍 隐私条款记录:', {
      record: policyRecord,
      error: dbError
    })

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
        
        console.log('🔍 尝试下载文件:', {
          bucket: 'privacy-files',
          fileName: storageFileName
        })

        // 从Supabase Storage下载文件
        const { data: fileData, error: downloadError } = await storageSupabase.storage
          .from('privacy-files')
          .download(storageFileName)

        console.log('📥 文件下载结果:', {
          fileData: fileData ? `文件大小: ${fileData.size} 字节` : '无文件数据',
          downloadError
        })

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