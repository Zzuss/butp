import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { validateCasTicket } from '@/lib/cas';
import { SessionData, sessionOptions } from '@/lib/session';
import { getHashByStudentNumber, isValidStudentHashInDatabase } from '@/lib/student-data';

/**
 * CAS Ticket Verification API
 *
 * This endpoint receives a CAS ticket from the frontend (via postMessage from proxy server),
 * validates it against the CAS server, and creates a session if successful.
 *
 * Flow:
 * 1. Frontend opens popup window pointing to proxy server's /api/auth/cas/proxy-login
 * 2. User authenticates with CAS server
 * 3. CAS server redirects to proxy server's /api/auth/cas/callback
 * 4. Proxy server returns HTML page that posts ticket back to parent window via postMessage
 * 5. Frontend receives ticket and sends it to this endpoint
 * 6. This endpoint validates ticket and creates session
 *
 * Expected POST body:
 * {
 *   "ticket": "ST-xxxxx-xxxxx-xxxxx"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ticket = body.ticket;

    if (!ticket) {
      console.error('verify-ticket: missing ticket in request body');
      return NextResponse.json(
        { success: false, error: 'missing_ticket' },
        { status: 400 }
      );
    }

    console.log('verify-ticket: starting ticket validation', { ticket });

    // Validate CAS ticket
    const casUser = await validateCasTicket(ticket);
    console.log('verify-ticket: validateCasTicket result:', casUser);

    if (!casUser) {
      console.error('verify-ticket: ticket validation failed');
      return NextResponse.json(
        { success: false, error: 'ticket_validation_failed' },
        { status: 401 }
      );
    }

    console.log('verify-ticket: ticket validation successful, checking student mapping');

    // Find student number mapping
    const userHash = await getHashByStudentNumber(casUser.userId);
    if (!userHash) {
      console.error('verify-ticket: no mapping found for student number:', casUser.userId);
      return NextResponse.json(
        { success: false, error: 'no_student_mapping' },
        { status: 403 }
      );
    }

    console.log('verify-ticket: mapping found, validating hash in database');

    // Validate hash exists in database
    const isValidInDatabase = await isValidStudentHashInDatabase(userHash);
    if (!isValidInDatabase) {
      console.error('verify-ticket: hash found in mapping table but not valid in database');
      return NextResponse.json(
        { success: false, error: 'invalid_student_hash' },
        { status: 403 }
      );
    }

    console.log('verify-ticket: all validations successful, creating session');

    // Create session
    const response = NextResponse.json({ success: true });
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    const now = Date.now();

    session.userId = casUser.userId;
    session.userHash = userHash;
    session.name = casUser.name || `学生${casUser.userId}`;
    session.isCasAuthenticated = true;
    session.isLoggedIn = true;
    session.loginTime = now;
    session.lastActiveTime = now;
    await session.save();

    console.log('verify-ticket: session created successfully', {
      userId: session.userId,
      userHash: session.userHash,
      name: session.name
    });

    return response;

  } catch (error) {
    console.error('verify-ticket: unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
