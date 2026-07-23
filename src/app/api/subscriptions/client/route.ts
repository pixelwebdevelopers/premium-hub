import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// GET: Retrieve all active subscriptions with country overrides for client landing page
export async function GET() {
  try {
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
      default_full_account_price: sub.default_full_account_price !== null ? Number(sub.default_full_account_price) : null,
      default_currency: sub.default_currency,
      default_description: sub.default_description,
      default_shared_description: sub.default_shared_description,
      default_private_description: sub.default_private_description,
      default_full_account_description: sub.default_full_account_description,
      countries: sub.countries.map((c: typeof sub.countries[0]) => ({
        id: c.id,
        country_code: c.country_code,
        price: c.price !== null ? Number(c.price) : null,
        shared_price: c.shared_price !== null ? Number(c.shared_price) : null,
        private_price: c.private_price !== null ? Number(c.private_price) : null,
        full_account_price: c.full_account_price !== null ? Number(c.full_account_price) : null,
        currency: c.currency,
        description: c.description,
        shared_description: c.shared_description,
        private_description: c.private_description,
        full_account_description: c.full_account_description,
        is_visible: c.is_visible,
      })),
    }));

    return NextResponse.json({ success: true, subscriptions: subscriptionsList });
  } catch (error) {
    console.error('GET /api/subscriptions/client error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
