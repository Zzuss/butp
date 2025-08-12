import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown',
      gitBranch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
      deployment: {
        hasMiddlewareAutoLogin: true, // 表示包含中间件自动登录修复
        hasClearLoginSession: true,   // 表示包含页面关闭时保留CAS认证
        version: '2025-01-12-fix-cas-mismatch'
      },
      url: request.url,
      hostname: request.nextUrl.hostname
    };

    console.log('🔧 Deployment info requested:', deploymentInfo);

    return NextResponse.json(deploymentInfo);
  } catch (error) {
    console.error('❌ Error getting deployment info:', error);
    return NextResponse.json(
      { error: 'Failed to get deployment info' },
      { status: 500 }
    );
  }
} 