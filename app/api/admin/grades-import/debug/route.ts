import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY || 
                   process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    // 环境变量检查
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      supabaseUrlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'undefined',
      keyLength: supabaseKey ? supabaseKey.length : 0
    }

    // 检测密钥类型
    let keyType = 'unknown'
    try {
      const payload = JSON.parse(atob(supabaseKey.split('.')[1]))
      keyType = payload.role || 'unknown'
    } catch (e) {
      keyType = 'invalid'
    }

    // 测试Supabase连接
    let supabaseTest = { connected: false, error: null }
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await supabase.from('import_tasks').select('count').limit(1)
      if (error) {
        supabaseTest = { connected: false, error: error.message }
      } else {
        supabaseTest = { connected: true, error: null }
      }
    } catch (e) {
      supabaseTest = { connected: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }

    // 测试文件列表API
    let filesApiTest = { success: false, error: null, fileCount: 0 }
    try {
      let baseUrl = 'http://localhost:3000'
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`
      } else if (process.env.NODE_ENV === 'production') {
        baseUrl = 'https://butp.tech'
      }

      const filesResponse = await fetch(`${baseUrl}/api/admin/grades-import/files`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (filesResponse.ok) {
        const filesData = await filesResponse.json()
        filesApiTest = {
          success: true,
          error: null,
          fileCount: filesData.files ? filesData.files.length : 0
        }
      } else {
        filesApiTest = {
          success: false,
          error: `HTTP ${filesResponse.status}: ${filesResponse.statusText}`,
          fileCount: 0
        }
      }
    } catch (e) {
      filesApiTest = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        fileCount: 0
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      supabase: {
        keyType: keyType,
        connection: supabaseTest
      },
      filesApi: filesApiTest
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
