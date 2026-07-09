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
    const decodedUser = await authenticateStaff(request);
    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required.' },
        { status: 400 }
      );
    }

    const sessionId = parseInt(session_id, 10);
    const userId = parseInt(String(decodedUser.id), 10);

    // Concurrency safety: atomic update checking that status is 'waiting'
    const claimResult = await prisma.chatSession.updateMany({
      where: {
        id: sessionId,
        status: 'waiting',
      },
      data: {
        status: 'active',
        assigned_to_id: userId,
      },
    });

    if (claimResult.count === 0) {
      return NextResponse.json(
        { error: 'This support ticket has already been claimed by another agent.' },
        { status: 409 }
      );
    }

    // Insert system join alert message
    await prisma.chatMessage.create({
      data: {
        session_id: sessionId,
        sender_type: 'staff',
        sender_name: 'System',
        message: `Support agent ${decodedUser.name || 'Staff'} has joined the chat.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully claimed chat session.',
    });
  } catch (error) {
    console.error('Chat claim error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to claim chat session.';
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
