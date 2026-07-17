import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Verify token if present
  let payload = null;
  if (token) {
    payload = await verifyJWT(token, JWT_SECRET);
  }

  const isAuthenticated = !!payload;

  // 1. Unauthenticated users trying to access dashboard -> Redirect to login
  if (pathname.startsWith('/dashboard') && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated users trying to access login page -> Redirect to dashboard
  if (pathname === '/login' && isAuthenticated) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 3. Authenticated page authorization checks for /dashboard
  if (pathname.startsWith('/dashboard') && payload) {
    const { role } = payload;

    // Staff Management page is strictly Admin-only
    if (pathname.startsWith('/dashboard/staff') && role !== 'admin') {
      const url = new URL('/dashboard', request.url);
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }

    // Checking specific page permissions for staff
    if (role === 'staff') {
      const { can_view_subscriptions, can_view_analytics, can_view_settings } = payload;

      if (pathname.startsWith('/dashboard/subscriptions') && !can_view_subscriptions) {
        const url = new URL('/dashboard', request.url);
        url.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(url);
      }

      if (pathname.startsWith('/dashboard/analytics') && !can_view_analytics) {
        const url = new URL('/dashboard', request.url);
        url.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(url);
      }

      if (pathname.startsWith('/dashboard/settings') && !can_view_settings) {
        const url = new URL('/dashboard', request.url);
        url.searchParams.set('error', 'unauthorized');
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

// Config to run proxy only on specific paths
export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
  ],
};
