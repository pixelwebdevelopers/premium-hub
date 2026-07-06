import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { verifyJWT } from '../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

// Authenticate session for dashboard users (Admin/Staff)
async function authenticateUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenCookie = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith('auth-token='));
  
  if (!tokenCookie) return null;

  const token = tokenCookie.split('=')[1];
  try {
    const decoded = await verifyJWT(token, JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

// GET: List all orders (Authenticated Admin/Staff)
export async function GET(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      orderBy: { created_at: 'desc' },
    });

    // Format Decimal fields to standard numbers
    const formattedOrders = orders.map((order) => ({
      ...order,
      price: Number(order.price),
    }));

    return NextResponse.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Place a new order (Public Customer Checkout)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customer_name,
      customer_email,
      whatsapp_number,
      screenshot_url,
      subscription_name,
      price,
      currency,
    } = body;

    // Validate fields
    if (
      !customer_name ||
      !customer_email ||
      !whatsapp_number ||
      !screenshot_url ||
      !subscription_name ||
      price === undefined ||
      !currency
    ) {
      return NextResponse.json(
        { error: 'All fields (name, email, whatsapp, screenshot, subscription, price, currency) are required.' },
        { status: 400 }
      );
    }

    // Generate a unique tracking ID: PH-XXXXXX
    let tracking_id = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const randNum = Math.floor(100000 + Math.random() * 900000);
      tracking_id = `PH-${randNum}`;
      
      const existing = await prisma.order.findUnique({
        where: { tracking_id },
      });
      
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate a unique tracking ID.');
    }

    // Create the order in the database
    const newOrder = await prisma.order.create({
      data: {
        tracking_id,
        customer_name,
        customer_email,
        whatsapp_number,
        screenshot_url,
        subscription_name,
        price: Number(price),
        currency,
        status: 'unpaid', // Initial stage
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully.',
      tracking_id: newOrder.tracking_id,
    });
  } catch (error: unknown) {
    console.error('POST /api/orders error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
