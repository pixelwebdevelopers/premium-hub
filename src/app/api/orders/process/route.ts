import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyJWT } from '../../../../lib/auth';

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

// POST: Update status of an order (Authenticated Admin/Staff)
export async function POST(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const body = await request.json();
    const { order_id, status } = body;

    if (!order_id || !status) {
      return NextResponse.json({ error: 'order_id and status are required.' }, { status: 400 });
    }

    // Validate status values
    const validStatuses = ['unpaid', 'paid', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: Number(order_id) },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      message: `Order status updated to '${status}'.`,
      order: {
        ...updatedOrder,
        price: Number(updatedOrder.price),
      },
    });
  } catch (error: unknown) {
    console.error('POST /api/orders/process error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
export { POST as PATCH }; // support PATCH too
