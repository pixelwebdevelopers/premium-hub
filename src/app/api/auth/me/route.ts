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
      can_view_orders: boolean;
      can_view_chat: boolean;
      can_view_payments: boolean;
      can_view_overview: boolean;
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

    if (user.role === 'customer' && !user.is_verified) {
      const response = NextResponse.json({ error: 'Account not verified.' }, { status: 401 });
      response.cookies.set('auth-token', '', { maxAge: 0, path: '/' });
      return response;
    }

    const dbPermissions = {
      subscriptions: user.can_view_subscriptions,
      analytics: user.can_view_analytics,
      settings: user.can_view_settings,
      orders: user.can_view_orders,
      chat: user.can_view_chat,
      payments: user.can_view_payments,
      overview: user.can_view_overview,
    };

    // Check if the JWT permissions are outdated
    const jwtPermissions = {
      subscriptions: decoded.can_view_subscriptions !== undefined ? decoded.can_view_subscriptions : true,
      analytics: decoded.can_view_analytics !== undefined ? decoded.can_view_analytics : false,
      settings: decoded.can_view_settings !== undefined ? decoded.can_view_settings : false,
      orders: decoded.can_view_orders !== undefined ? decoded.can_view_orders : true,
      chat: decoded.can_view_chat !== undefined ? decoded.can_view_chat : true,
      payments: decoded.can_view_payments !== undefined ? decoded.can_view_payments : false,
      overview: decoded.can_view_overview !== undefined ? decoded.can_view_overview : true,
    };

    const isOutdated =
      jwtPermissions.subscriptions !== dbPermissions.subscriptions ||
      jwtPermissions.analytics !== dbPermissions.analytics ||
      jwtPermissions.settings !== dbPermissions.settings ||
      jwtPermissions.orders !== dbPermissions.orders ||
      jwtPermissions.chat !== dbPermissions.chat ||
      jwtPermissions.payments !== dbPermissions.payments ||
      jwtPermissions.overview !== dbPermissions.overview ||
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
        can_view_orders: dbPermissions.orders,
        can_view_chat: dbPermissions.chat,
        can_view_payments: dbPermissions.payments,
        can_view_overview: dbPermissions.overview,
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
