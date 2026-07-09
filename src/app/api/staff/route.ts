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

    const staffList = staff.map((user: typeof staff[0]) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: {
        subscriptions: user.can_view_subscriptions,
        analytics: user.can_view_analytics,
        settings: user.can_view_settings,
      },
      created_at: user.created_at,
    }));

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

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: passwordHash,
        role: 'staff',
        can_view_subscriptions: subPerm,
        can_view_analytics: anaPerm,
        can_view_settings: setPerm,
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
