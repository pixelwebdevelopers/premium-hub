import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyJWT, signJWT } from '../../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

export async function GET(request: Request) {
  try {
    // Get token from cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenCookie = cookieHeader
      .split(';')
      .find((c) => c.trim().startsWith('auth-token='));
    
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const token = tokenCookie.split('=')[1];
    interface JWTSessionPayload {
      id: number;
      name: string;
      email: string;
      role: string;
      can_view_subscriptions: boolean;
      can_view_analytics: boolean;
      can_view_settings: boolean;
    }
    const decoded = (await verifyJWT(token, JWT_SECRET)) as JWTSessionPayload | null;
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }

    // Query database for latest user info
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
    });

    if (!user) {
      // User was deleted from the database
      const response = NextResponse.json({ error: 'User not found.' }, { status: 401 });
      response.cookies.set('auth-token', '', { maxAge: 0, path: '/' });
      return response;
    }

    const dbPermissions = {
      subscriptions: user.can_view_subscriptions,
      analytics: user.can_view_analytics,
      settings: user.can_view_settings,
    };

    // Check if the JWT permissions are outdated
    const jwtPermissions = {
      subscriptions: decoded.can_view_subscriptions,
      analytics: decoded.can_view_analytics,
      settings: decoded.can_view_settings,
    };

    const isOutdated =
      jwtPermissions.subscriptions !== dbPermissions.subscriptions ||
      jwtPermissions.analytics !== dbPermissions.analytics ||
      jwtPermissions.settings !== dbPermissions.settings ||
      decoded.name !== user.name ||
      decoded.email !== user.email;

    const responseUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: dbPermissions,
    };

    const response = NextResponse.json({ success: true, user: responseUser });

    // If session is outdated, refresh the cookie
    if (isOutdated) {
      const newPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        can_view_subscriptions: dbPermissions.subscriptions,
        can_view_analytics: dbPermissions.analytics,
        can_view_settings: dbPermissions.settings,
      };
      const newToken = await signJWT(newPayload, JWT_SECRET);
      response.cookies.set('auth-token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 8,
        path: '/',
        sameSite: 'lax',
      });
    }

    return response;
  } catch (error) {
    console.error('Me API error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
