import { randomBytes } from 'crypto';
import { getIronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';
import { SessionData, sessionOptions } from '@/lib/session';

export async function POST(request: NextRequest) {
  if (!/^[a-fA-F0-9]{64}$/.test(process.env.CAS_ASSERTION_SECRET || '')) {
    return NextResponse.json({ error: 'signed_flow_not_configured' }, { status: 503 });
  }

  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
  }

  const proxyUrl = process.env.NEXT_PUBLIC_CAS_PROXY_URL || 'http://10.3.58.3:8080';
  const loginUrl = new URL('/api/auth/cas/proxy-login', proxyUrl);
  const state = randomBytes(32).toString('hex');
  loginUrl.searchParams.set('flow', 'signed');
  loginUrl.searchParams.set('app', 'butp');
  loginUrl.searchParams.set('state', state);
  loginUrl.searchParams.set('origin', origin);

  const response = NextResponse.json({ url: loginUrl.toString() });
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  session.casSignedState = state;
  session.casSignedStartedAt = Date.now();
  await session.save();
  return response;
}
