import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyJWT, hashPassword } from '../../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

export async function PUT(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenCookie = cookieHeader
      .split(';')
      .find((c) => c.trim().startsWith('auth-token='));
    
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const token = tokenCookie.split('=')[1];
    const decoded = await verifyJWT(token, JWT_SECRET);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }

    const { name, email, password } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if email already exists for another user
    const existing = await prisma.user.findFirst({
      where: {
        email: emailLower,
        NOT: { id: Number(decoded.id) }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
    }

    interface UserUpdateInput {
      name: string;
      email: string;
      password_hash?: string;
    }

    const updateData: UserUpdateInput = {
      name: name.trim(),
      email: emailLower,
    };

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
      }
      updateData.password_hash = await hashPassword(password);
    }

    await prisma.user.update({
      where: { id: Number(decoded.id) },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Profile update PUT error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
