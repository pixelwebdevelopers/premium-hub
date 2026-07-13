import { NextResponse } from 'next/server';
import { User } from '@prisma/client';
import prisma from '../../../../lib/prisma';
import { signJWT } from '../../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required.' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User account not found.' },
        { status: 404 }
      );
    }

    if (user.is_verified) {
      // Already verified, generate session and log in
      return loginUser(user);
    }

    // Check code and expiry
    if (user.verification_code !== code.trim()) {
      return NextResponse.json(
        { error: 'Invalid verification code.' },
        { status: 400 }
      );
    }

    if (user.verification_code_expires && new Date() > user.verification_code_expires) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark as verified
    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        is_verified: true,
        verification_code: null,
        verification_code_expires: null,
      },
    });

    return loginUser(verifiedUser);
  } catch (error: unknown) {
    console.error('Verification API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

async function loginUser(user: User) {
  // Generate JWT payload
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    can_view_subscriptions: Boolean(user.can_view_subscriptions),
    can_view_analytics: Boolean(user.can_view_analytics),
    can_view_settings: Boolean(user.can_view_settings),
  };

  // Sign JWT
  const token = await signJWT(payload, JWT_SECRET);

  // Set cookie response
  const response = NextResponse.json({
    success: true,
    message: 'Email verified and logged in successfully.',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: {
        subscriptions: Boolean(user.can_view_subscriptions),
        analytics: Boolean(user.can_view_analytics),
        settings: Boolean(user.can_view_settings),
      }
    }
  });

  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
    sameSite: 'lax',
  });

  return response;
}
