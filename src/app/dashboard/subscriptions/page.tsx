'use client';

import React, { useState } from 'react';
import styles from '../page.module.css';
import { CreditCard, Plus, Users, ShieldCheck, Globe2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function SubscriptionsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock list of subscription packages
  const packages = [
    { name: 'Starter Plan', price: '$19/mo', users: 412, status: 'Active', features: ['1 User License', 'Basic API Access', 'Email Support'] },
    { name: 'Pro Plan', price: '$49/mo', users: 651, status: 'Active', features: ['5 User Licenses', 'Advanced API Access', '24/7 Chat Support', 'Dynamic Routing'] },
    { name: 'Enterprise Plan', price: '$149/mo', users: 198, status: 'Active', features: ['Unlimited Users', 'Dedicated DB Pool', 'SLA Guarantee', 'Localized Checkout'] },
    { name: 'Developer Annual', price: '$499/yr', users: 23, status: 'Active', features: ['Full Source Code Access', 'Beta Testing Access', 'Direct Dev Hot-line'] },
  ];

  // Mock subscriber data
  const subscribers = [
    { id: 'SUB-101', name: 'John Doe', email: 'john@gmail.com', plan: 'Pro Plan', country: 'United States', joined: 'July 01, 2026' },
    { id: 'SUB-102', name: 'Ayumi Tanaka', email: 'ayumi@yahoo.co.jp', plan: 'Developer Annual', country: 'Japan', joined: 'June 28, 2026' },
    { id: 'SUB-103', name: 'Carlos Gomez', email: 'carlos@outlook.es', plan: 'Starter Plan', country: 'Spain', joined: 'June 25, 2026' },
    { id: 'SUB-104', name: 'Priya Sharma', email: 'priya@techcorp.in', plan: 'Enterprise Plan', country: 'India', joined: 'June 22, 2026' },
    { id: 'SUB-105', name: 'Dieter Muller', email: 'dieter@muller-gmbh.de', plan: 'Enterprise Plan', country: 'Germany', joined: 'June 18, 2026' },
  ];

  const filteredSubscribers = subscribers.filter(
    (sub) =>
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.plan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>Subscription Packages</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Design, edit, and launch premium subscriber plans sold to users worldwide.
          </p>
        </div>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, var(--accent-purple) 0%, #7c3aed 100%)',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 'var(--border-radius-sm)',
            color: 'white',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
          }}
          onClick={() => alert('New subscription packages can be configured in Phase 2.')}
        >
          <Plus size={18} />
          <span>New Package</span>
        </button>
      </div>

      {/* Subscription Packages Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {packages.map((pkg, idx) => (
          <div key={idx} className="glassmorphism" style={{ borderRadius: 'var(--border-radius-md)', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>{pkg.name}</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '8px' }}>{pkg.price}</span>
              </div>
              <span className={styles.badge} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                {pkg.status}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              <Users size={16} />
              <span>{pkg.users} active subscribers</span>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-light)', marginBottom: '20px' }} />

            {/* Feature List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
              {pkg.features.map((feat, fidx) => (
                <div key={fidx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--accent-purple)' }} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Active Subscribers Panel */}
      <div className="glassmorphism" style={{ borderRadius: 'var(--border-radius-md)', padding: '24px' }}>
        <h3 className={styles.panelTitle}>Active Platform Subscribers</h3>
        
        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            className={styles.input}
            placeholder="Search subscribers by name, email, or package..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: '400px' }}
          />
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>ID</th>
                <th className={styles.th}>Subscriber</th>
                <th className={styles.th}>Email Address</th>
                <th className={styles.th}>Subscribed Package</th>
                <th className={styles.th}>Country Region</th>
                <th className={styles.th}>Activation Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscribers.map((sub) => (
                <tr key={sub.id}>
                  <td className={styles.td} style={{ fontFamily: 'monospace' }}>{sub.id}</td>
                  <td className={styles.td} style={{ fontWeight: 600 }}>{sub.name}</td>
                  <td className={styles.td}>{sub.email}</td>
                  <td className={styles.td}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-purple)', fontWeight: 600 }}>
                      <Sparkles size={14} />
                      {sub.plan}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Globe2 size={14} style={{ color: 'var(--text-secondary)' }} />
                      {sub.country}
                    </span>
                  </td>
                  <td className={styles.td}>{sub.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
