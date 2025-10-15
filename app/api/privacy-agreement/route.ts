import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST - 用户同意隐私条款
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, privacyPolicyId } = body

    // 验证必填字段
    if (!userId || !privacyPolicyId) {
      return NextResponse.json(
        { error: '用户ID和隐私条款ID不能为空' },
        { status: 400 }
      )
    }

    // 获取请求信息
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    try {
      // 验证隐私条款是否存在且为活跃状态
      const { data: privacyPolicy, error: policyError } = await supabase
        .from('privacy_policy')
        .select('id, version')
        .eq('id', privacyPolicyId)
        .eq('is_active', true)
        .single()

      if (policyError || !privacyPolicy) {
        return NextResponse.json({
          success: false,
          error: '隐私条款不存在或已失效'
        }, { status: 404 })
      }

      // 使用 upsert 来插入或更新同意记录
      const { data: agreement, error } = await supabase
        .from('user_privacy_agreements')
        .upsert({
          user_id: userId,
          privacy_policy_id: privacyPolicyId,
          ip_address: ip,
          user_agent: userAgent,
          agreed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id, privacy_policy_id'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ 记录用户同意失败:', error)
        return NextResponse.json({
          success: false,
          error: '记录同意状态失败: ' + error.message
        }, { status: 500 })
      }

      console.log('✅ 用户隐私条款同意记录成功', {
        userId: userId,
        policyId: privacyPolicyId,
        policyVersion: privacyPolicy.version,
        ip: ip,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        data: agreement,
        message: '隐私条款同意记录成功'
      })

    } catch (dbError) {
      console.error('❌ 数据库操作失败:', dbError)
      return NextResponse.json({
        success: false,
        error: '数据库操作失败'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ 隐私条款同意API错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 })
  }
}

// GET - 检查用户是否需要同意最新的隐私条款
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      )
    }

    try {
      // 获取当前活跃的隐私条款
      const { data: currentPolicy, error: policyError } = await supabase
        .from('privacy_policy')
        .select('id, version, title, effective_date')
        .eq('is_active', true)
        .single()

      if (policyError || !currentPolicy) {
        return NextResponse.json({
          success: false,
          error: '未找到活跃的隐私条款'
        }, { status: 404 })
      }

      // 检查用户是否已同意当前活跃的隐私条款
      const { data: agreement, error: agreementError } = await supabase
        .from('user_privacy_agreements')
        .select('id, agreed_at')
        .eq('user_id', userId)
        .eq('privacy_policy_id', currentPolicy.id)
        .single()

      const needsAgreement = !agreement || agreementError

      return NextResponse.json({
        success: true,
        data: {
          needsAgreement,
          currentPolicy: {
            id: currentPolicy.id,
            version: currentPolicy.version,
            title: currentPolicy.title,
            effectiveDate: currentPolicy.effective_date
          },
          lastAgreement: agreement ? {
            agreedAt: agreement.agreed_at
          } : null
        }
      })

    } catch (dbError) {
      console.error('❌ 数据库操作失败:', dbError)
      return NextResponse.json({
        success: false,
        error: '数据库操作失败'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ 隐私条款检查API错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 })
  }
}
