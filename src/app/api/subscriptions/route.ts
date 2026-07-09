import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { verifyJWT } from '../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

// Helper to authenticate session and return payload
async function authenticateUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenCookie = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith('auth-token='));
  
  if (!tokenCookie) return null;

  const token = tokenCookie.split('=')[1];
  const decoded = await verifyJWT(token, JWT_SECRET);
  return decoded;
}

// GET: List all subscriptions with overrides (Admin or authorized Staff)
export async function GET(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    // Check permissions
    if (user.role === 'staff' && !user.can_view_subscriptions) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const subscriptions = await prisma.subscription.findMany({
      include: {
        countries: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const subscriptionsList = subscriptions.map((sub: typeof subscriptions[0]) => ({
      id: sub.id,
      name: sub.name,
      logo_url: sub.logo_url,
      cover_url: sub.cover_url,
      is_global: sub.is_global,
      default_price: sub.default_price !== null ? Number(sub.default_price) : null,
      default_shared_price: sub.default_shared_price !== null ? Number(sub.default_shared_price) : null,
      default_private_price: sub.default_private_price !== null ? Number(sub.default_private_price) : null,
      default_currency: sub.default_currency,
      default_description: sub.default_description,
      countries: sub.countries.map((c: typeof sub.countries[0]) => ({
        id: c.id,
        country_code: c.country_code,
        price: c.price !== null ? Number(c.price) : null,
        shared_price: c.shared_price !== null ? Number(c.shared_price) : null,
        private_price: c.private_price !== null ? Number(c.private_price) : null,
        currency: c.currency,
        description: c.description,
        is_visible: c.is_visible,
      })),
    }));

    return NextResponse.json({ success: true, subscriptions: subscriptionsList });
  } catch (error) {
    console.error('GET /api/subscriptions error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

interface CountryInput {
  country_code: string;
  price?: number | null;
  shared_price?: number | null;
  private_price?: number | null;
  currency: string;
  description: string;
  is_visible: boolean;
}

// POST: Create a new subscription with country overrides (Admin only)
export async function POST(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      logo_url, 
      cover_url, 
      is_global, 
      default_price, 
      default_shared_price,
      default_private_price,
      default_currency, 
      default_description, 
      countries 
    } = body;

    if (!name || !default_currency || !default_description) {
      return NextResponse.json({ error: 'Name, default currency, and default description are required.' }, { status: 400 });
    }

    if (
      default_price === undefined && 
      default_shared_price === undefined && 
      default_private_price === undefined
    ) {
      return NextResponse.json({ error: 'At least one default price tier must be provided.' }, { status: 400 });
    }

    const newSub = await prisma.subscription.create({
      data: {
        name,
        logo_url: logo_url || null,
        cover_url: cover_url || null,
        is_global: Boolean(is_global),
        default_price: default_price !== undefined && default_price !== null ? Number(default_price) : null,
        default_shared_price: default_shared_price !== undefined && default_shared_price !== null ? Number(default_shared_price) : null,
        default_private_price: default_private_price !== undefined && default_private_price !== null ? Number(default_private_price) : null,
        default_currency,
        default_description,
        countries: {
          create: (countries || []).map((c: CountryInput) => ({
            country_code: c.country_code,
            price: c.price !== undefined && c.price !== null ? Number(c.price) : null,
            shared_price: c.shared_price !== undefined && c.shared_price !== null ? Number(c.shared_price) : null,
            private_price: c.private_price !== undefined && c.private_price !== null ? Number(c.private_price) : null,
            currency: c.currency,
            description: c.description,
            is_visible: Boolean(c.is_visible),
          })),
        },
      },
    });

    return NextResponse.json({ success: true, message: 'Subscription created successfully.', id: newSub.id });
  } catch (error) {
    console.error('POST /api/subscriptions error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PUT: Update an existing subscription and overrides (Admin only)
export async function PUT(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      id, 
      name, 
      logo_url, 
      cover_url, 
      is_global, 
      default_price, 
      default_shared_price,
      default_private_price,
      default_currency, 
      default_description, 
      countries 
    } = body;

    if (!id || !name || !default_currency || !default_description) {
      return NextResponse.json({ error: 'ID, name, default currency, and default description are required.' }, { status: 400 });
    }

    if (
      default_price === undefined && 
      default_shared_price === undefined && 
      default_private_price === undefined
    ) {
      return NextResponse.json({ error: 'At least one default price tier must be provided.' }, { status: 400 });
    }

    // eslint-disable-next-line
    await prisma.$transaction(async (tx: any) => {
      // 1. Update subscription params
      await tx.subscription.update({
        where: { id: Number(id) },
        data: {
          name,
          logo_url: logo_url || null,
          cover_url: cover_url || null,
          is_global: Boolean(is_global),
          default_price: default_price !== undefined && default_price !== null ? Number(default_price) : null,
          default_shared_price: default_shared_price !== undefined && default_shared_price !== null ? Number(default_shared_price) : null,
          default_private_price: default_private_price !== undefined && default_private_price !== null ? Number(default_private_price) : null,
          default_currency,
          default_description,
        },
      });

      // 2. Delete existing overrides for this subscription
      await tx.subscriptionCountryOverride.deleteMany({
        where: { subscription_id: Number(id) },
      });

      // 3. Re-insert new overrides
      if (countries && Array.isArray(countries)) {
        await tx.subscriptionCountryOverride.createMany({
          data: countries.map((c: CountryInput) => ({
            subscription_id: Number(id),
            country_code: c.country_code,
            price: c.price !== undefined && c.price !== null ? Number(c.price) : null,
            shared_price: c.shared_price !== undefined && c.shared_price !== null ? Number(c.shared_price) : null,
            private_price: c.private_price !== undefined && c.private_price !== null ? Number(c.private_price) : null,
            currency: c.currency,
            description: c.description,
            is_visible: Boolean(c.is_visible),
          })),
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Subscription updated successfully.' });
  } catch (error) {
    console.error('PUT /api/subscriptions error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Delete a subscription (Admin only)
export async function DELETE(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required.' }, { status: 400 });
    }

    await prisma.subscription.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: 'Subscription deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/subscriptions error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
