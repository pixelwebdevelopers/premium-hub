import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { verifyJWT } from '../../../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

async function authenticateStaff(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenCookie = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith('auth-token='));
  
  if (!tokenCookie) return null;
  const token = tokenCookie.split('=')[1];
  return verifyJWT(token, JWT_SECRET);
}

export async function GET(request: Request) {
  try {
    const decodedUser = await authenticateStaff(request);
    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const offsetStr = searchParams.get('offset') || '0';
    const currentSessionIdStr = searchParams.get('current_session_id');

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const offset = parseInt(offsetStr, 10);
    const currentSessionId = currentSessionIdStr ? parseInt(currentSessionIdStr, 10) : 0;

    // Find past sessions, ordered by created_at desc (most recent first)
    const pastSessions = await prisma.chatSession.findMany({
      where: {
        customer_email: email,
        id: {
          not: currentSessionId,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      skip: offset,
      take: 1,
    });

    if (pastSessions.length === 0) {
      return NextResponse.json({ success: true, messages: [], hasMore: false });
    }

    const targetSession = pastSessions[0];
    const messages = await prisma.chatMessage.findMany({
      where: {
        session_id: targetSession.id,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    const mappedMessages = messages.map((m: any) => ({
      ...m,
      is_historical: true,
      session_created_at: targetSession.created_at,
      session_tracking_id: targetSession.tracking_id,
    }));

    return NextResponse.json({
      success: true,
      session: targetSession,
      messages: mappedMessages,
      hasMore: true,
    });
  } catch (error) {
    console.error('History GET error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
