import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { verifyJWT, hashPassword } from '../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

// Helper to authenticate Admin
async function authenticateAdmin(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenCookie = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith('auth-token='));
  
  if (!tokenCookie) return null;

  const token = tokenCookie.split('=')[1];
  const decoded = await verifyJWT(token, JWT_SECRET);
  if (!decoded || decoded.role !== 'admin') return null;

  return decoded;
}

// GET: Get all staff members (Admin only)
export async function GET(request: Request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const staff = await prisma.user.findMany({
      where: { role: 'staff' },
      orderBy: { created_at: 'desc' },
    });

    // Fetch all sessions with messages to compute metrics
    const sessions = await prisma.chatSession.findMany({
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    const staffList = staff.map((user: typeof staff[0]) => {
      const agentSessions = sessions.filter((s: { assigned_to_id: number | null }) => s.assigned_to_id === user.id);
      const totalSessions = agentSessions.length;
      const activeSessions = agentSessions.filter((s: { status: string }) => s.status === 'active').length;
      const closedSessions = agentSessions.filter((s: { status: string }) => s.status === 'closed').length;

      // Calculate response times
      let totalResponseTimeMs = 0;
      let respondedSessionsCount = 0;

      agentSessions.forEach((session: { messages: { sender_type: string; created_at: Date }[] }) => {
        const firstCustomerMsg = session.messages.find((m: { sender_type: string; created_at: Date }) => m.sender_type === 'customer');
        if (!firstCustomerMsg) return;

        const firstStaffMsg = session.messages.find(
          (m: { sender_type: string; created_at: Date }) => m.sender_type === 'staff' && m.created_at > firstCustomerMsg.created_at
        );

        if (firstStaffMsg) {
          const diff = firstStaffMsg.created_at.getTime() - firstCustomerMsg.created_at.getTime();
          totalResponseTimeMs += diff;
          respondedSessionsCount += 1;
        }
      });

      let avgResponseTimeLabel = 'N/A';
      if (respondedSessionsCount > 0) {
        const avgMs = totalResponseTimeMs / respondedSessionsCount;
        const avgSec = Math.round(avgMs / 1000);
        if (avgSec < 60) {
          avgResponseTimeLabel = `${avgSec}s`;
        } else {
          const avgMin = Math.round(avgSec / 60);
          avgResponseTimeLabel = `${avgMin}m`;
        }
      }

      const responseRate = totalSessions > 0
        ? Math.round((respondedSessionsCount / totalSessions) * 100)
        : 100;

      const resolutionRate = totalSessions > 0
        ? Math.round((closedSessions / totalSessions) * 100)
        : 100;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: {
          subscriptions: user.can_view_subscriptions,
          analytics: user.can_view_analytics,
          settings: user.can_view_settings,
          orders: user.can_view_orders,
          chat: user.can_view_chat,
          payments: user.can_view_payments,
          overview: user.can_view_overview,
        },
        metrics: {
          totalSessions,
          activeSessions,
          closedSessions,
          avgResponseTime: avgResponseTimeLabel,
          responseRate: `${responseRate}%`,
          resolutionRate: `${resolutionRate}%`,
        },
        created_at: user.created_at,
      };
    });

    return NextResponse.json({ success: true, staff: staffList });
  } catch (error) {
    console.error('GET /api/staff error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Create a new staff member (Admin only)
export async function POST(request: Request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const { name, email, password, permissions } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    // Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const subPerm = permissions?.subscriptions ? true : false;
    const anaPerm = permissions?.analytics ? true : false;
    const setPerm = permissions?.settings ? true : false;
    const ordPerm = permissions?.orders !== undefined ? !!permissions.orders : true;
    const chatPerm = permissions?.chat !== undefined ? !!permissions.chat : true;
    const payPerm = permissions?.payments !== undefined ? !!permissions.payments : false;
    const overPerm = permissions?.overview !== undefined ? !!permissions.overview : true;

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: passwordHash,
        role: 'staff',
        can_view_subscriptions: subPerm,
        can_view_analytics: anaPerm,
        can_view_settings: setPerm,
        can_view_orders: ordPerm,
        can_view_chat: chatPerm,
        can_view_payments: payPerm,
        can_view_overview: overPerm,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Staff member created successfully.',
      staff: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        permissions: {
          subscriptions: newUser.can_view_subscriptions,
          analytics: newUser.can_view_analytics,
          settings: newUser.can_view_settings,
          orders: newUser.can_view_orders,
          chat: newUser.can_view_chat,
          payments: newUser.can_view_payments,
          overview: newUser.can_view_overview,
        },
      },
    });
  } catch (error) {
    console.error('POST /api/staff error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PUT: Update staff member permissions or details (Admin only)
export async function PUT(request: Request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const { id, name, email, password, permissions } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Staff user ID is required.' }, { status: 400 });
    }

    // Check if staff member exists
    const user = await prisma.user.findFirst({
      where: { id: Number(id), role: 'staff' },
    });
    if (!user) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
    }

    // Check duplicate email if changed
    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email },
      });
      if (existing) {
        return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
      }
    }

    interface UserUpdateInput {
      name?: string;
      email?: string;
      password_hash?: string;
      can_view_subscriptions?: boolean;
      can_view_analytics?: boolean;
      can_view_settings?: boolean;
      can_view_orders?: boolean;
      can_view_chat?: boolean;
      can_view_payments?: boolean;
      can_view_overview?: boolean;
    }

    // Build update object
    const updateData: UserUpdateInput = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) {
      updateData.password_hash = await hashPassword(password);
    }
    if (permissions) {
      if (permissions.subscriptions !== undefined) {
        updateData.can_view_subscriptions = permissions.subscriptions;
      }
      if (permissions.analytics !== undefined) {
        updateData.can_view_analytics = permissions.analytics;
      }
      if (permissions.settings !== undefined) {
        updateData.can_view_settings = permissions.settings;
      }
      if (permissions.orders !== undefined) {
        updateData.can_view_orders = permissions.orders;
      }
      if (permissions.chat !== undefined) {
        updateData.can_view_chat = permissions.chat;
      }
      if (permissions.payments !== undefined) {
        updateData.can_view_payments = permissions.payments;
      }
      if (permissions.overview !== undefined) {
        updateData.can_view_overview = permissions.overview;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Staff member updated successfully.',
    });
  } catch (error) {
    console.error('PUT /api/staff error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Delete a staff member (Admin only)
export async function DELETE(request: Request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Staff user ID is required.' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { id: Number(id), role: 'staff' },
    });
    if (!user) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully.',
    });
  } catch (error) {
    console.error('DELETE /api/staff error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
