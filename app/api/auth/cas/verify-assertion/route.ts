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

type AssertionCheck = { assertion: CasAssertion; error?: never } | { assertion?: never; error: string };

function verifyAssertion(value: unknown): AssertionCheck {
  const secret = process.env.CAS_ASSERTION_SECRET || '';
  if (!/^[a-fA-F0-9]{64}$/.test(secret)) return { error: 'assertion_secret_missing' };
  if (typeof value !== 'string' || value.length > 4096) return { error: 'assertion_malformed' };
  const [body, signature, extra] = value.split('.');
  if (!body || !signature || extra) return { error: 'assertion_malformed' };
  const expected = createHmac('sha256', Buffer.from(secret, 'hex')).update(body).digest();
  let received: Buffer;
  try { received = Buffer.from(signature, 'base64url'); } catch { return { error: 'assertion_malformed' }; }
  if (received.length !== expected.length || !timingSafeEqual(expected, received)) return { error: 'assertion_signature_invalid' };

  try {
    const assertion = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as CasAssertion;
    if (assertion.iss !== 'butp-cas-proxy' || assertion.aud !== 'butp.tech' ||
        typeof assertion.sub !== 'string' || !/^\d{6,20}$/.test(assertion.sub) ||
        typeof assertion.name !== 'string' || typeof assertion.state !== 'string' ||
        typeof assertion.jti !== 'string' || !assertion.jti ||
        !Number.isFinite(assertion.iat) || !Number.isFinite(assertion.exp) ||
        assertion.exp <= assertion.iat || assertion.exp - assertion.iat > 60000) return { error: 'assertion_claims_invalid' };
    return { assertion };
  } catch { return { error: 'assertion_malformed' }; }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (!origin || origin !== request.nextUrl.origin) {
      return NextResponse.json({ success: false, error: 'invalid_origin' }, { status: 403 });
    }
    const { assertion: value } = await request.json();
    const checked = verifyAssertion(value);
    const response = NextResponse.json({ success: true });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    const state = session.casSignedState;
    const startedAt = session.casSignedStartedAt;
    const reject = (reason: string) => {
      console.warn('verify-assertion: rejected', { reason, hasFlowState: !!state });
      return NextResponse.json({ success: false, error: reason }, { status: 401 });
    };
    if (checked.error) return reject(checked.error);
    const assertion = checked.assertion;
    if (!assertion) return reject('assertion_malformed');
    if (!state) return reject('assertion_state_missing');
    const now = Date.now();
    if (!startedAt || startedAt > now + 30000 || now - startedAt > 300000) return reject('assertion_expired');
    if (assertion.state !== state) return reject('assertion_state_mismatch');

    const userHash = await getHashByStudentNumber(assertion.sub);
    if (!userHash) {
      return NextResponse.json({ success: false, error: 'no_student_mapping' }, { status: 403 });
    }
    if (!await isValidStudentHashInDatabase(userHash)) {
      return NextResponse.json({ success: false, error: 'invalid_student_hash' }, { status: 403 });
    }

    session.userId = assertion.sub;
    session.userHash = userHash;
    session.name = assertion.name || `学生${assertion.sub}`;
    session.isCasAuthenticated = true;
    session.isLoggedIn = true;
    session.loginTime = now;
    session.lastActiveTime = now;
    delete session.casSignedState;
    delete session.casSignedStartedAt;
    await session.save();
    return response;
  } catch (error) {
    console.error('verify-assertion: unexpected error:', error);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
