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

export async function POST(request: Request) {
  try {
    const { token, session_id } = await request.json();

    if (token) {
      // Customer closing their own session
      const session = await prisma.chatSession.findUnique({
        where: { session_token: token },
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Chat session not found.' },
          { status: 404 }
        );
      }

      if (session.status === 'closed') {
        return NextResponse.json({ success: true, message: 'Already closed.' });
      }

      await prisma.$transaction([
        prisma.chatSession.update({
          where: { id: session.id },
          data: { status: 'closed' },
        }),
        prisma.chatMessage.create({
          data: {
            session_id: session.id,
            sender_type: 'staff',
            sender_name: 'System',
            message: 'The customer has ended the chat.',
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Chat closed by customer.' });
    } else if (session_id) {
      // Staff closing a session
      const decodedUser = await authenticateStaff(request);
      if (!decodedUser) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
      }

      const sessionId = parseInt(session_id, 10);
      const session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Chat session not found.' },
          { status: 404 }
        );
      }

      if (session.status === 'closed') {
        return NextResponse.json({ success: true, message: 'Already closed.' });
      }

      await prisma.$transaction([
        prisma.chatSession.update({
          where: { id: sessionId },
          data: { status: 'closed' },
        }),
        prisma.chatMessage.create({
          data: {
            session_id: sessionId,
            sender_type: 'staff',
            sender_name: 'System',
            message: `The support agent ${decodedUser.name || 'Staff'} has closed this chat session.`,
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Chat closed by staff.' });
    } else {
      return NextResponse.json(
        { error: 'Either session token or ID is required.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Chat close error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to close chat session.';
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
