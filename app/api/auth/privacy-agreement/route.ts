import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { SessionData, sessionOptions } from '@/lib/session'
import { supabase } from '@/lib/supabase'

// GET - 检查用户隐私条款同意状态
export async function GET(request: NextRequest) {
  try {
    // 获取用户会话
    const response = NextResponse.next()
    const session = await getIronSession<SessionData>(request, response, sessionOptions)

    // 检查用户是否已登录
    if (!session.isLoggedIn || !session.userHash) {
      return NextResponse.json({ 
        success: false, 
        error: '用户未登录' 
      }, { status: 401 })
    }

    try {
      // 获取当前活跃的隐私条款
      const { data: currentPolicy, error: policyError } = await supabase
        .from('privacy_policy')
        .select('id, version, effective_date, updated_at')
        .eq('is_active', true)
        .single()

      if (policyError) {
        console.error('查询当前隐私条款失败:', policyError)
        // 如果没有隐私条款记录，默认要求同意
        return NextResponse.json({
          success: true,
          hasAgreed: false,
          userHash: session.userHash,
          message: '未找到有效的隐私条款版本，需要同意'
        })
      }

      // 查询用户是否已同意当前版本的隐私条款
      const { data: agreementRecord, error: agreementError } = await supabase
        .from('user_privacy_agreements')
        .select('id, agreed_at, privacy_policy_id')
        .eq('user_id', session.userHash)
        .eq('privacy_policy_id', currentPolicy.id)
        .single()

      if (agreementError && agreementError.code !== 'PGRST116') { // PGRST116 = 找不到记录
        console.error('查询用户同意记录失败:', agreementError)
        // 查询失败时默认要求重新同意
        return NextResponse.json({
          success: true,
          hasAgreed: false,
          userHash: session.userHash,
          message: '数据库查询失败，需要重新同意',
          currentPolicyId: currentPolicy.id
        })
      }

      // 检查是否已同意当前版本
      const hasAgreed = !!agreementRecord

      return NextResponse.json({
        success: true,
        hasAgreed,
        userHash: session.userHash,
        message: hasAgreed ? 
          `用户已同意当前版本（${currentPolicy.version}）` : 
          `需要同意最新版本（${currentPolicy.version}）`,
        currentPolicyId: currentPolicy.id,
        currentPolicyVersion: currentPolicy.version,
        userAgreedAt: agreementRecord?.agreed_at,
        policyUpdatedAt: currentPolicy.updated_at
      })

    } catch (dbError) {
      console.error('数据库操作失败:', dbError)
      // 出错时要求重新同意，确保安全
      return NextResponse.json({
        success: true,
        hasAgreed: false,
        userHash: session.userHash,
        message: '数据库操作失败，需要重新同意'
      })
    }

  } catch (error) {
    console.error('隐私条款检查API错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 })
  }
}

// POST - 记录用户隐私条款同意
export async function POST(request: NextRequest) {
  try {
    // 获取用户会话
    const response = NextResponse.next()
    const session = await getIronSession<SessionData>(request, response, sessionOptions)

    // 检查用户是否已登录
    if (!session.isLoggedIn || !session.userHash) {
      return NextResponse.json({ 
        success: false, 
        error: '用户未登录' 
      }, { status: 401 })
    }

    try {
      const body = await request.json()
      const { action } = body

      if (action !== 'agree') {
        return NextResponse.json(
          { error: '无效的操作' },
          { status: 400 }
        )
      }

      // 获取当前活跃的隐私条款
      const { data: currentPolicy, error: policyError } = await supabase
        .from('privacy_policy')
        .select('id, version')
        .eq('is_active', true)
        .single()

      if (policyError) {
        console.error('查询当前隐私条款失败:', policyError)
        return NextResponse.json({
          success: false,
          error: '未找到有效的隐私条款版本'
        }, { status: 404 })
      }

      // 获取用户IP和User-Agent
      const clientIP = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      request.ip || 
                      'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'

      // 使用upsert插入或更新用户同意记录
      const { data: agreementData, error: insertError } = await supabase
        .from('user_privacy_agreements')
        .upsert({
          user_id: session.userHash,
          privacy_policy_id: currentPolicy.id,
          agreed_at: new Date().toISOString(),
          ip_address: clientIP,
          user_agent: userAgent
        }, {
          onConflict: 'user_id,privacy_policy_id'
        })
        .select()

      if (insertError) {
        console.error('记录用户同意失败:', insertError)
        return NextResponse.json({
          success: false,
          error: '记录同意状态失败'
        }, { status: 500 })
      }

      console.log('✅ 用户隐私条款同意记录成功', {
        userHash: session.userHash.substring(0, 12) + '...',
        policyId: currentPolicy.id,
        policyVersion: currentPolicy.version,
        clientIP: clientIP.substring(0, 12) + '...',
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        message: '隐私条款同意记录成功',
        policyVersion: currentPolicy.version
      })

    } catch (dbError) {
      console.error('数据库操作失败:', dbError)
      return NextResponse.json({
        success: false,
        error: '数据库操作失败'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('隐私条款同意API错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 })
  }
}