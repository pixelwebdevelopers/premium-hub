import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { verifyJWT } from '../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

async function getAuthUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenCookie = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith('auth-token='));
  
  if (!tokenCookie) return null;

  const token = tokenCookie.split('=')[1];
  const decoded = await verifyJWT(token, JWT_SECRET);
  if (!decoded) return null;

  return decoded;
}

const DEFAULT_QUICK_REPLIES = [
  { shortcut: 'greeting', title: 'Standard Greeting', content: 'Hello! Thank you for contacting Premium Hub support. How can I help you today?' },
  { shortcut: 'receipt', title: 'Request Payment Receipt', content: 'To verify your order, please upload or send a screenshot of your payment receipt.' },
  { shortcut: 'credentials', title: 'Account Credentials Handover', content: 'Your premium account credentials have been configured. Please check your registered email or let me know if you need help.' },
  { shortcut: 'close', title: 'Close Support Ticket', content: 'I am marking this support session as resolved. Let us know if you need anything else. Thank you for choosing Premium Hub!' },
];

// GET: Fetch all quick replies (Staff/Admin)
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    let replies = await prisma.quickReply.findMany({
      orderBy: { shortcut: 'asc' },
    });

    // Auto-seed defaults if table is empty
    if (replies.length === 0) {
      await prisma.quickReply.createMany({
        data: DEFAULT_QUICK_REPLIES,
        skipDuplicates: true,
      });
      replies = await prisma.quickReply.findMany({
        orderBy: { shortcut: 'asc' },
      });
    }

    return NextResponse.json({ success: true, quick_replies: replies });
  } catch (error) {
    console.error('Fetch quick replies error:', error);
    return NextResponse.json({ error: 'Failed to fetch quick replies.' }, { status: 500 });
  }
}

// POST: Create quick reply (Admin only)
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin access required.' }, { status: 403 });
    }

    const { shortcut, title, content } = await request.json();

    if (!shortcut || !title || !content) {
      return NextResponse.json(
        { error: 'Shortcut, title, and content are required.' },
        { status: 400 }
      );
    }

    // Clean shortcut (remove leading slash if user added it, convert to lowercase alphanumeric/hyphen)
    const cleanShortcut = shortcut.replace(/^\/+/, '').trim().toLowerCase();

    if (!cleanShortcut) {
      return NextResponse.json({ error: 'Invalid shortcut name.' }, { status: 400 });
    }

    const existing = await prisma.quickReply.findUnique({
      where: { shortcut: cleanShortcut },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Shortcut /${cleanShortcut} already exists.` },
        { status: 400 }
      );
    }

    const created = await prisma.quickReply.create({
      data: {
        shortcut: cleanShortcut,
        title: title.trim(),
        content: content.trim(),
      },
    });

    return NextResponse.json({ success: true, quick_reply: created });
  } catch (error) {
    console.error('Create quick reply error:', error);
    return NextResponse.json({ error: 'Failed to create quick reply.' }, { status: 500 });
  }
}
