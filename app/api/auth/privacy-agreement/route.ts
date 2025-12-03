import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import { SessionData, sessionOptions } from '@/lib/session'
import { getStorageSupabase } from '@/lib/storageSupabase'
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
      // 获取 Supabase 客户端
      const storageSupabase = getStorageSupabase()

      // 尝试获取所有桶的列表
      const { data: buckets, error: bucketsError } = await storageSupabase.storage.listBuckets()
      console.log('🗃️ 可用的桶:', buckets?.map(bucket => bucket.name))
      if (bucketsError) {
        console.error('❌ 获取桶列表失败:', bucketsError)
      }

      // 🔥 新方案：直接从Storage获取隐私条款文件信息
      const possibleFiles = [
        'privacy-policy-latest.docx',
        'privacy-policy-latest.doc', 
        'privacy-policy-latest.pdf',
        'privacy-policy-latest.txt',
        'privacy-policy-latest.html'
      ]

      let currentFileInfo: any = null
      let fileName = ''

      // 找到存在的隐私条款文件
      for (const testFileName of possibleFiles) {
        try {
          const { data: files, error: listError } = await storageSupabase.storage
            .from('privacy-files')
            .list('', {
              search: testFileName
            })

          if (!listError && files && files.length > 0) {
            currentFileInfo = files[0]
            fileName = testFileName
            console.log(`📋 找到隐私条款文件: ${testFileName}`, currentFileInfo)
            break
          }
        } catch (err) {
          continue
        }
      }

      if (!currentFileInfo) {
        console.error('❌ 未找到隐私条款文件')
        return NextResponse.json({
          success: true,
          hasAgreed: false,
          userHash: session.userHash,
          message: '未找到隐私条款文件，需要同意'
        })
      }

      // 使用文件修改时间作为版本标识
      const fileVersion = currentFileInfo.updated_at || currentFileInfo.created_at

      // 从主数据库查询用户同意记录
      const { data: agreementRecord, error: agreementError } = await supabase
        .from('user_privacy_agreements')
        .select('id, agreed_at, privacy_policy_version, privacy_policy_file')
        .eq('user_id', session.userHash)
        .eq('privacy_policy_file', fileName)
        .eq('privacy_policy_version', fileVersion)
        .single()

      console.log('🔍 用户隐私条款同意记录:', {
        agreementRecord,
        error: agreementError
      })

      if (agreementError && (agreementError as any).code !== 'PGRST116') { // PGRST116 = 找不到记录
        console.error('查询用户同意记录失败:', agreementError)
        // 查询失败时默认要求重新同意
        return NextResponse.json({
          success: true,
          hasAgreed: false,
          userHash: session.userHash,
          message: '数据库查询失败，需要重新同意',
          currentPolicyFile: fileName,
          currentPolicyVersion: fileVersion
        })
      }

      // 检查是否已同意当前版本
      const hasAgreed = !!agreementRecord

      return NextResponse.json({
        success: true,
        hasAgreed,
        userHash: session.userHash,
        message: hasAgreed ? 
          `用户已同意当前版本（${fileName}）` : 
          `需要同意最新版本（${fileName}）`,
        currentPolicyFile: fileName,
        currentPolicyVersion: fileVersion,
        userAgreedAt: agreementRecord?.agreed_at,
        policyUpdatedAt: fileVersion
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

    // 检查用户是否已登录或CAS认证
    const hasValidAuth = (session.isLoggedIn && session.userHash) || 
                        (session.isCasAuthenticated && session.userHash && session.userId)
    
    if (!hasValidAuth) {
      console.log('Privacy agreement POST: 认证检查失败', {
        isLoggedIn: session.isLoggedIn,
        isCasAuthenticated: session.isCasAuthenticated,
        hasUserHash: !!session.userHash,
        hasUserId: !!session.userId
      })
      return NextResponse.json({ 
        success: false, 
        error: '用户未登录' 
      }, { status: 401 })
    }
    
    console.log('Privacy agreement POST: 认证检查通过', {
      isLoggedIn: session.isLoggedIn,
      isCasAuthenticated: session.isCasAuthenticated,
      userHash: session.userHash?.substring(0, 12) + '...'
    })

    try {
      const body = await request.json()
      const { action } = body

      if (action !== 'agree') {
        return NextResponse.json(
          { error: '无效的操作' },
          { status: 400 }
        )
      }

      // 获取 Supabase 客户端
      const storageSupabase = getStorageSupabase()

      // 尝试获取所有桶的列表
      const { data: buckets, error: bucketsError } = await storageSupabase.storage.listBuckets()
      console.log('🗃️ 可用的桶:', buckets?.map(bucket => bucket.name))
      if (bucketsError) {
        console.error('❌ 获取桶列表失败:', bucketsError)
      }

      // 🔥 新方案：直接从Storage获取隐私条款文件信息
      const possibleFiles = [
        'privacy-policy-latest.docx',
        'privacy-policy-latest.doc', 
        'privacy-policy-latest.pdf',
        'privacy-policy-latest.txt',
        'privacy-policy-latest.html'
      ]

      let currentFileInfo: any = null
      let fileName = ''

      // 找到存在的隐私条款文件
      for (const testFileName of possibleFiles) {
        try {
          const { data: files, error: listError } = await storageSupabase.storage
            .from('privacy-files')
            .list('', {
              search: testFileName
            })

          if (!listError && files && files.length > 0) {
            currentFileInfo = files[0]
            fileName = testFileName
            console.log(`📋 找到隐私条款文件: ${testFileName}`, currentFileInfo)
            break
          }
        } catch (err) {
          continue
        }
      }

      if (!currentFileInfo) {
        console.error('❌ 未找到隐私条款文件')
        return NextResponse.json({
          success: false,
          error: '未找到隐私条款文件'
        }, { status: 404 })
      }

      // 使用文件修改时间作为版本标识
      const fileVersion = currentFileInfo.updated_at || currentFileInfo.created_at

      // 获取用户IP和User-Agent
      const clientIP = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'

      // 向主数据库写入用户同意记录
      const agreementRecord = {
        user_id: session.userHash,
        privacy_policy_file: fileName,
        privacy_policy_version: fileVersion,
        agreed_at: new Date().toISOString(),
        ip_address: clientIP,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      }

      console.log('📝 准备写入用户同意记录:', {
        user_id: session.userHash.substring(0, 12) + '...',
        privacy_policy_file: fileName,
        privacy_policy_version: fileVersion,
        agreed_at: agreementRecord.agreed_at
      })

      const { data: agreementData, error: insertError } = await supabase
        .from('user_privacy_agreements')
        .upsert(agreementRecord, {
          onConflict: 'user_id,privacy_policy_file,privacy_policy_version'
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
        policyFile: fileName,
        policyVersion: fileVersion,
        clientIP: clientIP.substring(0, 12) + '...',
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        message: '隐私条款同意记录成功',
        policyVersion: fileVersion
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