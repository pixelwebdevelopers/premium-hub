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
    const { token, session_id, message, sender_type } = await request.json();

    if (!message || !sender_type) {
      return NextResponse.json(
        { error: 'Message content and sender type are required.' },
        { status: 400 }
      );
    }

    if (sender_type === 'customer') {
      if (!token) {
        return NextResponse.json(
          { error: 'Customer session token is required.' },
          { status: 400 }
        );
      }

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
        return NextResponse.json(
          { error: 'This chat session has been closed.' },
          { status: 400 }
        );
      }

      // Create message & update session activity
      const [msg] = await prisma.$transaction([
        prisma.chatMessage.create({
          data: {
            session_id: session.id,
            sender_type: 'customer',
            sender_name: session.customer_name,
            message,
          },
        }),
        prisma.chatSession.update({
          where: { id: session.id },
          data: { updated_at: new Date() },
        }),
      ]);

      return NextResponse.json({ success: true, message: msg });
    } else if (sender_type === 'staff') {
      const decodedUser = await authenticateStaff(request);
      if (!decodedUser) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
      }

      if (!session_id) {
        return NextResponse.json(
          { error: 'Chat session ID is required.' },
          { status: 400 }
        );
      }

      const session = await prisma.chatSession.findUnique({
        where: { id: parseInt(session_id, 10) },
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Chat session not found.' },
          { status: 404 }
        );
      }

      if (session.status === 'closed') {
        return NextResponse.json(
          { error: 'This chat session has been closed.' },
          { status: 400 }
        );
      }

      // Create message & update session activity
      const [msg] = await prisma.$transaction([
        prisma.chatMessage.create({
          data: {
            session_id: session.id,
            sender_type: 'staff',
            sender_name: String(decodedUser.name || 'Staff'),
            message,
          },
        }),
        prisma.chatSession.update({
          where: { id: session.id },
          data: { updated_at: new Date() },
        }),
      ]);

      return NextResponse.json({ success: true, message: msg });
    } else {
      return NextResponse.json(
        { error: 'Invalid sender type.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Chat send message error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to send chat message.';
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
