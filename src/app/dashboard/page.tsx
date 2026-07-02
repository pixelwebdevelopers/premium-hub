'use client';

import React from 'react';
import { useDashboard } from './layout';
import styles from './page.module.css';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
  Activity,
  Globe2,
} from 'lucide-react';

export default function DashboardHome() {
  const { user } = useDashboard();

  if (!user) return null;

  // Mock list of recent subscription transactions (representing selling subscriptions)
  const recentPurchases = [
    { id: 'TXN-9081', user: 'Sarah Jenkins', package: 'Enterprise Monthly', amount: '$149.00', country: 'United States', status: 'Completed' },
    { id: 'TXN-9080', user: 'Kenji Sato', package: 'Developer Annual', amount: '$499.00', country: 'Japan', status: 'Completed' },
    { id: 'TXN-9079', user: 'Maria Dupont', package: 'Pro Monthly', amount: '$49.00', country: 'France', status: 'Pending' },
    { id: 'TXN-9078', user: 'Amit Patel', package: 'Enterprise Monthly', amount: '$149.00', country: 'India', status: 'Completed' },
    { id: 'TXN-9077', user: 'Liam Wilson', package: 'Pro Monthly', amount: '$49.00', country: 'United Kingdom', status: 'Completed' },
  ];

  // Mock list of global system logs
  const systemLogs = [
    { text: 'Dynamic country router configured localized currency for Canada (CAD).', time: '10 minutes ago' },
    { text: 'Sarah Jenkins purchased "Enterprise Monthly" subscription package.', time: '24 minutes ago' },
    { text: 'Kenji Sato upgraded to "Developer Annual" subscription plan.', time: '1 hour ago' },
    { text: 'Staff account permissions updated for staff@premiumhub.com.', time: '3 hours ago' },
    { text: 'System automatically synchronized global tax configurations for EU countries.', time: '6 hours ago' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Welcome Card banner */}
      <div className={styles.welcomeCard}>
        <h1 className={styles.welcomeTitle}>Welcome back, {user.name}!</h1>
        <p className={styles.welcomeDesc}>
          Here is what is happening with the **Premium Hub** platform today. You are currently logged in as an **{user.role}** with customized dashboard access.
        </p>
      </div>

      {/* Statistics Row */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glassmorphism`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Sales Revenue</span>
            <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className={styles.statValue}>$48,256.40</div>
          <div className={styles.statFooter}>
            <TrendingUp size={16} className={styles.trendUp} />
            <span className={styles.trendUp}>+12.4%</span>
            <span className={styles.trendMuted}>vs last month</span>
          </div>
        </div>

        <div className={`${styles.statCard} glassmorphism`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Active Subscriptions</span>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>
              <CreditCard size={20} />
            </div>
          </div>
          <div className={styles.statValue}>1,284</div>
          <div className={styles.statFooter}>
            <TrendingUp size={16} className={styles.trendUp} />
            <span className={styles.trendUp}>+8.2%</span>
            <span className={styles.trendMuted}>vs last week</span>
          </div>
        </div>

        <div className={`${styles.statCard} glassmorphism`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Assigned Staff Users</span>
            <div className={`${styles.iconWrapper} ${styles.iconGreen}`}>
              <Users size={20} />
            </div>
          </div>
          <div className={styles.statValue}>8</div>
          <div className={styles.statFooter}>
            <span className={styles.trendMuted}>All users managed dynamically</span>
          </div>
        </div>

        <div className={`${styles.statCard} glassmorphism`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Country Dynamic Gateway</span>
            <div className={`${styles.iconWrapper} ${styles.iconAmber}`}>
              <Globe2 size={20} />
            </div>
          </div>
          <div className={styles.statValue}>Active</div>
          <div className={styles.statFooter}>
            <span className={styles.trendUp}>99.98%</span>
            <span className={styles.trendMuted}>Localized routers online</span>
          </div>
        </div>
      </div>

      {/* Grid of Main Panels */}
      <div className={styles.dashboardGrid}>
        {/* Recent Purchases Table */}
        <div className={`${styles.panel} glassmorphism`}>
          <h3 className={styles.panelTitle}>Recent Subscriptions Selling Activity</h3>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Transaction ID</th>
                  <th className={styles.th}>Subscriber</th>
                  <th className={styles.th}>Plan Package</th>
                  <th className={styles.th}>Amount</th>
                  <th className={styles.th}>Country Location</th>
                  <th className={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPurchases.map((txn) => (
                  <tr key={txn.id}>
                    <td className={styles.td} style={{ fontFamily: 'monospace', fontWeight: 600 }}>{txn.id}</td>
                    <td className={styles.td} style={{ fontWeight: 600 }}>{txn.user}</td>
                    <td className={styles.td}>{txn.package}</td>
                    <td className={styles.td} style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{txn.amount}</td>
                    <td className={styles.td}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Globe2 size={14} style={{ color: 'var(--text-secondary)' }} />
                        {txn.country}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${txn.status === 'Completed' ? styles.badgeSuccess : styles.badgeWarning}`}>
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global System Activities */}
        <div className={`${styles.panel} glassmorphism`}>
          <h3 className={styles.panelTitle}>System Platform Logs</h3>
          <div className={styles.activityList}>
            {systemLogs.map((log, index) => (
              <div key={index} className={styles.activityItem}>
                <div className={styles.activityDot} />
                <div className={styles.activityContent}>
                  <p className={styles.activityText}>{log.text}</p>
                  <span className={styles.activityTime}>{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
