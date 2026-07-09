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

    const userId = parseInt(String(decodedUser.id), 10);

    // 1. Update staff last_seen_at heartbeat
    await prisma.user.update({
      where: { id: userId },
      data: { last_seen_at: new Date() },
    });

    // 2. Fetch all waiting sessions with their first message
    const waiting_sessions = await prisma.chatSession.findMany({
      where: { status: 'waiting' },
      orderBy: { created_at: 'asc' },
      include: {
        messages: {
          take: 1,
          orderBy: { created_at: 'asc' },
        },
      },
    });

    // 3. Fetch active sessions assigned to this staff member
    const my_active_sessions = await prisma.chatSession.findMany({
      where: {
        status: 'active',
        assigned_to_id: userId,
      },
      orderBy: { updated_at: 'desc' },
    });

    // 4. Fetch all online staff members
    const online_staff = await prisma.user.findMany({
      where: {
        last_seen_at: {
          gte: new Date(Date.now() - 15000),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      waiting_sessions,
      my_active_sessions,
      online_staff,
    });
  } catch (error) {
    console.error('Staff chat poll error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to perform staff poll.';
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
