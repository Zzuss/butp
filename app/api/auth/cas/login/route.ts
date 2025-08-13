import { NextRequest, NextResponse } from 'next/server';
import { buildCasLoginUrl } from '@/lib/cas';

export async function GET(request: NextRequest) {
  try {
    console.log('📥 CAS login API called')
    console.log('🌐 Request URL:', request.url)
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV)
    
    // 获取回调URL参数（可选）
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get('returnUrl') || '/';
    console.log('📍 Return URL:', returnUrl)

    // 构建CAS登录URL
    const casLoginUrl = buildCasLoginUrl()
    console.log('🎯 CAS Login URL:', casLoginUrl)

    // 将回调URL存储在session或cookie中，用于登录成功后重定向
    const response = NextResponse.redirect(casLoginUrl);
    
    // 设置cookie存储返回URL
    response.cookies.set('cas-return-url', returnUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5分钟
    });

    console.log('✅ Redirecting to CAS login URL')
    return response;
  } catch (error) {
    console.error('❌ Error in CAS login:', error);
    return NextResponse.json(
      { error: 'Failed to initiate CAS login' },
      { status: 500 }
    );
  }
} 