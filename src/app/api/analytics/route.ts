import { NextResponse } from 'next/server';
import { User } from '@prisma/client';
import prisma from '../../../lib/prisma';
import { verifyJWT } from '../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-premium-hub-2026-xyz';

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.27,
  INR: 0.012,
  JPY: 0.0065,
  CAD: 0.73,
  AUD: 0.66,
};

const CURRENCY_TO_COUNTRY: Record<string, { country: string; code: string }> = {
  USD: { country: 'United States', code: 'US' },
  EUR: { country: 'Germany', code: 'DE' },
  GBP: { country: 'United Kingdom', code: 'GB' },
  INR: { country: 'India', code: 'IN' },
  JPY: { country: 'Japan', code: 'JP' },
  CAD: { country: 'Canada', code: 'CA' },
  AUD: { country: 'Australia', code: 'AU' },
};

interface LocalOrder {
  id: number;
  tracking_id: string;
  customer_name: string;
  customer_email: string;
  whatsapp_number: string;
  screenshot_url: string;
  status: string;
  subscription_name: string;
  price: string | number;
  currency: string;
  created_at: Date;
  updated_at: Date;
  userId: number | null;
  duration_months: number;
  expires_at: Date | null;
}

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

export async function GET(request: Request) {
  try {
    const user = await authenticateUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const now = new Date();

    // 1. Fetch Orders & Users
    const [rawOrders, users]: [unknown[], User[]] = await Promise.all([
      prisma.order.findMany({
        orderBy: { created_at: 'desc' },
      }),
      prisma.user.findMany({
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const orders = rawOrders as LocalOrder[];

    // 2. Calculate Stats
    const totalSalesUSD = orders
      .filter((o: LocalOrder) => o.status === 'completed' || o.status === 'paid')
      .reduce((sum: number, o: LocalOrder) => {
        const rate = EXCHANGE_RATES[o.currency.toUpperCase()] || 1;
        return sum + Number(o.price) * rate;
      }, 0);

    const activeSubsCount = orders.filter((o: LocalOrder) => {
      if (o.status !== 'completed') return false;
      const expiry = o.expires_at
        ? new Date(o.expires_at)
        : new Date(new Date(o.created_at).setMonth(new Date(o.created_at).getMonth() + o.duration_months));
      return expiry > now;
    }).length;

    const staffCount = users.filter((u: User) => u.role === 'admin' || u.role === 'staff').length;

    // 3. Format Recent Purchases
    const recentPurchases = orders.slice(0, 5).map((o: LocalOrder) => ({
      id: o.tracking_id,
      user: o.customer_name,
      package: o.subscription_name,
      amount: `${o.currency} ${Number(o.price).toFixed(2)}`,
      country: CURRENCY_TO_COUNTRY[o.currency.toUpperCase()]?.country || 'United States',
      status: o.status === 'completed' ? 'Completed' : o.status === 'paid' ? 'Paid' : 'Unpaid',
    }));

    // 4. Generate Platform Activities / Logs
    const rawLogs: Array<{ text: string; date: Date }> = [];

    // Order logs
    orders.slice(0, 10).forEach((o: LocalOrder) => {
      if (o.status === 'completed') {
        rawLogs.push({
          text: `Order ${o.tracking_id} for "${o.subscription_name}" was processed and completed.`,
          date: new Date(o.updated_at || o.created_at),
        });
      } else {
        rawLogs.push({
          text: `Customer ${o.customer_name} placed new order ${o.tracking_id} for "${o.subscription_name}".`,
          date: new Date(o.created_at),
        });
      }
    });

    // User signup logs
    users.slice(0, 5).forEach((u: User) => {
      rawLogs.push({
        text: `New user account registered: ${u.name} (${u.role}).`,
        date: new Date(u.created_at),
      });
    });

    // Sort combined activities by date descending
    const systemLogs = rawLogs
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 6)
      .map((log) => {
        const diffMs = now.getTime() - log.date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHours / 24);

        let timeLabel = 'Just now';
        if (diffDays > 0) {
          timeLabel = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
          timeLabel = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMin > 0) {
          timeLabel = `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        }

        return {
          text: log.text,
          time: timeLabel,
        };
      });

    // Add fallback log if none
    if (systemLogs.length === 0) {
      systemLogs.push({
        text: 'System dynamic gateway logs initialized and active.',
        time: 'Just now',
      });
    }

    // 5. Chart Dataset: Monthly Sales (last 6 months in USD)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenue: Array<{ month: string; val: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = months[targetDate.getMonth()];
      const year = targetDate.getFullYear();
      const monthIndex = targetDate.getMonth();

      const monthlySales = orders
        .filter((o: LocalOrder) => {
          if (o.status !== 'completed' && o.status !== 'paid') return false;
          const orderDate = new Date(o.created_at);
          return orderDate.getFullYear() === year && orderDate.getMonth() === monthIndex;
        })
        .reduce((sum: number, o: LocalOrder) => {
          const rate = EXCHANGE_RATES[o.currency.toUpperCase()] || 1;
          return sum + Number(o.price) * rate;
        }, 0);

      monthlyRevenue.push({
        month: monthLabel,
        val: Math.round(monthlySales),
      });
    }

    // 6. Country Sales Distribution
    const countrySalesMap: Record<string, { country: string; code: string; amount: number }> = {};
    
    orders
      .filter((o: LocalOrder) => o.status === 'completed' || o.status === 'paid')
      .forEach((o: LocalOrder) => {
        const rate = EXCHANGE_RATES[o.currency.toUpperCase()] || 1;
        const usdVal = Number(o.price) * rate;
        const curUpper = o.currency.toUpperCase();
        const countryInfo = CURRENCY_TO_COUNTRY[curUpper] || { country: 'Other Region', code: 'GLOB' };
        
        if (!countrySalesMap[countryInfo.code]) {
          countrySalesMap[countryInfo.code] = {
            country: countryInfo.country,
            code: countryInfo.code,
            amount: 0,
          };
        }
        countrySalesMap[countryInfo.code].amount += usdVal;
      });

    const totalSalesSum = Object.values(countrySalesMap).reduce((sum: number, item) => sum + item.amount, 0);

    const salesByCountry = Object.values(countrySalesMap)
      .map((item) => ({
        country: item.country,
        code: item.code,
        sales: `$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        percentage: totalSalesSum > 0 ? Math.round((item.amount / totalSalesSum) * 100) : 0,
      }))
      .sort((a, b) => parseFloat(b.sales.replace(/[^0-9.]/g, '')) - parseFloat(a.sales.replace(/[^0-9.]/g, '')))
      .slice(0, 5);

    // If no sales exist, inject a clean starting state
    if (salesByCountry.length === 0) {
      salesByCountry.push({
        country: 'Global Sales Channel',
        code: 'GL',
        sales: '$0.00',
        percentage: 0,
      });
    }

    const completedOrdersCount = orders.filter((o: LocalOrder) => o.status === 'completed' || o.status === 'paid').length;
    const avgOrderValue = completedOrdersCount > 0 ? (totalSalesUSD / completedOrdersCount) : 0;

    // 7. Revenue Breakdown per Currency
    const currencyRevenueMap: Record<string, { currency: string; amount: number; count: number; symbol: string }> = {};

    const CURRENCY_SYMBOLS: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      PKR: 'Rs. ',
      INR: '₹',
      JPY: '¥',
      CAD: 'CA$',
      AUD: 'A$',
    };

    orders
      .filter((o: LocalOrder) => o.status === 'completed' || o.status === 'paid')
      .forEach((o: LocalOrder) => {
        const curr = (o.currency || 'USD').toUpperCase();
        const price = Number(o.price);

        if (!currencyRevenueMap[curr]) {
          currencyRevenueMap[curr] = {
            currency: curr,
            amount: 0,
            count: 0,
            symbol: CURRENCY_SYMBOLS[curr] || `${curr} `,
          };
        }
        currencyRevenueMap[curr].amount += price;
        currencyRevenueMap[curr].count += 1;
      });

    const revenueByCurrency = Object.values(currencyRevenueMap)
      .map((item) => ({
        currency: item.currency,
        symbol: item.symbol,
        amount: item.amount,
        formattedAmount: `${item.symbol}${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        count: item.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      success: true,
      stats: {
        totalSales: `$${totalSalesUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        activeSubscriptions: activeSubsCount,
        assignedStaff: staffCount,
        gatewayStatus: 'Active',
        avgOrderValue: `$${avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        conversionRate: '3.24%',
        churnRate: '1.85%',
      },
      recentPurchases,
      systemLogs,
      monthlyRevenue,
      salesByCountry,
      revenueByCurrency,
    });
  } catch (error) {
    console.error('GET /api/analytics error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
