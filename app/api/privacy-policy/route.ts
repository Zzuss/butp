import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// GET - 获取当前活跃的隐私条款（公开接口）
export async function GET() {
  try {
    // 查询当前活跃的隐私条款
    const { data: privacyPolicy, error } = await supabase
      .from('privacy_policy')
      .select('id, title, file_name, file_path, file_type, version, effective_date, created_at, updated_at, original_content')
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('❌ 查询隐私条款失败:', error)
      return NextResponse.json({
        success: false,
        error: '查询隐私条款失败'
      }, { status: 500 })
    }

    if (!privacyPolicy) {
      return NextResponse.json({
        success: false,
        error: '未找到活跃的隐私条款'
      }, { status: 404 })
    }

    let content = ''
    
    // 尝试读取文件内容
    try {
      const filePath = join(process.cwd(), privacyPolicy.file_path)
      
      if (existsSync(filePath)) {
        // 只读取文本类型文件
        if (privacyPolicy.file_type?.startsWith('text/') || 
            privacyPolicy.file_name?.match(/\.(txt|md|html)$/i)) {
          const fileBuffer = await readFile(filePath)
          content = fileBuffer.toString('utf-8')
        } else {
          // 对于PDF等非文本文件，提供下载链接
          content = `此隐私条款为 ${privacyPolicy.file_type || 'PDF'} 格式文件。\n\n请联系管理员或通过系统下载查看完整内容。`
        }
      } else {
        // 文件不存在，使用数据库中保存的内容
        content = privacyPolicy.original_content || '隐私条款文件暂时无法访问，请联系管理员。'
      }
    } catch (fileError) {
      console.error('❌ 读取隐私条款文件失败:', fileError)
      // 使用数据库中保存的备份内容
      content = privacyPolicy.original_content || '隐私条款文件读取失败，请联系管理员。'
    }

    return NextResponse.json({
      success: true,
      data: {
        id: privacyPolicy.id,
        title: privacyPolicy.title,
        content: content,
        version: privacyPolicy.version,
        effective_date: privacyPolicy.effective_date,
        created_at: privacyPolicy.created_at,
        updated_at: privacyPolicy.updated_at,
        file_name: privacyPolicy.file_name,
        file_type: privacyPolicy.file_type
      }
    })

  } catch (error) {
    console.error('❌ 隐私条款API错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 })
  }
}
