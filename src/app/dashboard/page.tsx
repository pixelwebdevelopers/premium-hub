'use client';

import React, { useEffect, useState } from 'react';
import { useDashboard } from './layout';
import styles from './page.module.css';
import {
  DollarSign,
  Users,
  CreditCard,
  Globe2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  X,
  Check,
  Search
} from 'lucide-react';

interface Order {
  id: number;
  tracking_id: string;
  customer_name: string;
  customer_email: string;
  whatsapp_number: string;
  screenshot_url: string;
  status: string;
  subscription_name: string;
  price: number;
  currency: string;
  created_at: string;
  updated_at: string;
  userId: number | null;
  duration_months: number;
  expires_at: string | null;
}

interface Subscription {
  id: number;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
}

export default function DashboardHome() {
  const { user } = useDashboard();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [clientSubs, setClientSubs] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracking states
  const [trackingInput, setTrackingInput] = useState('');
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const [stats, setStats] = useState({
    totalSales: '$0.00',
    activeSubscriptions: 0,
    assignedStaff: 0,
    gatewayStatus: 'Active',
  });
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadDashboardData() {
      try {
        const [ordersRes, subsRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/subscriptions/client')
        ]);

        if (ordersRes.ok && subsRes.ok) {
          const ordersData = await ordersRes.json();
          const subsData = await subsRes.json();
          setOrders(ordersData.orders || []);
          setClientSubs(subsData.subscriptions || []);
        } else {
          setError('Failed to load user portal data.');
        }
      } catch (err) {
        console.error(err);
        setError('An error occurred while loading your subscriptions.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  useEffect(() => {
    if (!user || user.role === 'customer') return;

    async function loadOverviewStats() {
      try {
        const response = await fetch('/api/analytics');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStats(data.stats);
            setRecentPurchases(data.recentPurchases);
            setSystemLogs(data.systemLogs);
          }
        }
      } catch (err) {
        console.error('Error loading overview data:', err);
      } finally {
        setIsOverviewLoading(false);
      }
    }

    loadOverviewStats();
  }, [user]);

  if (!user) return null;

  if (user.role !== 'admin' && user.role !== 'customer' && !user.permissions?.overview) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px', gap: '16px' }}>
        <AlertCircle size={48} color="#ef4444" />
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Access Denied</h2>
        <p style={{ color: '#64748b', fontSize: '14.5px', maxWidth: '360px', textAlign: 'center', lineHeight: '1.5' }}>
          You do not have the required permissions to access the Platform Overview. Please contact your system administrator.
        </p>
      </div>
    );
  }

  // Dynamically branch for CUSTOMER role
  if (user.role === 'customer') {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
          <Loader2 className={styles.spinner} size={28} color="#8b5cf6" />
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>Loading subscriptions...</span>
        </div>
      );
    }

    // Process subscriptions and orders
    const now = new Date();

    const activeSubs = orders.filter(o => {
      if (o.status !== 'completed') return false;
      const expiry = o.expires_at ? new Date(o.expires_at) : new Date(new Date(o.created_at).setMonth(new Date(o.created_at).getMonth() + o.duration_months));
      return expiry > now;
    });

    const expiredSubs = orders.filter(o => {
      if (o.status !== 'completed') return false;
      const expiry = o.expires_at ? new Date(o.expires_at) : new Date(new Date(o.created_at).setMonth(new Date(o.created_at).getMonth() + o.duration_months));
      return expiry <= now;
    });

    const pendingOrders = orders.filter(o => o.status === 'unpaid' || o.status === 'paid');

    const getRemainingDays = (expiryStr: string | null, createdStr: string, duration: number) => {
      const expiry = expiryStr ? new Date(expiryStr) : new Date(new Date(createdStr).setMonth(new Date(createdStr).getMonth() + duration));
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    };

    const findRenewalId = (orderSubName: string) => {
      // Extract main service name, e.g., "Netflix Premium - Shared (3 Months)" -> "Netflix Premium"
      const mainName = orderSubName.split(' - ')[0].trim();
      const matched = clientSubs.find(s => s.name.toLowerCase() === mainName.toLowerCase());
      return matched ? matched.id : null;
    };

    const handleTrackOrderSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!trackingInput.trim()) return;

      setIsTracking(true);
      setTrackError(null);
      setTrackedOrder(null);

      try {
        const response = await fetch(`/api/orders/track?id=${trackingInput.trim()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Tracking details not found.');
        }

        setTrackedOrder(data.order);
        setTrackModalOpen(true);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Tracking search failed.';
        setTrackError(errorMessage);
        alert(errorMessage);
      } finally {
        setIsTracking(false);
      }
    };

    const getStatusStepIndex = (status: string) => {
      if (status === 'completed') return 3;
      if (status === 'paid') return 2;
      return 1;
    };

    return (
      <div className="animate-fade-in">
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', fontSize: '13.5px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {/* Welcome Customer Banner */}
        <div className={styles.welcomeCard}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h1 className={styles.welcomeTitle}>Hello, {user.name}!</h1>
            <p className={styles.welcomeDesc}>
              Manage and view your active premium subscriptions here. You can renew expired packages or place new orders directly.
            </p>
          </div>
          
          {/* Quick Track Order Search Box */}
          <div style={{ marginTop: '24px', maxWidth: '420px' }}>
            <form onSubmit={handleTrackOrderSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Enter Tracking ID (e.g. PH-XXXXXX)"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  outline: 'none',
                }}
                required
              />
              <button
                type="submit"
                style={{
                  background: 'var(--accent-purple)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'opacity 0.2s',
                }}
                disabled={isTracking}
              >
                {isTracking ? <Loader2 className={styles.spinner} size={14} /> : <Search size={14} />}
                <span>Track Order</span>
              </button>
            </form>
          </div>
        </div>

        {/* Customer Stats Row */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} glassmorphism`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Active Subscriptions</span>
              <div className={`${styles.iconWrapper} ${styles.iconGreen}`}>
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className={styles.statValue}>{activeSubs.length}</div>
            <div className={styles.statFooter}>
              <span className={styles.trendMuted}>Fully setup and ready to use</span>
            </div>
          </div>

          <div className={`${styles.statCard} glassmorphism`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Pending Verification</span>
              <div className={`${styles.iconWrapper} ${styles.iconAmber}`}>
                <Clock size={20} />
              </div>
            </div>
            <div className={styles.statValue}>{pendingOrders.length}</div>
            <div className={styles.statFooter}>
              <span className={styles.trendMuted}>Awaiting receipt verification</span>
            </div>
          </div>

          <div className={`${styles.statCard} glassmorphism`}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Expired Packages</span>
              <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className={styles.statValue}>{expiredSubs.length}</div>
            <div className={styles.statFooter}>
              <span className={styles.trendMuted}>Eligible for instant renewal</span>
            </div>
          </div>
        </div>

        {/* Active Subscriptions Grid */}
        <div style={{ marginTop: '36px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>My Active Subscriptions</h2>
          {activeSubs.length === 0 ? (
            <div className={`${styles.panel} glassmorphism`} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <CreditCard size={32} style={{ marginBottom: '12px', color: '#4b5563' }} />
              <p>You have no active premium subscriptions at this time.</p>
              <button 
                onClick={() => window.location.href = '/'}
                className={styles.welcomeDesc} 
                style={{ background: '#8b5cf6', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13.5px', fontWeight: 600, marginTop: '16px', cursor: 'pointer' }}
              >
                Browse Services
              </button>
            </div>
          ) : (
            <div className={styles.customerSubGrid}>
              {activeSubs.map((sub) => {
                const daysLeft = getRemainingDays(sub.expires_at, sub.created_at, sub.duration_months);
                return (
                  <div key={sub.id} className={`${styles.customerSubCard} glassmorphism`}>
                    <div className={styles.customerSubHeader}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{sub.subscription_name}</h3>
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>ID: {sub.tracking_id}</span>
                      </div>
                      <span className={styles.badgeSuccess}>Active</span>
                    </div>

                    <div className={styles.customerSubBody}>
                      <div className={styles.infoRow}>
                        <Calendar size={14} style={{ color: '#8b5cf6' }} />
                        <span>Expires on: {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'N/A'}</span>
                      </div>

                      {/* Circular Progress Bar Indicator */}
                      <div className={styles.progressSection}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: '#94a3b8' }}>Subscription status</span>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>{daysLeft} days left</span>
                        </div>
                        <div className={styles.progressBarBg}>
                          <div 
                            className={styles.progressBarFill} 
                            style={{ width: `${Math.min(100, (daysLeft / (sub.duration_months * 30)) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Track Order Modal */}
        {trackModalOpen && trackedOrder && (
          <div className={styles.modalOverlay} onClick={() => setTrackModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Track Order Details</h2>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => setTrackModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border-light)' }}>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                    Service Ordered: <strong style={{ color: 'var(--text-primary)' }}>{trackedOrder.subscription_name}</strong>
                  </p>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Price paid: <strong style={{ color: 'var(--accent-purple)' }}>{trackedOrder.price.toFixed(2)} {trackedOrder.currency}</strong>
                  </p>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Date: <strong style={{ color: 'var(--text-primary)' }}>{new Date(trackedOrder.created_at).toLocaleDateString()}</strong>
                  </p>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Tracking ID: <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{trackedOrder.tracking_id}</strong>
                  </p>
                </div>

                <div className={styles.timeline}>
                  <div className={styles.timelineLine} />
                  
                  {(() => {
                    const step = getStatusStepIndex(trackedOrder.status);
                    let w = '0%';
                    if (step === 2) w = '50%';
                    if (step === 3) w = '100%';
                    return <div className={styles.timelineLineActive} style={{ width: w }} />;
                  })()}

                  <div className={styles.timelineStep}>
                    <div className={`${styles.stepCircle} ${styles.stepCircleActive} ${
                      getStatusStepIndex(trackedOrder.status) >= 1 ? styles.stepCircleCompleted : ''
                    }`}>
                      {getStatusStepIndex(trackedOrder.status) >= 1 ? <Check size={14} /> : '1'}
                    </div>
                    <span className={`${styles.stepLabel} ${styles.stepLabelActive}`}>Placed</span>
                  </div>

                  <div className={styles.timelineStep}>
                    <div className={`${styles.stepCircle} ${
                      getStatusStepIndex(trackedOrder.status) >= 2 ? `${styles.stepCircleActive} ${styles.stepCircleCompleted}` : ''
                    }`}>
                      {getStatusStepIndex(trackedOrder.status) >= 2 ? <Check size={14} /> : '2'}
                    </div>
                    <span className={`${styles.stepLabel} ${
                      getStatusStepIndex(trackedOrder.status) >= 2 ? styles.stepLabelActive : ''
                    }`}>Verified</span>
                  </div>

                  <div className={styles.timelineStep}>
                    <div className={`${styles.stepCircle} ${
                      getStatusStepIndex(trackedOrder.status) >= 3 ? `${styles.stepCircleActive} ${styles.stepCircleCompleted}` : ''
                    }`}>
                      {getStatusStepIndex(trackedOrder.status) >= 3 ? <Check size={14} /> : '3'}
                    </div>
                    <span className={`${styles.stepLabel} ${
                      getStatusStepIndex(trackedOrder.status) >= 3 ? styles.stepLabelActive : ''
                    }`}>Done</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                    Current Status: 
                  </span>
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '13.5px', 
                    fontWeight: 700, 
                    color: trackedOrder.status === 'completed' ? '#10b981' : trackedOrder.status === 'paid' ? '#3b82f6' : '#f59e0b',
                    textTransform: 'uppercase'
                  }}>
                    {trackedOrder.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expired and Pending Split Grid */}
        <div className={styles.dashboardGrid} style={{ marginTop: '36px' }}>
          
          {/* Pending Orders Awaiting Review */}
          <div className={`${styles.panel} glassmorphism`}>
            <h3 className={styles.panelTitle}>Pending Orders</h3>
            {pendingOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13.5px' }}>
                <CheckCircle2 size={24} style={{ color: '#10b981', marginBottom: '8px' }} />
                <p>No orders pending. All payments are verified!</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Tracking ID</th>
                      <th className={styles.th}>Service Name</th>
                      <th className={styles.th}>Price Paid</th>
                      <th className={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td className={styles.td} style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ord.tracking_id}</td>
                        <td className={styles.td}>{ord.subscription_name}</td>
                        <td className={styles.td} style={{ color: '#a78bfa', fontWeight: 600 }}>{Number(ord.price).toFixed(2)} {ord.currency}</td>
                        <td className={styles.td}>
                          <span className={`${styles.badge} ${ord.status === 'paid' ? styles.badgeSuccess : styles.badgeWarning}`}>
                            {ord.status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expired Subscriptions for Renewal */}
          <div className={`${styles.panel} glassmorphism`}>
            <h3 className={styles.panelTitle}>Expired Subscriptions</h3>
            {expiredSubs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13.5px' }}>
                <Clock size={24} style={{ color: '#6b7280', marginBottom: '8px' }} />
                <p>No expired subscriptions to renew.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {expiredSubs.map((sub) => {
                  const renewalId = findRenewalId(sub.subscription_name);
                  return (
                    <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', padding: '12px 16px', borderRadius: '12px' }}>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{sub.subscription_name}</h4>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Expired on: {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      {renewalId && (
                        <button
                          onClick={() => window.location.href = `/checkout?id=${renewalId}`}
                          style={{
                            background: '#8b5cf6',
                            border: 'none',
                            color: '#ffffff',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span>Renew</span>
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isOverviewLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
        <Loader2 size={36} color="#8b5cf6" />
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading platform dashboard...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">


      {/* Statistics Row */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glassmorphism`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Sales Revenue</span>
            <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className={styles.statValue}>{stats.totalSales}</div>
          <div className={styles.statFooter}>
            <span className={styles.trendMuted}>All channels tracked in USD</span>
          </div>
        </div>

        <div className={`${styles.statCard} glassmorphism`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Active Subscriptions</span>
            <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>
              <CreditCard size={20} />
            </div>
          </div>
          <div className={styles.statValue}>{stats.activeSubscriptions}</div>
          <div className={styles.statFooter}>
            <span className={styles.trendMuted}>Active client service profiles</span>
          </div>
        </div>

        <div className={`${styles.statCard} glassmorphism`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Assigned Staff Users</span>
            <div className={`${styles.iconWrapper} ${styles.iconGreen}`}>
              <Users size={20} />
            </div>
          </div>
          <div className={styles.statValue}>{stats.assignedStaff}</div>
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
          <div className={styles.statValue}>{stats.gatewayStatus}</div>
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
          {recentPurchases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              No transactions recorded yet.
            </div>
          ) : (
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
          )}
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

// Inline fallback loader helper
function Loader2({ className, size, color }: { className?: string, size?: number, color?: string }) {
  return (
    <svg 
      className={className} 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color || "currentColor"} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <line x1="12" y1="2" x2="12" y2="6"></line>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
      <line x1="2" y1="12" x2="6" y2="12"></line>
      <line x1="18" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
    </svg>
  );
}
