import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyJWT } from '../../../../lib/auth';

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

// PUT: Update quick reply (Admin only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const replyId = parseInt(id, 10);
    if (isNaN(replyId)) {
      return NextResponse.json({ error: 'Invalid quick reply ID.' }, { status: 400 });
    }

    const { shortcut, title, content } = await request.json();

    if (!shortcut || !title || !content) {
      return NextResponse.json(
        { error: 'Shortcut, title, and content are required.' },
        { status: 400 }
      );
    }

    const cleanShortcut = shortcut.replace(/^\/+/, '').trim().toLowerCase();

    // Check if shortcut conflicts with another item
    const existing = await prisma.quickReply.findFirst({
      where: {
        shortcut: cleanShortcut,
        NOT: { id: replyId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Shortcut /${cleanShortcut} is already used by another quick reply.` },
        { status: 400 }
      );
    }

    const updated = await prisma.quickReply.update({
      where: { id: replyId },
      data: {
        shortcut: cleanShortcut,
        title: title.trim(),
        content: content.trim(),
      },
    });

    return NextResponse.json({ success: true, quick_reply: updated });
  } catch (error) {
    console.error('Update quick reply error:', error);
    return NextResponse.json({ error: 'Failed to update quick reply.' }, { status: 500 });
  }
}

// DELETE: Delete quick reply (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const replyId = parseInt(id, 10);
    if (isNaN(replyId)) {
      return NextResponse.json({ error: 'Invalid quick reply ID.' }, { status: 400 });
    }

    await prisma.quickReply.delete({
      where: { id: replyId },
    });

    return NextResponse.json({ success: true, message: 'Quick reply deleted.' });
  } catch (error) {
    console.error('Delete quick reply error:', error);
    return NextResponse.json({ error: 'Failed to delete quick reply.' }, { status: 500 });
  }
}
