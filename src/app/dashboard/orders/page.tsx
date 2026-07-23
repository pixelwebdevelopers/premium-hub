'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Search, 
  ShoppingBag, 
  Check, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Eye, 
  X,
  Loader2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { useDashboard } from '../layout';
import { fuzzySearchFilter } from '@/lib/fuzzySearch';
import styles from './orders.module.css';

interface Order {
  id: number;
  tracking_id: string;
  customer_name: string;
  customer_email: string;
  whatsapp_number: string;
  screenshot_url: string;
  status: string; // 'unpaid', 'paid', 'completed'
  subscription_name: string;
  price: number;
  currency: string;
  created_at: string;
}

export default function AdminOrdersPage() {
  const { user, isLoading: userLoading } = useDashboard();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'paid' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Screenshot preview modal state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Status transition loader
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Load orders
  async function fetchOrders() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/orders');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders.');
      }
      setOrders(data.orders);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while loading orders.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!userLoading && (user?.role === 'admin' || user?.permissions?.orders)) {
      fetchOrders();
    }
  }, [user, userLoading]);

  if (userLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '12px' }}>
        <Loader2 className={styles.spinner} size={36} color="#8b5cf6" />
        <span style={{ color: '#64748b', fontSize: '14px' }}>Loading page data...</span>
      </div>
    );
  }

  if (user && user.role !== 'admin' && !user.permissions?.orders) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px', gap: '16px' }}>
        <AlertCircle size={48} color="#ef4444" />
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Access Denied</h2>
        <p style={{ color: '#64748b', fontSize: '14.5px', maxWidth: '360px', textAlign: 'center', lineHeight: '1.5' }}>
          You do not have the required permissions to access the Orders Management area. Please contact your system administrator.
        </p>
      </div>
    );
  }

  // Update order status
  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const response = await fetch('/api/orders/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          status: newStatus,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order status.');
      }

      // Update in local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (err: any) {
      alert(err.message || 'Error updating order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics calculators
  const metrics = {
    total: orders.length,
    unpaid: orders.filter((o) => o.status === 'unpaid').length,
    paid: orders.filter((o) => o.status === 'paid').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  };

  // Filtered orders list
  const tabFilteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  const filteredOrders = fuzzySearchFilter(
    tabFilteredOrders,
    searchQuery,
    (order) => [order.tracking_id, order.customer_name, order.customer_email, order.subscription_name]
  );

  const getWhatsAppLink = (number: string) => {
    // Strip non-digits to get clean phone number
    const cleanNumber = number.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}`;
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Orders Processing</h1>
          <p className={styles.subtitle}>Review payment receipts, communicate via WhatsApp, and process subscription deliveries.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricTitle}>Total Orders</span>
          <span className={styles.metricValue}>{metrics.total}</span>
        </div>
        <div className={styles.metricCard} style={{ borderLeft: '3px solid #d97706' }}>
          <span className={styles.metricTitle}>Unpaid</span>
          <span className={styles.metricValue} style={{ color: '#d97706' }}>{metrics.unpaid}</span>
        </div>
        <div className={styles.metricCard} style={{ borderLeft: '3px solid #2563eb' }}>
          <span className={styles.metricTitle}>Verified Paid</span>
          <span className={styles.metricValue} style={{ color: '#2563eb' }}>{metrics.paid}</span>
        </div>
        <div className={styles.metricCard} style={{ borderLeft: '3px solid #059669' }}>
          <span className={styles.metricTitle}>Completed</span>
          <span className={styles.metricValue} style={{ color: '#059669' }}>{metrics.completed}</span>
        </div>
      </div>

      {/* Filters Row */}
      <div className={styles.filterRow}>
        <div className={styles.filterTabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Orders ({metrics.total})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'unpaid' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('unpaid')}
          >
            Unpaid ({metrics.unpaid})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'paid' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('paid')}
          >
            Paid ({metrics.paid})
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'completed' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({metrics.completed})
          </button>
        </div>

        <div className={styles.searchBoxWrapper}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className={styles.searchIcon} size={16} />
        </div>
      </div>

      {/* Orders Table */}
      <div className={styles.tablePanel}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: '12px' }}>
            <Loader2 className={styles.spinner} size={36} color="#8b5cf6" />
            <span style={{ color: '#64748b', fontSize: '14px' }}>Loading orders database...</span>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <AlertCircle size={36} color="#ef4444" />
            <p className={styles.emptyTitle}>Error Loading Database</p>
            <p className={styles.emptyText}>{error}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <ShoppingBag size={36} color="#cbd5e1" />
            <p className={styles.emptyTitle}>No Orders Found</p>
            <p className={styles.emptyText}>There are no orders matching your selected status filter or search parameters.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Tracking ID</th>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}>Customer</th>
                  <th className={styles.th}>WhatsApp</th>
                  <th className={styles.th}>Service</th>
                  <th className={styles.th}>Amount</th>
                  <th className={styles.th}>Receipt</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Process Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className={styles.tr}>
                    <td className={styles.td} style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                      {order.tracking_id}
                    </td>
                    <td className={styles.td} style={{ fontSize: '13px', color: '#64748b' }}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className={styles.td}>
                      <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{order.customer_email}</div>
                    </td>
                    <td className={styles.td}>
                      <a
                        href={getWhatsAppLink(order.whatsapp_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.whatsappLink}
                      >
                        <MessageSquare size={14} />
                        <span>Message</span>
                        <ExternalLink size={12} />
                      </a>
                    </td>
                    <td className={styles.td} style={{ fontWeight: 500 }}>
                      {order.subscription_name}
                    </td>
                    <td className={styles.td} style={{ fontWeight: 700, color: '#475569' }}>
                      {order.price.toFixed(2)} {order.currency}
                    </td>
                    <td className={styles.td}>
                      <button
                        type="button"
                        className={styles.viewScreenshotBtn}
                        onClick={() => setPreviewUrl(order.screenshot_url)}
                        title="Click to view payment receipt screenshot"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${
                        order.status === 'completed' 
                          ? styles.badgeCompleted 
                          : order.status === 'paid' 
                          ? styles.badgePaid 
                          : styles.badgeUnpaid
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {updatingId === order.id ? (
                        <Loader2 className={styles.spinner} size={18} color="#8b5cf6" />
                      ) : (
                        <div className={styles.actionsCell}>
                          {order.status !== 'unpaid' && (
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => handleUpdateStatus(order.id, 'unpaid')}
                            >
                              Unpaid
                            </button>
                          )}
                          {order.status !== 'paid' && (
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => handleUpdateStatus(order.id, 'paid')}
                            >
                              Paid
                            </button>
                          )}
                          {order.status !== 'completed' && (
                            <button
                              type="button"
                              className={styles.actionBtn}
                              style={{ background: '#059669', borderColor: '#059669', color: 'white' }}
                              onClick={() => handleUpdateStatus(order.id, 'completed')}
                            >
                              Done
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screenshot Preview Modal Overlay */}
      {previewUrl && (
        <div className={styles.previewOverlay} onClick={() => setPreviewUrl(null)}>
          <div className={styles.previewContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.previewClose}
              onClick={() => setPreviewUrl(null)}
            >
              <X size={16} />
            </button>
            <div className={styles.previewImageWrapper}>
              <Image
                src={previewUrl}
                alt="Payment Screenshot Receipt"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div style={{ marginTop: '12px' }}>
              <a 
                href={previewUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ fontSize: '13px', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                <span>Open image in new tab</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export const dynamic = 'force-dynamic';
