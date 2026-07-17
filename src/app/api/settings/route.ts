import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '../../../lib/prisma';
import { verifyJWT } from '../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';
const SETTINGS_FILE_PATH = path.join(process.cwd(), 'src', 'lib', 'settings.json');

const DEFAULT_CURRENCIES = {
  usd: true,
  eur: true,
  gbp: true,
  inr: true,
  jpy: true,
  cad: false,
  aud: false,
};

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

// GET: Retrieve DB configuration details & active currencies configuration
export async function GET(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // 1. Verify Prisma Local Connection
    let dbConnectionStatus = 'Disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnectionStatus = 'Connected';
    } catch (err) {
      console.warn('DB check error:', err);
    }

    // 2. Read Active Currencies from settings.json
    let activeCurrencies = DEFAULT_CURRENCIES;
    try {
      const data = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
      activeCurrencies = JSON.parse(data);
    } catch {
      // File doesn't exist yet, use default configuration
    }

    return NextResponse.json({
      success: true,
      dbStatus: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        database: process.env.DB_NAME || 'premium_hub',
        port: 3306,
        status: dbConnectionStatus,
      },
      currencies: activeCurrencies,
    });
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST: Save updated active currencies configuration to settings.json
export async function POST(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admins only.' }, { status: 403 });
    }

    const body = await request.json();
    const { currencies } = body;

    if (!currencies) {
      return NextResponse.json({ error: 'Currencies configurations are required.' }, { status: 400 });
    }

    // Make sure we have the correct settings directory created
    await fs.mkdir(path.dirname(SETTINGS_FILE_PATH), { recursive: true });

    // Write updated state
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(currencies, null, 2), 'utf-8');

    return NextResponse.json({ success: true, currencies });
  } catch (error) {
    console.error('POST /api/settings error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
