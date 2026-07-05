import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { verifyJWT } from '../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

// Helper to authenticate Admin or Staff with settings access
async function authenticateUser(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenCookie = cookieHeader
      .split(';')
      .find((c) => c.trim().startsWith('auth-token='));
    
    if (!tokenCookie) return null;

    const token = tokenCookie.split('=')[1];
    const decoded = await verifyJWT(token, JWT_SECRET);
    if (!decoded) return null;

    // Must be admin or have settings permission to view/configure payments
    const hasAccess = decoded.role === 'admin' || decoded.can_view_settings === true;
    if (!hasAccess) return null;

    return decoded;
  } catch (error) {
    console.error('Authentication helper error:', error);
    return null;
  }
}

// GET: Retrieve all payment methods
export async function GET(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const paymentMethods = await prisma.paymentMethod.findMany({
      include: {
        countries: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({ success: true, paymentMethods });
  } catch (error) {
    console.error('GET /api/payments error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Create a new payment method
export async function POST(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const { name, type, instructions, fields, is_global, is_active, countries } = await request.json();

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required.' }, { status: 400 });
    }

    const fieldsStr = typeof fields === 'string' ? fields : JSON.stringify(fields || []);

    const newPaymentMethod = await prisma.paymentMethod.create({
      data: {
        name,
        type,
        instructions: instructions || '',
        fields: fieldsStr,
        is_global: is_global !== undefined ? is_global : true,
        is_active: is_active !== undefined ? is_active : true,
        countries: {
          create: !is_global && Array.isArray(countries)
            ? countries.map((c: string) => ({ country_code: c }))
            : [],
        },
      },
      include: {
        countries: true,
      },
    });

    return NextResponse.json({ success: true, paymentMethod: newPaymentMethod });
  } catch (error) {
    console.error('POST /api/payments error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PUT: Update a payment method
export async function PUT(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const { id, name, type, instructions, fields, is_global, is_active, countries } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required.' }, { status: 400 });
    }

    const existing = await prisma.paymentMethod.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Payment method not found.' }, { status: 404 });
    }

    interface PaymentMethodUpdateInput {
      name?: string;
      type?: string;
      instructions?: string;
      is_active?: boolean;
      is_global?: boolean;
      fields?: string;
    }

    const updateData: PaymentMethodUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_global !== undefined) updateData.is_global = is_global;

    if (fields !== undefined) {
      updateData.fields = typeof fields === 'string' ? fields : JSON.stringify(fields);
    }

    if (is_global === true) {
      await prisma.paymentMethodCountry.deleteMany({
        where: { payment_method_id: Number(id) },
      });
    } else if (countries !== undefined && Array.isArray(countries)) {
      await prisma.$transaction([
        prisma.paymentMethodCountry.deleteMany({
          where: { payment_method_id: Number(id) },
        }),
        prisma.paymentMethodCountry.createMany({
          data: countries.map((c: string) => ({
            payment_method_id: Number(id),
            country_code: c,
          })),
        }),
      ]);
    }

    const updatedPaymentMethod = await prisma.paymentMethod.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        countries: true,
      },
    });

    return NextResponse.json({ success: true, paymentMethod: updatedPaymentMethod });
  } catch (error) {
    console.error('PUT /api/payments error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Delete a payment method
export async function DELETE(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required.' }, { status: 400 });
    }

    const existing = await prisma.paymentMethod.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Payment method not found.' }, { status: 404 });
    }

    await prisma.paymentMethod.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: 'Payment method deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/payments error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
