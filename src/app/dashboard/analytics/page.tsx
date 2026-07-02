'use client';

import React from 'react';
import styles from '../page.module.css';
import { BarChart2, Globe2, CreditCard, DollarSign, Calendar, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  // Sales by Country (representing global currency setups)
  const salesByCountry = [
    { country: 'United States', code: 'US', currency: 'USD', sales: '$21,715.38', percentage: 45 },
    { country: 'United Kingdom', code: 'GB', currency: 'GBP', sales: '$9,651.28', percentage: 20 },
    { country: 'India', code: 'IN', currency: 'INR', sales: '$7,238.46', percentage: 15 },
    { country: 'Japan', code: 'JP', currency: 'JPY', sales: '$5,790.77', percentage: 12 },
    { country: 'Germany', code: 'DE', currency: 'EUR', sales: '$3,860.51', percentage: 8 },
  ];

  // Monthly Revenue Chart Data (styled in CSS columns)
  const monthlyRevenue = [
    { month: 'Jan', val: 32 },
    { month: 'Feb', val: 45 },
    { month: 'Mar', val: 40 },
    { month: 'Apr', val: 62 },
    { month: 'May', val: 78 },
    { month: 'Jun', val: 95 },
  ];

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
          <div className={styles.statValue}>3.24%</div>
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
          <div className={styles.statValue}>$82.40</div>
          <div className={styles.statFooter}>
            <span className={styles.trendUp}>+4.2%</span>
            <span className={styles.trendMuted}>AOV growth</span>
          </div>
        </div>

        <div className={`${styles.statCard} glassmorphism`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Active Churn Rate</span>
            <div className={`${styles.iconWrapper} ${styles.iconGreen}`}>
              <CreditCard size={20} />
            </div>
          </div>
          <div className={styles.statValue}>1.85%</div>
          <div className={styles.statFooter}>
            <span className={styles.trendUp} style={{ color: 'var(--success)' }}>-0.3%</span>
            <span className={styles.trendMuted}>Churn reduction</span>
          </div>
        </div>
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

            {monthlyRevenue.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flexGrow: 1, zIndex: 2 }}>
                <div style={{ position: 'relative', width: '32px', height: `${item.val * 1.5}px`, background: 'linear-gradient(to top, var(--accent-purple), var(--accent-blue))', borderRadius: '4px 4px 0 0', display: 'flex', justifyContent: 'center' }}>
                  <span style={{ position: 'absolute', top: '-24px', fontSize: '11px', color: 'white', fontWeight: 600 }}>
                    {item.val}%
                  </span>
                </div>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{item.month}</span>
              </div>
            ))}
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
                    <span>{item.country} ({item.currency})</span>
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
