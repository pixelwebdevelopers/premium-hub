import { NextResponse } from 'next/server';
import { Order } from '@prisma/client';
import prisma from '../../../lib/prisma';
import { verifyJWT, hashPassword } from '../../../lib/auth';
import { sendEmail, getOrderEmailTemplate, getVerificationEmailTemplate } from '../../../lib/email';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

// Authenticate session for dashboard users (Admin/Staff/Customer)
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

// GET: List all orders (Authenticated Admin/Staff, or filtered for Customer)
export async function GET(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    let whereClause = {};
    if (user.role === 'customer') {
      whereClause = {
        OR: [
          { userId: Number(user.id) },
          { customer_email: user.email },
        ],
      };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    // Format Decimal fields to standard numbers
    const formattedOrders = orders.map((order: Order) => ({
      ...order,
      price: Number(order.price),
    }));

    return NextResponse.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Place a new order (Public Customer Checkout, Optional Account Creation)
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
      duration_months,
      create_account,
      password,
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

    const emailLower = customer_email.toLowerCase().trim();

    // Check if user is logged in
    const loggedInUser = await authenticateUser(request);
    let linkedUserId: number | null = null;
    if (loggedInUser && loggedInUser.role === 'customer') {
      linkedUserId = Number(loggedInUser.id);
    }

    let requiresVerification = false;

    // If customer requested account creation and is not already logged in
    if (create_account && !linkedUserId) {
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: 'Password is required and must be at least 6 characters.' },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: emailLower },
      });

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      const passwordHash = await hashPassword(password);

      if (existingUser) {
        if (existingUser.is_verified) {
          return NextResponse.json(
            { error: 'An account with this email already exists. Please log in first.' },
            { status: 400 }
          );
        }

        // Update password and send code
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: customer_name,
            password_hash: passwordHash,
            verification_code: verificationCode,
            verification_code_expires: verificationExpires,
          },
        });
        linkedUserId = updatedUser.id;
      } else {
        // Create unverified customer
        const newUser = await prisma.user.create({
          data: {
            name: customer_name,
            email: emailLower,
            password_hash: passwordHash,
            role: 'customer',
            is_verified: false,
            verification_code: verificationCode,
            verification_code_expires: verificationExpires,
            can_view_subscriptions: false,
            can_view_analytics: false,
            can_view_settings: false,
          },
        });
        linkedUserId = newUser.id;
      }

      requiresVerification = true;

      // Send verification OTP email
      await sendEmail({
        to: emailLower,
        subject: 'Verify your Premium Hub account',
        html: getVerificationEmailTemplate(customer_name, verificationCode),
      });
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

    const duration = Number(duration_months) || 1;

    // Create the order in the database
    const newOrder = await prisma.order.create({
      data: {
        tracking_id,
        customer_name,
        customer_email: emailLower,
        whatsapp_number,
        screenshot_url,
        subscription_name,
        price: Number(price),
        currency,
        status: 'unpaid',
        userId: linkedUserId,
        duration_months: duration,
      },
    });

    // Send order confirmation email
    await sendEmail({
      to: emailLower,
      subject: `Order Recieved: ${subscription_name} [${tracking_id}]`,
      html: getOrderEmailTemplate(
        customer_name,
        tracking_id,
        subscription_name,
        Number(price).toFixed(2),
        currency,
        'unpaid',
        'We will verify your payment screenshot. Once approved, your subscription will be activated.'
      ),
    });

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully.',
      tracking_id: newOrder.tracking_id,
      requires_verification: requiresVerification,
      email: emailLower,
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
