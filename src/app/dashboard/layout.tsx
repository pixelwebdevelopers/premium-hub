'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import styles from './dashboard.module.css';
import {
  Home,
  Users,
  CreditCard,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Loader2,
  Wallet,
  ShoppingBag,
} from 'lucide-react';

interface UserPermissions {
  subscriptions: boolean;
  analytics: boolean;
  settings: boolean;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  permissions: UserPermissions;
}

interface DashboardContextType {
  user: UserProfile | null;
  isLoading: boolean;
}

const DashboardContext = createContext<DashboardContextType>({
  user: null,
  isLoading: true,
});

export const useDashboard = () => useContext(DashboardContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Fetch logged-in user profile on load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          throw new Error('Unauthorized');
        }
        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error('Session error:', error);
        window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          gap: '16px',
        }}
      >
        <Loader2 className={styles.spinner} size={36} color="#8b5cf6" />
        <span style={{ color: '#a1a1aa', fontSize: '14px' }}>Verifying security session...</span>
      </div>
    );
  }

  if (!user) return null;

  // Navigation Links mapping based on user permissions
  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: Home, show: true },
    { href: '/dashboard/orders', label: 'Orders', icon: ShoppingBag, show: true },
    { href: '/dashboard/staff', label: 'Staff Access', icon: Users, show: user.role === 'admin' },
    {
      href: '/dashboard/subscriptions',
      label: 'Subscriptions',
      icon: CreditCard,
      show: user.role === 'admin' || user.permissions.subscriptions,
    },
    {
      href: '/dashboard/payments',
      label: 'Payments',
      icon: Wallet,
      show: user.role === 'admin' || user.permissions.settings,
    },
    {
      href: '/dashboard/analytics',
      label: 'Analytics',
      icon: BarChart2,
      show: user.role === 'admin' || user.permissions.analytics,
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: Settings,
      show: user.role === 'admin' || user.permissions.settings,
    },
  ];

  const sidebarClass = `${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''} ${
    isMobileOpen ? styles.sidebarActive : ''
  }`;

  const mainWrapperClass = `${styles.mainWrapper} ${
    isCollapsed ? styles.mainWrapperSidebarCollapsed : ''
  }`;

  // Get current page header title
  const currentItem = navItems.find((item) => item.href === pathname);
  const pageTitle = currentItem ? currentItem.label : 'Premium Hub';

  return (
    <DashboardContext.Provider value={{ user, isLoading }}>
      <div className={styles.container}>
        {/* Mobile Background Overlay */}
        {isMobileOpen && (
          <div className={styles.overlay} onClick={() => setIsMobileOpen(false)} />
        )}

        {/* Collapsible Left Sidebar */}
        <aside className={sidebarClass}>
          <div className={styles.sidebarHeader}>
            {isCollapsed ? (
              <div className={styles.faviconContainer}>
                <Image
                  src="/favicon-v3.png"
                  alt="Premium Hub Favicon"
                  width={32}
                  height={32}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className={styles.logoContainer}>
                <Image
                  src="/premium-hub-logo-v3.png"
                  alt="Premium Hub Logo"
                  width={190}
                  height={56}
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className={styles.navigation}>
            {navItems
              .filter((item) => item.show)
              .map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''} ${
                      isCollapsed ? styles.navLinkCollapsed : ''
                    }`}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Icon className={styles.navLinkIcon} size={18} />
                    <span
                      className={`${styles.navLinkLabel} ${isCollapsed ? styles.navLinkLabelHidden : ''}`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
          </nav>

          {/* Sidebar Footer (Collapse Sidebar Button) */}
          <div className={styles.footerSection}>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`${styles.collapseBtnBottom} ${isCollapsed ? styles.collapseBtnBottomCollapsed : ''}`}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              {!isCollapsed && <span style={{ fontSize: '13.5px', fontWeight: 500 }}>Collapse Sidebar</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={mainWrapperClass}>
          {/* Dashboard Header Bar */}
          <header className={styles.headerBar}>
            <h2 className={styles.pageTitle}>{pageTitle}</h2>
            
            <div className={styles.headerActions}>
              {/* User profile (Desktop/Tablet) */}
              <div className={styles.headerUserProfile}>
                <div className={styles.avatar}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.headerProfileInfo}>
                  <span className={styles.headerProfileName} title={user.name}>{user.name}</span>
                  <span className={styles.headerProfileRole}>{user.role}</span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className={styles.headerLogoutBtn}
                title="Logout"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>

              {/* Mobile Drawer Trigger (Hamburger Menu) */}
              <button
                className={styles.mobileMenuBtn}
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                aria-label="Toggle navigation drawer"
              >
                {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </header>

          {/* Child pages view */}
          <main className={styles.contentView}>{children}</main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
