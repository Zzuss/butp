import { NextRequest, NextResponse } from 'next/server';

// 简单测试API，不访问数据库
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('收到测试请求:', body);
    
    return NextResponse.json({
      success: true,
      message: '测试成功',
      received: body
    });

  } catch (error) {
    console.error('测试API错误:', error);
    return NextResponse.json({
      error: '测试API失败',
      details: error
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: '简单测试API正常工作'
  });
}
