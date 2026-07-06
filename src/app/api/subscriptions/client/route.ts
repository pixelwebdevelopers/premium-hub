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

    const subscriptionsList = subscriptions.map((sub) => ({
      id: sub.id,
      name: sub.name,
      logo_url: sub.logo_url,
      cover_url: sub.cover_url,
      is_global: sub.is_global,
      default_price: Number(sub.default_price),
      default_currency: sub.default_currency,
      default_description: sub.default_description,
      countries: sub.countries.map((c) => ({
        id: c.id,
        country_code: c.country_code,
        price: Number(c.price),
        currency: c.currency,
        description: c.description,
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
