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
  MessageSquare,
} from 'lucide-react';

interface UserPermissions {
  subscriptions: boolean;
  analytics: boolean;
  settings: boolean;
  orders?: boolean;
  chat?: boolean;
  payments?: boolean;
  overview?: boolean;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'customer';
  permissions?: UserPermissions;
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
  const [waitingCount, setWaitingCount] = useState(0);

  // Poll waiting chat queue for notifications badge (Staff only)
  useEffect(() => {
    if (!user || user.role === 'customer') return;

    const checkWaitingQueue = async () => {
      try {
        const res = await fetch('/api/chat/staff/poll');
        if (res.ok) {
          const data = await res.json();
          const waiting = data.waiting_sessions || [];
          setWaitingCount(waiting.length);
        }
      } catch (err) {
        console.error('Error checking waiting queue count:', err);
      }
    };

    checkWaitingQueue();
    const interval = setInterval(checkWaitingQueue, 5000);
    return () => clearInterval(interval);
  }, [user]);

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
  const isCustomer = user.role === 'customer';

  // Navigation Links mapping based on user permissions
  const navItems = isCustomer
    ? [
        { href: '/dashboard', label: 'My Subscriptions', icon: CreditCard, show: true },
        { href: '/', label: 'Place New Order', icon: ShoppingBag, show: true },
        { href: '/dashboard/profile', label: 'Profile Settings', icon: Settings, show: true },
      ]
    : [
        {
          href: '/dashboard',
          label: 'Overview',
          icon: Home,
          show: user.role === 'admin' || user.permissions?.overview,
        },
        {
          href: '/dashboard/orders',
          label: 'Orders',
          icon: ShoppingBag,
          show: user.role === 'admin' || user.permissions?.orders,
        },
        {
          href: '/dashboard/chat',
          label: 'Support Chat',
          icon: MessageSquare,
          show: user.role === 'admin' || user.permissions?.chat,
        },
        { href: '/dashboard/staff', label: 'Staff Access', icon: Users, show: user.role === 'admin' },
        {
          href: '/dashboard/subscriptions',
          label: 'Subscriptions',
          icon: CreditCard,
          show: user.role === 'admin' || user.permissions?.subscriptions,
        },
        {
          href: '/dashboard/payments',
          label: 'Payments',
          icon: Wallet,
          show: user.role === 'admin' || user.permissions?.payments,
        },
        {
          href: '/dashboard/analytics',
          label: 'Analytics',
          icon: BarChart2,
          show: user.role === 'admin' || user.permissions?.analytics,
        },
        {
          href: '/dashboard/settings',
          label: 'Settings',
          icon: Settings,
          show: user.role === 'admin' || user.permissions?.settings,
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
                  src="/favicon-v4.png"
                  alt="Premium Hub Favicon"
                  width={32}
                  height={32}
                  style={{ objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className={styles.logoContainer}>
                <Image
                  src="/premium-hub-logo-v4.png"
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
                const isChatLink = item.label === 'Support Chat';
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''} ${
                      isCollapsed ? styles.navLinkCollapsed : ''
                    }`}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Icon className={styles.navLinkIcon} size={18} />
                      {isChatLink && waitingCount > 0 && (
                        <span className={styles.pulseDot} />
                      )}
                    </div>
                    <span
                      className={`${styles.navLinkLabel} ${isCollapsed ? styles.navLinkLabelHidden : ''}`}
                      style={isCollapsed ? { display: 'none' } : { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                    >
                      <span>{item.label}</span>
                      {isChatLink && waitingCount > 0 && !isCollapsed && (
                        <span className={styles.waitingBadge}>{waitingCount}</span>
                      )}
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
          <header className={`${styles.headerBar} ${isCollapsed ? styles.headerBarCollapsed : ''}`}>
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
          <main className={`${styles.contentView} ${pathname === '/dashboard/chat' ? styles.contentViewChat : ''}`}>
            {children}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
