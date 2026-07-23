import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const { customer_name, customer_email, tracking_id, message } = await request.json();

    if (!customer_name || !message) {
      return NextResponse.json(
        { error: 'Customer name and initial message are required.' },
        { status: 400 }
      );
    }

    const session_token = crypto.randomUUID();

    // 2. Create the support session in waiting state
    const session = await prisma.chatSession.create({
      data: {
        session_token,
        customer_name,
        customer_email: customer_email || null,
        tracking_id: tracking_id || null,
        status: 'waiting',
        assigned_to_id: null,
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

    return NextResponse.json({
      success: true,
      session_id: session.id,
      session_token: session.session_token,
      status: session.status,
      agent_name: null,
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
