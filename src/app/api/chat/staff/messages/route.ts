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
    const sessionIdStr = searchParams.get('session_id');
    const lastMsgIdStr = searchParams.get('last_message_id');

    if (!sessionIdStr) {
      return NextResponse.json(
        { error: 'Session ID is required.' },
        { status: 400 }
      );
    }

    const sessionId = parseInt(sessionIdStr, 10);
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found.' },
        { status: 404 }
      );
    }

    const lastMsgId = lastMsgIdStr ? parseInt(lastMsgIdStr, 10) : 0;
    const messages = await prisma.chatMessage.findMany({
      where: {
        session_id: sessionId,
        id: {
          gt: lastMsgId,
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      session,
      messages,
    });
  } catch (error) {
    console.error('Staff get messages error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to retrieve messages.';
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
