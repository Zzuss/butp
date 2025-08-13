import { NextRequest, NextResponse } from 'next/server';
import { CAS_CONFIG, buildCasLoginUrl } from '@/lib/cas';

export async function GET(request: NextRequest) {
  try {
    const config = {
      environment: process.env.NODE_ENV,
      serverUrl: CAS_CONFIG.serverUrl,
      serviceUrl: CAS_CONFIG.serviceUrl,
      siteUrl: CAS_CONFIG.siteUrl,
      proxyUrl: CAS_CONFIG.proxyUrl,
      isDevelopment: CAS_CONFIG.isDevelopment,
      isProduction: CAS_CONFIG.isProduction,
      useMockCAS: CAS_CONFIG.useMockCAS,
      useRealCAS: CAS_CONFIG.useRealCAS,
      casLoginUrl: buildCasLoginUrl(),
      hostname: request.nextUrl.hostname,
      requestUrl: request.url
    };

    console.log('🔧 Debug CAS config requested:', config);

    return NextResponse.json(config);
  } catch (error) {
    console.error('❌ Error getting CAS config:', error);
    return NextResponse.json(
      { error: 'Failed to get CAS config' },
      { status: 500 }
    );
  }
} 