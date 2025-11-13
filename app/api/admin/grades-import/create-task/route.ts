import { NextResponse } from 'next/server'
import { getAllFilesMetadata } from '../upload/route'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL!
// 优先使用服务角色密钥，如果没有则使用匿名密钥
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 
                   process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY!

export const maxDuration = 30

export async function POST() {
  try {
    // 验证Supabase配置
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase配置缺失:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey,
        env: process.env.NODE_ENV 
      })
      throw new Error('Supabase配置缺失')
    }
    
    // 检测密钥类型
    let keyType = 'unknown'
    try {
      const payload = JSON.parse(atob(supabaseKey.split('.')[1]))
      keyType = payload.role || 'unknown'
    } catch (e) {
      keyType = 'invalid'
    }
    
    console.log('🔗 Supabase配置:', { 
      url: supabaseUrl.substring(0, 30) + '...', 
      keyLength: supabaseKey.length,
      keyType: keyType
    })
    
    // 如果使用匿名密钥，给出警告
    if (keyType === 'anon') {
      console.warn('⚠️ 使用匿名密钥，可能没有足够权限执行数据库操作')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 先调用文件列表API获取最新的文件状态
    let baseUrl = 'http://localhost:3000'
    
    // 在Vercel环境中使用正确的URL
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    } else if (process.env.NODE_ENV === 'production') {
      baseUrl = 'https://butp.tech' // 使用你的实际域名
    }
    
    console.log('🌐 调用文件列表API:', `${baseUrl}/api/admin/grades-import/files`)
    
    const filesResponse = await fetch(`${baseUrl}/api/admin/grades-import/files`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!filesResponse.ok) {
      console.error('文件列表API调用失败:', filesResponse.status, filesResponse.statusText)
      throw new Error(`文件列表API调用失败: ${filesResponse.status}`)
    }
    
    const filesData = await filesResponse.json()
    const files = filesData.success ? filesData.files : []
    
    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: '没有可导入的文件，请先上传Excel文件' },
        { status: 400 }
      )
    }

    // 创建导入任务
    console.log('📝 尝试创建导入任务，文件数量:', files.length)
    
    const { data: task, error: taskError } = await supabase
      .from('import_tasks')
      .insert({
        total_files: files.length,
        status: 'pending'
      })
      .select()
      .single()

    if (taskError) {
      console.error('创建任务失败详情:', {
        code: taskError.code,
        message: taskError.message,
        details: taskError.details,
        hint: taskError.hint
      })
      
      // 如果是权限问题，提供更友好的错误信息
      if (taskError.code === '42501' || taskError.message.includes('permission')) {
        throw new Error(`数据库权限不足，请检查RLS策略。错误: ${taskError.message}`)
      }
      
      throw new Error(`创建任务失败: ${taskError.message}`)
    }
    
    console.log('✅ 任务创建成功，ID:', task.id)

    // 创建文件处理详情
    const fileDetails = files.map((file: any) => ({
      task_id: task.id,
      file_id: file.id,
      file_name: file.name,
      status: 'pending'
    }))

    console.log('📝 尝试创建文件详情，数量:', fileDetails.length)
    
    const { error: detailsError } = await supabase
      .from('import_file_details')
      .insert(fileDetails)

    if (detailsError) {
      console.error('创建文件详情失败:', {
        code: detailsError.code,
        message: detailsError.message,
        details: detailsError.details
      })
      
      // 回滚任务
      console.log('🔄 回滚任务:', task.id)
      await supabase.from('import_tasks').delete().eq('id', task.id)
      
      if (detailsError.code === '42501' || detailsError.message.includes('permission')) {
        throw new Error(`文件详情权限不足，请检查RLS策略。错误: ${detailsError.message}`)
      }
      
      throw new Error(`创建文件详情失败: ${detailsError.message}`)
    }
    
    console.log('✅ 文件详情创建成功')

    return NextResponse.json({
      success: true,
      taskId: task.id,
      message: `已创建导入任务，包含 ${files.length} 个文件`
    })

  } catch (error) {
    console.error('创建导入任务失败:', error)
    console.error('错误堆栈:', error instanceof Error ? error.stack : '无堆栈信息')
    console.error('环境信息:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey
    })
    
    return NextResponse.json(
      {
        success: false,
        message: '创建导入任务失败',
        error: error instanceof Error ? error.message : '未知错误',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
