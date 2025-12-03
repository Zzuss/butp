import { NextRequest, NextResponse } from 'next/server'

// GET - 测试middleware相关的环境变量和配置
export async function GET(request: NextRequest) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    cookies: request.cookies.getAll(),
    envCheck: {
      // 主数据库环境变量（实际使用的）
      hasSupabaseLocalUrl: !!process.env.NEXT_PUBLIC_SUPABASELOCAL_URL,
      hasSupabaseLocalKey: !!process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY,
      supabaseLocalUrl: process.env.NEXT_PUBLIC_SUPABASELOCAL_URL ? 'SET' : 'NOT_SET',
      
      // Storage环境变量
      hasStorageUrl: !!process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL,
      hasStorageKey: !!process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY,
      storageUrl: process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL ? 'SET' : 'NOT_SET',
      
      // 检查是否配置了错误的环境变量名
      hasWrongSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasWrongSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      
      // 其他环境变量
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL
    },
    middlewareConfig: {
      protectedPaths: [
        '/profile',
        '/dashboard', 
        '/grades',
        '/analysis',
        '/charts',
        '/role-models'
      ],
      privacyExemptPaths: [
        '/privacy-agreement',
        '/login',
        '/admin-login',
        '/',
        '/api/auth',
        '/api/mock',
        '/auth-status',
        '/testsupa'
      ]
    }
  }

  // 检查当前路径是否需要隐私条款检查
  const pathname = new URL(request.url).pathname
  const needsPrivacyCheck = diagnostics.middlewareConfig.protectedPaths.some(path => 
    pathname.startsWith(path)
  ) && !diagnostics.middlewareConfig.privacyExemptPaths.some(path => 
    pathname === path || pathname.startsWith(path)
  )

  return NextResponse.json({
    success: true,
    diagnostics: {
      ...diagnostics,
      currentPath: pathname,
      needsPrivacyCheck,
      recommendation: !process.env.NEXT_PUBLIC_SUPABASELOCAL_URL ? 
        '❌ 主数据库环境变量缺失！请配置 NEXT_PUBLIC_SUPABASELOCAL_URL 和 NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY' :
        '✅ 环境变量配置正常'
    }
  })
}
