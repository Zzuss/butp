import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getHashByStudentNumber, isValidStudentHashInDatabase } from '@/lib/student-data';

interface CasAssertion {
  iss: string;
  aud: string;
  sub: string;
  name: string;
  state: string;
  iat: number;
  exp: number;
  jti: string;
}

function verifyAssertion(value: unknown): CasAssertion | null {
  const secret = process.env.CAS_ASSERTION_SECRET || '';
  if (!/^[a-fA-F0-9]{64}$/.test(secret) || typeof value !== 'string' || value.length > 4096) return null;
  const [body, signature, extra] = value.split('.');
  if (!body || !signature || extra) return null;
  const expected = createHmac('sha256', Buffer.from(secret, 'hex')).update(body).digest();
  let received: Buffer;
  try { received = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (received.length !== expected.length || !timingSafeEqual(expected, received)) return null;

  try {
    const assertion = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as CasAssertion;
    const now = Date.now();
    if (assertion.iss !== 'butp-cas-proxy' || assertion.aud !== 'butp.tech' ||
        typeof assertion.sub !== 'string' || !/^\d{6,20}$/.test(assertion.sub) ||
        typeof assertion.name !== 'string' || typeof assertion.state !== 'string' ||
        typeof assertion.jti !== 'string' || !assertion.jti ||
        !Number.isFinite(assertion.iat) || !Number.isFinite(assertion.exp) ||
        assertion.iat > now + 30000 || assertion.exp < now || assertion.exp - assertion.iat > 60000) return null;
    return assertion;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (!origin || origin !== request.nextUrl.origin) {
      return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
    }
    const { assertion: value } = await request.json();
    const assertion = verifyAssertion(value);
    const state = request.cookies.get('cas-signed-state')?.value;
    if (!assertion || !state || assertion.state !== state) {
      return NextResponse.json({ success: false, error: 'invalid_assertion' }, { status: 401 });
    }

    const userHash = await getHashByStudentNumber(assertion.sub);
    if (!userHash) {
      return NextResponse.json({ success: false, error: 'no_student_mapping' }, { status: 403 });
    }
    if (!await isValidStudentHashInDatabase(userHash)) {
      return NextResponse.json({ success: false, error: 'invalid_student_hash' }, { status: 403 });
    }

    const response = NextResponse.json({ success: true });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    const now = Date.now();
    session.userId = assertion.sub;
    session.userHash = userHash;
    session.name = assertion.name || `学生${assertion.sub}`;
    session.isCasAuthenticated = true;
    session.isLoggedIn = true;
    session.loginTime = now;
    session.lastActiveTime = now;
    await session.save();
    response.cookies.set('cas-signed-state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/cas',
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error('verify-assertion: unexpected error:', error);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
