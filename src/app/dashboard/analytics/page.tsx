'use client';

import React, { useState, useEffect } from 'react';
import styles from '../page.module.css';
import { BarChart2, Globe2, CreditCard, DollarSign, Calendar, TrendingUp, Loader2 } from 'lucide-react';

interface MonthlyRevenueData {
  month: string;
  val: number;
}

interface SalesByCountryData {
  country: string;
  code: string;
  sales: string;
  percentage: number;
}

interface CurrencyRevenueData {
  currency: string;
  symbol: string;
  amount: number;
  formattedAmount: string;
  count: number;
}

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: '$0.00',
    activeSubscriptions: 0,
    assignedStaff: 0,
    gatewayStatus: 'Active',
    avgOrderValue: '$0.00',
    conversionRate: '3.24%',
    churnRate: '1.85%',
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenueData[]>([]);
  const [salesByCountry, setSalesByCountry] = useState<SalesByCountryData[]>([]);
  const [revenueByCurrency, setRevenueByCurrency] = useState<CurrencyRevenueData[]>([]);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const response = await fetch('/api/analytics');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStats(data.stats);
            setMonthlyRevenue(data.monthlyRevenue || []);
            setSalesByCountry(data.salesByCountry || []);
            setRevenueByCurrency(data.revenueByCurrency || []);
          }
        }
      } catch (err) {
        console.error('Error fetching analytics page data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
        <Loader2 size={36} color="#8b5cf6" className={styles.spinner} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading statistics and reports...</span>
      </div>
    );
  }

  // Calculate dynamic max value for scaling the CSS bar heights properly
  const maxRevenueVal = Math.max(...monthlyRevenue.map((item) => item.val), 1);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>Analytics & Reports</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Monitor localized checkout performance, subscription sales, and dynamic currency conversions.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '8px 16px', borderRadius: 'var(--border-radius-sm)', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
          <Calendar size={16} />
          <span>Last 6 Months</span>
        </div>
      </div>

      {/* Analytics Summary Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glassmorphism`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Conversion Rate</span>
            <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className={styles.statValue}>{stats.conversionRate}</div>
          <div className={styles.statFooter}>
            <span className={styles.trendUp}>+0.8%</span>
            <span className={styles.trendMuted}>vs last month</span>
          </div>
        </div>

        <div className={`${styles.statCard} glassmorphism`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Average Order Value</span>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className={styles.statValue}>{stats.avgOrderValue}</div>
          <div className={styles.statFooter}>
            <span className={styles.trendUp}>AOV aggregate</span>
          </div>
        </div>

        <div className={`${styles.statCard} glassmorphism`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Active Churn Rate</span>
            <div className={`${styles.iconWrapper} ${styles.iconGreen}`}>
              <CreditCard size={20} />
            </div>
          </div>
          <div className={styles.statValue}>{stats.churnRate}</div>
          <div className={styles.statFooter}>
            <span className={styles.trendUp} style={{ color: 'var(--success)' }}>-0.3%</span>
            <span className={styles.trendMuted}>Churn reduction</span>
          </div>
        </div>
      </div>

      {/* Separate Revenue Stats by Currency */}
      <div style={{ marginTop: '32px', marginBottom: '32px' }}>
        <h3 className={styles.panelTitle} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={18} style={{ color: 'var(--accent-purple)' }} />
          <span>Revenue Stats by Currency</span>
        </h3>
        {revenueByCurrency.length === 0 ? (
          <div className="glassmorphism" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13.5px', borderRadius: 'var(--border-radius-md)' }}>
            No revenue per currency recorded yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {revenueByCurrency.map((item) => (
              <div
                key={item.currency}
                className="glassmorphism"
                style={{
                  padding: '20px',
                  borderRadius: 'var(--border-radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  border: '1px solid var(--border-light)',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.03) 100%)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: 'var(--accent-purple)',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      padding: '3px 9px',
                      borderRadius: '6px',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                    }}
                  >
                    {item.currency}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {item.count} {item.count === 1 ? 'Order' : 'Orders'}
                  </span>
                </div>

                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', letterSpacing: '-0.5px' }}>
                  {item.formattedAmount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Charts & Visualizations Grid */}
      <div className={styles.dashboardGrid}>
        {/* Sales Revenue Graph */}
        <div className="glassmorphism" style={{ borderRadius: 'var(--border-radius-md)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 className={styles.panelTitle}>Monthly Sales Performance (USD)</h3>
          
          {/* Custom CSS Bar Graph */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '220px', padding: '20px 10px', marginTop: '20px', position: 'relative' }}>
            {/* Background Grid Lines */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: '20%', height: '1px', backgroundColor: 'var(--border-light)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', backgroundColor: 'var(--border-light)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '80%', height: '1px', backgroundColor: 'var(--border-light)' }} />

            {monthlyRevenue.map((item, idx) => {
              const heightPct = Math.max(8, (item.val / maxRevenueVal) * 100);
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flexGrow: 1, zIndex: 2 }}>
                  <div style={{ position: 'relative', width: '32px', height: `${heightPct * 1.5}px`, background: 'linear-gradient(to top, var(--accent-purple), var(--accent-blue))', borderRadius: '4px 4px 0 0', display: 'flex', justifyContent: 'center' }}>
                    <span style={{ position: 'absolute', top: '-24px', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      ${item.val}
                    </span>
                  </div>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Localized Currency Distribution */}
        <div className="glassmorphism" style={{ borderRadius: 'var(--border-radius-md)', padding: '24px' }}>
          <h3 className={styles.panelTitle}>Sales Distribution by Country</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            {salesByCountry.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <Globe2 size={16} style={{ color: 'var(--accent-purple)' }} />
                    <span>{item.country}</span>
                  </div>
                  <span style={{ fontWeight: 700 }}>{item.sales}</span>
                </div>
                {/* Horizontal Progress Bar representing sales share */}
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-blue))', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
