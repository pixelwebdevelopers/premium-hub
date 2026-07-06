import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// GET: Track an order by tracking_id (Public Endpoint)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trackingId = searchParams.get('id');

    if (!trackingId) {
      return NextResponse.json({ error: 'Tracking ID is required.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { tracking_id: trackingId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // Format Decimal for return JSON
    const formattedOrder = {
      tracking_id: order.tracking_id,
      customer_name: order.customer_name,
      subscription_name: order.subscription_name,
      price: Number(order.price),
      currency: order.currency,
      status: order.status,
      created_at: order.created_at,
    };

    return NextResponse.json({ success: true, order: formattedOrder });
  } catch (error) {
    console.error('GET /api/orders/track error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
