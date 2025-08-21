import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // PDF文件路径
    const filePath = join(process.cwd(), 'public', 'Education_Plan_PDF', 'Education_Plan_PDF_2023.pdf');
    
    // 读取文件
    const fileBuffer = readFileSync(filePath);
    
    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', 'attachment; filename="Education_Plan_PDF_2023.pdf"');
    headers.set('Content-Length', fileBuffer.length.toString());
    
    // 返回文件
    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('下载培养方案失败:', error);
    return NextResponse.json(
      { error: '文件下载失败' },
      { status: 500 }
    );
  }
}
