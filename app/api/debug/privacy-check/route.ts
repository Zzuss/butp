import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getStorageSupabase } from '@/lib/storageSupabase'

// GET - 诊断隐私条款系统状态
export async function GET(request: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: [] as any[]
  }

  try {
    // 1. 检查Storage连接
    diagnostics.checks.push({ step: 1, name: 'Storage连接检查', status: 'checking' })
    
    try {
      const storageSupabase = getStorageSupabase()
      const { data: buckets, error: bucketsError } = await storageSupabase.storage.listBuckets()
      
      if (bucketsError) {
        diagnostics.checks[0] = { 
          step: 1, 
          name: 'Storage连接检查', 
          status: 'failed', 
          error: bucketsError.message,
          details: bucketsError
        }
      } else {
        diagnostics.checks[0] = { 
          step: 1, 
          name: 'Storage连接检查', 
          status: 'success', 
          buckets: buckets?.map(b => b.name) || []
        }
      }
    } catch (storageError) {
      diagnostics.checks[0] = { 
        step: 1, 
        name: 'Storage连接检查', 
        status: 'error', 
        error: (storageError as Error).message
      }
    }

    // 2. 检查privacy-files bucket
    diagnostics.checks.push({ step: 2, name: 'privacy-files bucket检查', status: 'checking' })
    
    try {
      const storageSupabase = getStorageSupabase()
      const { data: files, error: filesError } = await storageSupabase.storage
        .from('privacy-files')
        .list('')

      if (filesError) {
        diagnostics.checks[1] = { 
          step: 2, 
          name: 'privacy-files bucket检查', 
          status: 'failed', 
          error: filesError.message,
          details: filesError
        }
      } else {
        diagnostics.checks[1] = { 
          step: 2, 
          name: 'privacy-files bucket检查', 
          status: 'success', 
          files: files?.map(f => ({ name: f.name, size: f.metadata?.size, updated: f.updated_at })) || []
        }
      }
    } catch (bucketError) {
      diagnostics.checks[1] = { 
        step: 2, 
        name: 'privacy-files bucket检查', 
        status: 'error', 
        error: (bucketError as Error).message
      }
    }

    // 3. 检查隐私条款文件
    diagnostics.checks.push({ step: 3, name: '隐私条款文件检查', status: 'checking' })
    
    const possibleFiles = [
      'privacy-policy-latest.docx',
      'privacy-policy-latest.doc', 
      'privacy-policy-latest.pdf',
      'privacy-policy-latest.txt',
      'privacy-policy-latest.html'
    ]

    let foundFile = null
    let fileInfo = null

    try {
      const storageSupabase = getStorageSupabase()
      
      for (const fileName of possibleFiles) {
        try {
          const { data: files, error: listError } = await storageSupabase.storage
            .from('privacy-files')
            .list('', { search: fileName })

          if (!listError && files && files.length > 0) {
            foundFile = fileName
            fileInfo = files[0]
            break
          }
        } catch (err) {
          continue
        }
      }

      if (foundFile && fileInfo) {
        diagnostics.checks[2] = { 
          step: 3, 
          name: '隐私条款文件检查', 
          status: 'success', 
          foundFile,
          fileInfo: {
            name: fileInfo.name,
            size: fileInfo.metadata?.size,
            updated_at: fileInfo.updated_at,
            created_at: fileInfo.created_at
          }
        }
      } else {
        diagnostics.checks[2] = { 
          step: 3, 
          name: '隐私条款文件检查', 
          status: 'failed', 
          error: '未找到任何隐私条款文件',
          searchedFiles: possibleFiles
        }
      }
    } catch (fileError) {
      diagnostics.checks[2] = { 
        step: 3, 
        name: '隐私条款文件检查', 
        status: 'error', 
        error: (fileError as Error).message
      }
    }

    // 4. 检查主数据库连接
    diagnostics.checks.push({ step: 4, name: '主数据库连接检查', status: 'checking' })
    
    try {
      const { data, error: dbError } = await supabase
        .from('user_privacy_agreements')
        .select('count', { count: 'exact', head: true })

      if (dbError) {
        diagnostics.checks[3] = { 
          step: 4, 
          name: '主数据库连接检查', 
          status: 'failed', 
          error: dbError.message,
          details: dbError
        }
      } else {
        diagnostics.checks[3] = { 
          step: 4, 
          name: '主数据库连接检查', 
          status: 'success', 
          recordCount: data
        }
      }
    } catch (dbError) {
      diagnostics.checks[3] = { 
        step: 4, 
        name: '主数据库连接检查', 
        status: 'error', 
        error: (dbError as Error).message
      }
    }

    // 5. 检查表结构
    diagnostics.checks.push({ step: 5, name: '表结构检查', status: 'checking' })
    
    try {
      const testRecord = {
        user_id: 'test_' + Date.now(),
        privacy_policy_file: 'test.docx',
        privacy_policy_version: new Date().toISOString(),
        agreed_at: new Date().toISOString(),
        ip_address: '127.0.0.1',
        user_agent: 'test',
        created_at: new Date().toISOString()
      }

      const { data: insertData, error: insertError } = await supabase
        .from('user_privacy_agreements')
        .insert(testRecord)
        .select()

      if (insertError) {
        diagnostics.checks[4] = { 
          step: 5, 
          name: '表结构检查', 
          status: 'failed', 
          error: insertError.message,
          details: insertError
        }
      } else {
        // 删除测试记录
        await supabase
          .from('user_privacy_agreements')
          .delete()
          .eq('user_id', testRecord.user_id)

        diagnostics.checks[4] = { 
          step: 5, 
          name: '表结构检查', 
          status: 'success', 
          message: '表结构正常，测试记录已删除'
        }
      }
    } catch (tableError) {
      diagnostics.checks[4] = { 
        step: 5, 
        name: '表结构检查', 
        status: 'error', 
        error: (tableError as Error).message
      }
    }

    // 6. 环境变量检查
    diagnostics.checks.push({ 
      step: 6, 
      name: '环境变量检查', 
      status: 'info',
      variables: {
        NODE_ENV: process.env.NODE_ENV,
        // 主数据库环境变量（实际使用的）
        hasSupabaseLocalUrl: !!process.env.NEXT_PUBLIC_SUPABASELOCAL_URL,
        hasSupabaseLocalKey: !!process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY,
        // Storage环境变量
        hasStorageUrl: !!process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL,
        hasStorageKey: !!process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY,
        // 检查是否配置了错误的环境变量名
        hasWrongSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasWrongSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    })

    return NextResponse.json({
      success: true,
      diagnostics
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      diagnostics
    }, { status: 500 })
  }
}
