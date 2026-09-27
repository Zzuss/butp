import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_TTL_SECONDS = 5 * 60

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function signToken(payload: Record<string, unknown>, secret: string) {
  const encodedPayload = encode(payload)
  const signature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url')

  return `${encodedPayload}.${signature}`
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.IMPORT_TOKEN_SECRET
    if (!secret || secret.length < 32) {
      console.error('IMPORT_TOKEN_SECRET is missing or too short')
      return NextResponse.json({ error: '导入令牌服务未正确配置' }, { status: 503 })
    }

    const sessionCookie = request.cookies.get('admin-session')?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: '未登录或管理员会话已失效' }, { status: 401 })
    }

    let session: { id?: string; username?: string; loginTime?: string }
    try {
      session = JSON.parse(sessionCookie)
    } catch {
      return NextResponse.json({ error: '管理员会话无效' }, { status: 401 })
    }

    if (!session.id || !session.username || !session.loginTime) {
      return NextResponse.json({ error: '管理员会话无效' }, { status: 401 })
    }

    const loginTime = new Date(session.loginTime).getTime()
    if (!Number.isFinite(loginTime) || Date.now() - loginTime > 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: '管理员会话已过期' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASELOCAL_URL || process.env.NEXT_PUBLIC_STORAGE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASELOCAL_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASELOCAL_ANON_KEY ||
      process.env.NEXT_PUBLIC_STORAGE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: '数据库配置缺失' }, { status: 503 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    const { data: admin, error } = await supabase
      .from('admin_accounts')
      .select('id, username, role, is_active')
      .eq('id', session.id)
      .eq('username', session.username)
      .eq('is_active', true)
      .single()

    if (error || !admin) {
      return NextResponse.json({ error: '管理员账户不可用' }, { status: 403 })
    }

    const now = Math.floor(Date.now() / 1000)
    const expiresAt = now + TOKEN_TTL_SECONDS
    const token = signToken({
      aud: 'grade-import',
      sub: String(admin.id),
      username: admin.username,
      role: admin.role,
      iat: now,
      exp: expiresAt
    }, secret)

    return NextResponse.json({ token, expiresAt })
  } catch (error) {
    console.error('签发成绩导入令牌失败:', error)
    return NextResponse.json({ error: '签发导入令牌失败' }, { status: 500 })
  }
}
