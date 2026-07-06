import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// GET: Retrieve all active payment methods for client checkout
export async function GET() {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: {
        is_active: true,
      },
      include: {
        countries: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({ success: true, paymentMethods });
  } catch (error) {
    console.error('GET /api/payments/client error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
