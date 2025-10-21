import { NextRequest, NextResponse } from 'next/server';

/**
 * 阿里云健康检查API代理
 * 解决CORS跨域问题的临时方案
 */

const ALIYUN_SERVER = process.env.NEXT_PUBLIC_PREDICTION_API_URL || 'http://39.96.196.67:8080';

export async function GET(request: NextRequest) {
  try {
    console.log('[代理] 健康检查，目标服务器:', ALIYUN_SERVER);
    
    const response = await fetch(`${ALIYUN_SERVER}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NextJS-Proxy/1.0',
      },
    });

    console.log('[代理] 阿里云响应状态:', response.status, response.statusText);

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: `阿里云服务器错误: ${response.status} ${response.statusText}`,
          code: `ALIYUN_${response.status}`
        },
        { status: response.status }
      );
    }

    // 处理可能包含无效JSON值的响应
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.log('[代理] JSON解析失败，尝试修复...');
      const fixedText = responseText
        .replace(/:\s*NaN\b/g, ': null')
        .replace(/:\s*Infinity\b/g, ': null')
        .replace(/:\s*-Infinity\b/g, ': null')
        .replace(/:\s*undefined\b/g, ': null');
      
      try {
        data = JSON.parse(fixedText);
        console.log('[代理] JSON修复成功');
      } catch (fixError) {
        console.error('[代理] JSON修复失败:', fixError);
        throw new Error(`JSON解析失败: ${fixError.message}`);
      }
    }
    
    console.log('[代理] 阿里云响应数据:', data);

    return NextResponse.json({
      success: true,
      data: data,
      source: 'aliyun-proxy',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[代理] 健康检查失败:', error);
    
    return NextResponse.json(
      { 
        error: `代理健康检查失败: ${error.message}`,
        code: 'PROXY_ERROR',
        details: error
      },
      { status: 500 }
    );
  }
}
