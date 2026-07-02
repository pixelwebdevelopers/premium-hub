'use client';

import React, { useState } from 'react';
import styles from '../page.module.css';
import { Settings, Database, ShieldAlert, CheckCircle2, Globe2, Save } from 'lucide-react';

export default function SettingsPage() {
  const [dbStatus] = useState({
    host: 'localhost',
    user: 'root',
    database: 'premium_hub',
    port: 3306,
    status: 'Connected',
  });

  const [activeCurrencies, setActiveCurrencies] = useState({
    usd: true,
    eur: true,
    gbp: true,
    inr: true,
    jpy: true,
    cad: false,
    aud: false,
  });

  const handleCurrencyToggle = (key: keyof typeof activeCurrencies) => {
    setActiveCurrencies({
      ...activeCurrencies,
      [key]: !activeCurrencies[key],
    });
  };

  const handleSaveSettings = () => {
    alert('Settings configuration saved successfully!');
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>System Configurations</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Configure database connectivity, security tokens, and localize dynamically available checkout currencies.
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
          onClick={handleSaveSettings}
        >
          <Save size={18} />
          <span>Save Settings</span>
        </button>
      </div>

      <div className={styles.dashboardGrid}>
        {/* Left Side: General and Currency Configs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* General Dynamic Currency Settings */}
          <div className="glassmorphism" style={{ borderRadius: 'var(--border-radius-md)', padding: '24px' }}>
            <h3 className={styles.panelTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe2 size={20} style={{ color: 'var(--accent-purple)' }} />
              Localized Currency Availability
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Enable which international billing currencies will be dynamically served to landing page visitors based on IP.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(activeCurrencies).map(([key, isChecked]) => {
                const label = key.toUpperCase();
                const desc =
                  key === 'usd' ? 'US Dollar (Default Base)' :
                  key === 'eur' ? 'Euro Zone' :
                  key === 'gbp' ? 'British Pound' :
                  key === 'inr' ? 'Indian Rupee' :
                  key === 'jpy' ? 'Japanese Yen' :
                  key === 'cad' ? 'Canadian Dollar' : 'Australian Dollar';
                
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-light)', borderRadius: 'var(--border-radius-sm)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{desc}</span>
                    </div>
                    {/* Toggle */}
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCurrencyToggle(key as keyof typeof activeCurrencies)}
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Side: Database Connection & Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* MySQL Database Configuration */}
          <div className="glassmorphism" style={{ borderRadius: 'var(--border-radius-md)', padding: '24px' }}>
            <h3 className={styles.panelTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={20} style={{ color: 'var(--accent-purple)' }} />
              Local Database Status
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Database Server</span>
                <span style={{ fontWeight: 600 }}>MySQL v8.x</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Connection URI</span>
                <span style={{ fontFamily: 'monospace' }}>mysql://{dbStatus.user}@localhost:{dbStatus.port}/{dbStatus.database}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Credentials State</span>
                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>No Password Set</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13.5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Connection Pool Status</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 600 }}>
                  <CheckCircle2 size={16} />
                  {dbStatus.status}
                </span>
              </div>
            </div>
          </div>

          {/* Security Alert Banner */}
          <div className="glassmorphism" style={{ borderRadius: 'var(--border-radius-md)', padding: '24px', border: '1px dashed var(--warning)', background: 'rgba(245, 158, 11, 0.02)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14.5px', fontWeight: 700, color: 'var(--warning)', marginBottom: '8px' }}>
              <ShieldAlert size={18} />
              Production Deployment Security Warning
            </h4>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your MySQL database configuration is currently utilizing empty passwords and default username **root**. Before transitioning the billing system to production, configure **DB_PASSWORD** inside **.env** and update MySQL privileges accordingly.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
