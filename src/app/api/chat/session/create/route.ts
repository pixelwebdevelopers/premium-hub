import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const { customer_name, customer_email, message } = await request.json();

    if (!customer_name || !message) {
      return NextResponse.json(
        { error: 'Customer name and initial message are required.' },
        { status: 400 }
      );
    }

    const session_token = crypto.randomUUID();

    // 1. Find online agents (last seen in last 15 seconds)
    const onlineAgents = await prisma.user.findMany({
      where: {
        last_seen_at: {
          gte: new Date(Date.now() - 15000),
        },
      },
      include: {
        _count: {
          select: {
            assigned_chats: {
              where: {
                status: 'active',
              },
            },
          },
        },
      },
    });

    let assignedAgent = null;
    let status = 'waiting';

    if (onlineAgents.length > 0) {
      // Sort agents by active chat count ascending
      onlineAgents.sort((a: typeof onlineAgents[0], b: typeof onlineAgents[0]) => a._count.assigned_chats - b._count.assigned_chats);
      
      const leastBusy = onlineAgents[0];
      // Limit active concurrent chats per agent to 5 for auto-allocation
      if (leastBusy._count.assigned_chats < 5) {
        assignedAgent = leastBusy;
        status = 'active';
      }
    }

    // 2. Create the support session
    const session = await prisma.chatSession.create({
      data: {
        session_token,
        customer_name,
        customer_email: customer_email || null,
        status,
        assigned_to_id: assignedAgent ? assignedAgent.id : null,
      },
    });

    // 3. Create the initial message
    await prisma.chatMessage.create({
      data: {
        session_id: session.id,
        sender_type: 'customer',
        sender_name: customer_name,
        message,
      },
    });

    // 4. If assigned, create a system message announcement
    if (assignedAgent) {
      await prisma.chatMessage.create({
        data: {
          session_id: session.id,
          sender_type: 'staff',
          sender_name: 'System',
          message: `Support agent ${assignedAgent.name} has joined the chat.`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      session_id: session.id,
      session_token: session.session_token,
      status: session.status,
      agent_name: assignedAgent ? assignedAgent.name : null,
    });
  } catch (error) {
    console.error('Chat creation error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to start chat support session.';
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
