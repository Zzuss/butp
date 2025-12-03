import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

    console.log('Auth check: session data:', {
      isLoggedIn: session.isLoggedIn,
      isCasAuthenticated: session.isCasAuthenticated,
      userId: session.userId,
      userHash: session.userHash,
      name: session.name
    });

    // 🔧 修复：与中间件逻辑保持一致，如果有CAS认证信息则自动恢复登录状态
    if (session.userId && session.userHash && session.isCasAuthenticated) {
      // 如果有完整的认证信息但isLoggedIn为false，说明是页面刷新或重新访问
      if (!session.isLoggedIn) {
        console.log('Auth check: CAS认证有效，但需要检查隐私条款同意状态');
        
        // 🚨 安全修复：在恢复登录状态前，检查隐私条款同意状态
        try {
          const { supabase } = await import('@/lib/supabase');
          const { getStorageSupabase } = await import('@/lib/storageSupabase');
          
          // 获取最新隐私条款文件信息
          const storageSupabase = getStorageSupabase();
          const possibleFiles = [
            'privacy-policy-latest.docx',
            'privacy-policy-latest.doc', 
            'privacy-policy-latest.pdf',
            'privacy-policy-latest.txt',
            'privacy-policy-latest.html'
          ];

          let currentFileInfo: any = null;
          for (const testFileName of possibleFiles) {
            try {
              const { data: files, error: listError } = await storageSupabase.storage
                .from('privacy-files')
                .list('', { search: testFileName });
              
              if (!listError && files && files.length > 0) {
                currentFileInfo = files[0];
                break;
              }
            } catch (error) {
              continue;
            }
          }

          if (currentFileInfo) {
            // 检查用户是否已同意当前版本的隐私条款
            const expectedVersion = new Date(currentFileInfo.updated_at).getTime().toString()
            console.log('Auth check: 隐私条款版本检查', {
              fileName: currentFileInfo.name,
              fileUpdatedAt: currentFileInfo.updated_at,
              expectedVersion: expectedVersion,
              userHash: session.userHash?.substring(0, 12) + '...'
            })
            
            const { data: agreementData, error: agreementError } = await supabase
              .from('user_privacy_agreements')
              .select('*')
              .eq('user_id', session.userHash)
              .eq('file_name', currentFileInfo.name)
              .eq('version', expectedVersion)
              .single();

            console.log('Auth check: 数据库查询结果', {
              found: !!agreementData,
              error: agreementError?.message,
              agreementVersion: agreementData?.version,
              expectedVersion: expectedVersion
            })

            if (agreementError || !agreementData) {
              console.log('Auth check: 用户未同意最新隐私条款，不能自动恢复登录状态');
              // 不恢复登录状态，让用户重新走隐私条款流程
              return NextResponse.json({
                isLoggedIn: false,
                isCasAuthenticated: true,
                requiresPrivacyAgreement: true,
                userId: session.userId,
                userHash: session.userHash,
                name: session.name
              });
            }
            
            console.log('Auth check: 隐私条款检查通过，用户已同意最新版本')
          }
        } catch (error) {
          console.error('Auth check: 隐私条款检查失败，不恢复登录状态:', error);
          return NextResponse.json({
            isLoggedIn: false,
            isCasAuthenticated: true,
            requiresPrivacyAgreement: true,
            userId: session.userId,
            userHash: session.userHash,
            name: session.name
          });
        }

        console.log('Auth check: 隐私条款检查通过，恢复登录状态');
        session.isLoggedIn = true;
        
        // 更新活跃时间
        session.lastActiveTime = Date.now();
        await session.save();
      }
      
      console.log('Auth check: user is authenticated');
    } else {
      console.log('Auth check: user not authenticated', {
        hasUserId: !!session.userId,
        hasUserHash: !!session.userHash,
        isCasAuthenticated: session.isCasAuthenticated
      });
      return NextResponse.json(
        { 
          isLoggedIn: false,
          error: 'Not authenticated'
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      isLoggedIn: true,
      userId: session.userId,
      userHash: session.userHash,
      name: session.name,
      isCasAuthenticated: session.isCasAuthenticated,
      loginTime: session.loginTime,
      lastActiveTime: session.lastActiveTime
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { 
        isLoggedIn: false,
        error: 'Session check failed'
      },
      { status: 500 }
    );
  }
} 