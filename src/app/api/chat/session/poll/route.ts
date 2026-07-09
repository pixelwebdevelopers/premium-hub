import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const lastMsgIdStr = searchParams.get('last_message_id');

    if (!token) {
      return NextResponse.json(
        { error: 'Session token is required.' },
        { status: 400 }
      );
    }

    const session = await prisma.chatSession.findUnique({
      where: { session_token: token },
      include: {
        assigned_to: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Chat session not found.' },
        { status: 404 }
      );
    }

    // 1. Calculate queue position if session is waiting
    let queuePosition = 0;
    if (session.status === 'waiting') {
      const waitCount = await prisma.chatSession.count({
        where: {
          status: 'waiting',
          created_at: {
            lt: session.created_at,
          },
        },
      });
      queuePosition = waitCount + 1;
    }

    // 2. Fetch new messages incrementally
    const lastMsgId = lastMsgIdStr ? parseInt(lastMsgIdStr, 10) : 0;
    const messages = await prisma.chatMessage.findMany({
      where: {
        session_id: session.id,
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
      status: session.status,
      queue_position: queuePosition,
      agent_name: session.assigned_to ? session.assigned_to.name : null,
      messages,
    });
  } catch (error) {
    console.error('Chat poll error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to poll chat session.';
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
