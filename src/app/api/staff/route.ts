import { NextResponse } from 'next/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../../../lib/db';
import { verifyJWT, hashPassword } from '../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

// Helper to authenticate Admin
async function authenticateAdmin(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenCookie = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith('auth-token='));
  
  if (!tokenCookie) return null;

  const token = tokenCookie.split('=')[1];
  const decoded = await verifyJWT(token, JWT_SECRET);
  if (!decoded || decoded.role !== 'admin') return null;

  return decoded;
}

interface StaffDBRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  role: string;
  can_view_subscriptions: number;
  can_view_analytics: number;
  can_view_settings: number;
  created_at: string;
}

// GET: Get all staff members (Admin only)
export async function GET(request: Request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const [rows] = await pool.query<StaffDBRow[]>(
      'SELECT id, name, email, role, can_view_subscriptions, can_view_analytics, can_view_settings, created_at FROM users WHERE role = "staff" ORDER BY created_at DESC'
    );

    const staffList = rows.map((user: StaffDBRow) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: {
        subscriptions: Boolean(user.can_view_subscriptions),
        analytics: Boolean(user.can_view_analytics),
        settings: Boolean(user.can_view_settings),
      },
      created_at: user.created_at,
    }));

    return NextResponse.json({ success: true, staff: staffList });
  } catch (error) {
    console.error('GET /api/staff error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Create a new staff member (Admin only)
export async function POST(request: Request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const { name, email, password, permissions } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    // Check if email already exists
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [email]);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const subPerm = permissions?.subscriptions ? 1 : 0;
    const anaPerm = permissions?.analytics ? 1 : 0;
    const setPerm = permissions?.settings ? 1 : 0;

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (name, email, password_hash, role, can_view_subscriptions, can_view_analytics, can_view_settings) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, 'staff', subPerm, anaPerm, setPerm]
    );

    return NextResponse.json({
      success: true,
      message: 'Staff member created successfully.',
      staff: {
        id: result.insertId,
        name,
        email,
        role: 'staff',
        permissions: {
          subscriptions: Boolean(subPerm),
          analytics: Boolean(anaPerm),
          settings: Boolean(setPerm),
        },
      },
    });
  } catch (error) {
    console.error('POST /api/staff error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PUT: Update staff member permissions or details (Admin only)
export async function PUT(request: Request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const { id, name, email, password, permissions } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Staff user ID is required.' }, { status: 400 });
    }

    // Check if staff member exists
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ? AND role = "staff"', [id]);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
    }

    // Build update query
    const updateFields = [];
    const queryParams = [];

    if (name) {
      updateFields.push('name = ?');
      queryParams.push(name);
    }

    if (email) {
      // Check duplicate email
      const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
      }
      updateFields.push('email = ?');
      queryParams.push(email);
    }

    if (password) {
      const passwordHash = await hashPassword(password);
      updateFields.push('password_hash = ?');
      queryParams.push(passwordHash);
    }

    if (permissions) {
      if (permissions.subscriptions !== undefined) {
        updateFields.push('can_view_subscriptions = ?');
        queryParams.push(permissions.subscriptions ? 1 : 0);
      }
      if (permissions.analytics !== undefined) {
        updateFields.push('can_view_analytics = ?');
        queryParams.push(permissions.analytics ? 1 : 0);
      }
      if (permissions.settings !== undefined) {
        updateFields.push('can_view_settings = ?');
        queryParams.push(permissions.settings ? 1 : 0);
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    // Append id to params and execute
    queryParams.push(id);
    await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      queryParams
    );

    return NextResponse.json({
      success: true,
      message: 'Staff member updated successfully.',
    });
  } catch (error) {
    console.error('PUT /api/staff error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE: Delete a staff member (Admin only)
export async function DELETE(request: Request) {
  try {
    const admin = await authenticateAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Staff user ID is required.' }, { status: 400 });
    }

    const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ? AND role = "staff"', [id]);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
    }

    await pool.query('DELETE FROM users WHERE id = ? AND role = "staff"', [id]);

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully.',
    });
  } catch (error) {
    console.error('DELETE /api/staff error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
