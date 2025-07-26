import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticket = searchParams.get('ticket');
    const username = searchParams.get('username'); // Mock CAS可能传递用户名

    console.log('CAS callback: received params', { ticket, username });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Missing ticket parameter' },
        { status: 400 }
      );
    }

    try {
      // 调用verify端点进行实际的ticket验证
      const verifyUrl = new URL('/api/auth/cas/verify', request.url);
      verifyUrl.searchParams.set('ticket', ticket);
      
      // 如果有username参数（Mock环境），也传递给verify
      if (username) {
        verifyUrl.searchParams.set('username', username);
      }
      
      console.log('CAS callback: calling verify URL:', verifyUrl.toString());
      
      // 使用fetch调用verify端点
      const verifyResponse = await fetch(verifyUrl.toString(), {
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        },
      });
      
      if (!verifyResponse.ok) {
        throw new Error(`Verify failed: ${verifyResponse.statusText}`);
      }
      
      // verify成功后，总是重定向到login页面完成最终认证
      const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
      
      // 复制verify响应的cookies到callback响应
      const setCookieHeader = verifyResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        console.log('CAS callback: found Set-Cookie header:', setCookieHeader);
        redirectResponse.headers.set('Set-Cookie', setCookieHeader);
      } else {
        console.log('CAS callback: no Set-Cookie header found in verify response');
        // 输出所有headers进行调试
        console.log('CAS callback: verify response headers:', Array.from(verifyResponse.headers.entries()));
      }
      
      console.log('CAS callback: redirect response cookies:', redirectResponse.cookies.getAll());
      
      return redirectResponse;
      
    } catch (error) {
      console.error('CAS callback: verify request failed:', error);
      return NextResponse.redirect(new URL('/login?error=verify_failed', request.url));
    }
  } catch (error) {
    console.error('Error in CAS callback:', error);
    return NextResponse.json(
      { error: 'Callback processing failed' },
      { status: 500 }
    );
  }
} 