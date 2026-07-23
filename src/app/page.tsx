'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import HeroSection from '@/components/HeroSection';
import { 
  Search, 
  ShoppingBag, 
  Check, 
  Globe, 
  X, 
  Loader2, 
  ArrowRight, 
  AlertCircle,
  Layout,
  ChevronDown,
  Star,
  Send,
  Menu
} from 'lucide-react';
import { fuzzySearchFilter } from '@/lib/fuzzySearch';
import styles from './landing.module.css';

interface SubscriptionCountryOverride {
  id: number;
  country_code: string;
  price: number | null;
  shared_price: number | null;
  private_price: number | null;
  full_account_price: number | null;
  currency: string;
  description: string;
  shared_description?: string | null;
  private_description?: string | null;
  full_account_description?: string | null;
  is_visible: boolean;
}

interface Subscription {
  id: number;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  is_global: boolean;
  default_price: number | null;
  default_shared_price: number | null;
  default_private_price: number | null;
  default_full_account_price: number | null;
  default_currency: string;
  default_description: string;
  default_shared_description?: string | null;
  default_private_description?: string | null;
  default_full_account_description?: string | null;
  countries: SubscriptionCountryOverride[];
}

interface OrderDetails {
  tracking_id: string;
  customer_name: string;
  subscription_name: string;
  price: number;
  currency: string;
  status: string;
  created_at: string;
}

const countryToLangMap: Record<string, string> = {
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', CL: 'es', VE: 'es', EC: 'es', GT: 'es',
  DE: 'de', AT: 'de', CH: 'de', LU: 'de',
  FR: 'fr', BE: 'fr', CA: 'fr', MC: 'fr',
  IT: 'it',
  PT: 'pt', BR: 'pt',
  SA: 'ar', AE: 'ar', EG: 'ar', JO: 'ar', KW: 'ar', QA: 'ar', OM: 'ar', BH: 'ar', DZ: 'ar', MA: 'ar', TN: 'ar',
  CN: 'zh-CN', HK: 'zh-CN', TW: 'zh-CN',
  IN: 'hi', BD: 'bn',
  TR: 'tr', PK: 'ur',
};

const LANGUAGES = [
  { code: 'en', name: 'English (EN)' },
  { code: 'es', name: 'Español (ES)' },
  { code: 'de', name: 'Deutsch (DE)' },
  { code: 'fr', name: 'Français (FR)' },
  { code: 'it', name: 'Italiano (IT)' },
  { code: 'pt', name: 'Português (PT)' },
  { code: 'ar', name: 'العربية (AR)' },
  { code: 'ur', name: 'اردو (UR)' },
  { code: 'zh-CN', name: '简体中文 (ZH)' },
  { code: 'hi', name: 'हिन्दी (HI)' },
  { code: 'tr', name: 'Türkçe (TR)' },
  { code: 'bn', name: 'বাংলা (BN)' },
];

export default function LandingPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  // Check auth session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error('Failed to load active session:', err);
      }
    }
    checkAuth();
  }, []);

  // Location & Geolocation state
  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [isLocating, setIsLocating] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Subscriptions database
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Active language state
  const [activeLang, setActiveLang] = useState('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);



  // 1. Fetch Geolocation on mount
  useEffect(() => {
    const fetchGeoLocation = async () => {
      // Endpoint 1: ipwho.is
      try {
        const res = await fetch('https://ipwho.is/');
        const data = await res.json();
        if (data && data.success && data.country_code) {
          applyLocation(data.country_code, data.country);
          return;
        }
      } catch {
        console.warn('ipwho.is failed, trying freeipapi.com...');
      }

      // Endpoint 2: freeipapi.com
      try {
        const res = await fetch('https://freeipapi.com/api/json');
        const data = await res.json();
        if (data && data.countryCode) {
          applyLocation(data.countryCode, data.countryName);
          return;
        }
      } catch {
        console.warn('freeipapi.com failed, trying ipapi.co...');
      }

      // Endpoint 3: ipapi.co
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && data.country_code) {
          applyLocation(data.country_code, data.country_name || data.country);
          return;
        }
      } catch {
        console.warn('ipapi.co failed, using fallback.');
      }

      // Fallback default
      applyLocation('US', 'United States');
    };

    const setLanguageCookie = (lang: string) => {
      if (lang === 'en') {
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        if (window.location.hostname.includes('.')) {
          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname.replace(/^www\./, '')};`;
        }
      } else {
        const val = `/en/${lang}`;
        document.cookie = `googtrans=${val}; path=/;`;
        if (window.location.hostname.includes('.')) {
          document.cookie = `googtrans=${val}; path=/; domain=.${window.location.hostname.replace(/^www\./, '')};`;
        }
      }
    };

    const applyLocation = (code: string, name: string) => {
      setCountryCode(code);
      setCountryName(name);
      setIsLocating(false);

      const savedLangPref = localStorage.getItem('user_lang_pref');
      if (savedLangPref) {
        if (savedLangPref === 'en') {
          if (document.cookie.includes('googtrans=')) {
            setLanguageCookie('en');
            window.location.reload();
          }
        } else {
          if (!document.cookie.includes(`googtrans=/en/${savedLangPref}`)) {
            setLanguageCookie(savedLangPref);
            window.location.reload();
          }
        }
      } else {
        const defaultLang = countryToLangMap[code] || 'en';
        localStorage.setItem('user_lang_pref', defaultLang);
        if (defaultLang !== 'en') {
          setLanguageCookie(defaultLang);
          window.location.reload();
        }
      }
    };

    fetchGeoLocation();
  }, []);

  // 2. Fetch language from cookies or localStorage
  useEffect(() => {
    const getActiveLang = () => {
      const saved = localStorage.getItem('user_lang_pref');
      if (saved) {
        setActiveLang(saved);
        return;
      }
      const match = document.cookie.match(/googtrans=\/en\/([^;]+)/);
      if (match) {
        setActiveLang(match[1]);
      } else {
        setActiveLang('en');
      }
    };
    getActiveLang();
  }, []);

  // 3. Load Google Translate script dynamically
  useEffect(() => {
    const addGoogleTranslateScript = () => {
      if (document.getElementById('google-translate-script')) return;
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=cbGoogleTranslateInit';
      script.async = true;
      document.body.appendChild(script);

      (window as unknown as { cbGoogleTranslateInit: () => void }).cbGoogleTranslateInit = () => {
        new (window as unknown as { google: { translate: { TranslateElement: new (options: unknown, elementId: string) => void } } }).google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            autoDisplay: false,
          },
          'google_translate_element'
        );
      };
    };
    addGoogleTranslateScript();
  }, []);

  // 4. Fetch subscriptions list
  useEffect(() => {
    async function loadClientData() {
      try {
        const subRes = await fetch('/api/subscriptions/client');
        const subData = await subRes.json();
        if (subData.success) {
          setSubscriptions(subData.subscriptions);
        }
      } catch (err) {
        console.error('Error loading landing page subscriptions:', err);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadClientData();
  }, []);

  const handleLangChange = (langCode: string) => {
    localStorage.setItem('user_lang_pref', langCode);
    if (langCode === 'en') {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      if (window.location.hostname.includes('.')) {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname.replace(/^www\./, '')};`;
      }
    } else {
      const val = `/en/${langCode}`;
      document.cookie = `googtrans=${val}; path=/;`;
      if (window.location.hostname.includes('.')) {
        document.cookie = `googtrans=${val}; path=/; domain=.${window.location.hostname.replace(/^www\./, '')};`;
      }
    }
    window.location.reload();
  };

  // Filter subscriptions based on country code and fuzzy search query
  const countryVisibleSubscriptions = subscriptions.filter((sub) => {
    const override = sub.countries.find((c) => c.country_code === countryCode);
    if (override) {
      return override.is_visible; 
    }
    return sub.is_global; 
  });

  const filteredSubscriptions = fuzzySearchFilter(
    countryVisibleSubscriptions,
    searchQuery,
    (sub) => sub.name
  );

  const getSubDisplayPrice = (sub: Subscription) => {
    const override = sub.countries.find((c) => c.country_code === countryCode);
    
    const sharedPrice = override 
      ? (override.shared_price !== null && override.shared_price !== undefined ? Number(override.shared_price) : null)
      : (sub.default_shared_price !== null && sub.default_shared_price !== undefined ? Number(sub.default_shared_price) : null);
      
    const privatePrice = override 
      ? (override.private_price !== null && override.private_price !== undefined ? Number(override.private_price) : null)
      : (sub.default_private_price !== null && sub.default_private_price !== undefined ? Number(sub.default_private_price) : null);

    const fullAccountPrice = override 
      ? (override.full_account_price !== null && override.full_account_price !== undefined ? Number(override.full_account_price) : null)
      : (sub.default_full_account_price !== null && sub.default_full_account_price !== undefined ? Number(sub.default_full_account_price) : null);
      
    const legacyPrice = override 
      ? (override.price !== null && override.price !== undefined ? Number(override.price) : null)
      : (sub.default_price !== null && sub.default_price !== undefined ? Number(sub.default_price) : null);

    const currency = override?.currency || sub.default_currency;
    const description = override?.description || sub.default_description;

    const availablePrices = [sharedPrice, privatePrice, fullAccountPrice].filter((p): p is number => p !== null);

    let finalPrice = legacyPrice || 0;
    let prefix = '';
    let label = '';
    let pricingType: 'shared' | 'private' | 'full_account' | 'multiple' = 'shared';

    if (availablePrices.length > 1) {
      finalPrice = Math.min(...availablePrices);
      prefix = 'From ';
      label = '';
      pricingType = 'multiple';
    } else if (sharedPrice !== null) {
      finalPrice = sharedPrice;
      prefix = '';
      label = 'Shared';
      pricingType = 'shared';
    } else if (privatePrice !== null) {
      finalPrice = privatePrice;
      prefix = '';
      label = 'Private';
      pricingType = 'private';
    } else if (fullAccountPrice !== null) {
      finalPrice = fullAccountPrice;
      prefix = '';
      label = 'Full Account';
      pricingType = 'full_account';
    } else if (legacyPrice !== null) {
      finalPrice = legacyPrice;
      prefix = '';
      label = 'Shared'; // fallback to shared for legacy
      pricingType = 'shared';
    }

    return {
      price: finalPrice,
      currency,
      description,
      prefix,
      label,
      pricingType,
    };
  };



  const getStatusStepIndex = (status: string) => {
    if (status === 'completed') return 3;
    if (status === 'paid') return 2;
    return 1;
  };

  return (
    <div className={styles.container}>
      {/* Hidden Translate Element Init */}
      <div id="google_translate_element" style={{ display: 'none' }} />

      {/* Navbar */}
      <header className={styles.header}>
        <div className={styles.logoWrapper} onClick={() => window.location.reload()}>
          <Image
            src="/premium-hub-logo-v4.png"
            alt="Premium Hub Logo"
            width={180}
            height={50}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        {/* Desktop Actions */}
        <div className={styles.navActionsDesktop}>
          {/* Static region display */}
          {isLocating ? (
            <div className={styles.regionBadge}>
              <Loader2 className={styles.spinner} size={14} />
              <span className={styles.regionText}>Locating region...</span>
            </div>
          ) : (
            <div className={styles.regionBadge}>
              <Globe size={16} style={{ color: '#c084fc' }} />
              <span className={styles.regionText}>Region: {countryName} ({countryCode})</span>
              <span className={styles.regionCodeMobile}>{countryCode}</span>
            </div>
          )}

          {/* Language selector */}
          <div className={styles.languageDropdownWrapper}>
            <select
              className={styles.languageSelect}
              value={activeLang}
              onChange={(e) => handleLangChange(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dashboard / Account Button if logged in */}
          {user ? (
            <button
              type="button"
              className={styles.dashboardLinkBtn}
              onClick={() => router.push('/dashboard')}
            >
              <Layout size={16} />
              <span>Go to Dashboard</span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.trackBtn}
              onClick={() => router.push('/login')}
            >
              <span>Sign In</span>
            </button>
          )}
        </div>

        {/* Mobile Hamburger Trigger */}
        <button
          type="button"
          className={styles.mobileHamburgerBtn}
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open mobile menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawerOverlay} onClick={() => setMobileMenuOpen(false)}>
          <div className={styles.mobileDrawerContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.mobileDrawerHeader}>
              <Image
                src="/premium-hub-logo-v4.png"
                alt="Premium Hub Logo"
                width={140}
                height={40}
                style={{ objectFit: 'contain' }}
              />
              <button
                type="button"
                className={styles.mobileDrawerCloseBtn}
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close mobile menu"
              >
                <X size={24} />
              </button>
            </div>

            <div className={styles.mobileDrawerBody}>
              {/* Region Display */}
              <div className={styles.mobileDrawerSection}>
                <span className={styles.mobileDrawerLabel}>Selected Region</span>
                {isLocating ? (
                  <div className={styles.regionBadge}>
                    <Loader2 className={styles.spinner} size={14} />
                    <span>Locating region...</span>
                  </div>
                ) : (
                  <div className={styles.regionBadge} style={{ width: '100%', justifyContent: 'center' }}>
                    <Globe size={16} style={{ color: '#c084fc' }} />
                    <span>{countryName} ({countryCode})</span>
                  </div>
                )}
              </div>

              {/* Language Selector */}
              <div className={styles.mobileDrawerSection}>
                <span className={styles.mobileDrawerLabel}>Select Language</span>
                <div className={styles.languageDropdownWrapper} style={{ width: '100%' }}>
                  <select
                    className={styles.languageSelect}
                    value={activeLang}
                    onChange={(e) => handleLangChange(e.target.value)}
                    style={{ width: '100%', textAlign: 'center' }}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Support Links */}
              <div className={styles.mobileDrawerSection}>
                <span className={styles.mobileDrawerLabel}>Support Pages</span>
                <div className={styles.mobileDrawerNav}>
                  <Link href="/support/help-center" className={styles.mobileDrawerLink} onClick={() => setMobileMenuOpen(false)}>
                    Help Center
                  </Link>
                  <Link href="/support/how-it-works" className={styles.mobileDrawerLink} onClick={() => setMobileMenuOpen(false)}>
                    How It Works
                  </Link>
                  <Link href="/support/payment-methods" className={styles.mobileDrawerLink} onClick={() => setMobileMenuOpen(false)}>
                    Payment Methods
                  </Link>
                  <Link href="/support/refund-policy" className={styles.mobileDrawerLink} onClick={() => setMobileMenuOpen(false)}>
                    Refund Policy
                  </Link>
                  <Link href="/support/terms-of-service" className={styles.mobileDrawerLink} onClick={() => setMobileMenuOpen(false)}>
                    Terms of Service
                  </Link>
                </div>
              </div>

              {/* Dashboard / Login Button */}
              <div className={styles.mobileDrawerFooter}>
                {user ? (
                  <button
                    type="button"
                    className={styles.dashboardLinkBtn}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      router.push('/dashboard');
                    }}
                    style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                  >
                    <Layout size={16} />
                    <span>Go to Dashboard</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.trackBtn}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      router.push('/login');
                    }}
                    style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                  >
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <HeroSection
        onBrowsePlans={() => {
          const el = document.getElementById('subscriptions');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Search Bar Section */}
      <section style={{
        background: '#060918',
        padding: '0 40px 40px',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div className={styles.searchWrapper} style={{ maxWidth: '600px', width: '100%' }}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search premium service (e.g. Netflix, Spotify)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className={styles.searchIcon} size={20} />
        </div>
      </section>

      {/* Subscriptions section */}
      <main className={styles.mainContent} id="subscriptions">

        {isLocating || isLoadingData ? (
          <div className={styles.grid}>
            {[1, 2, 3].map((n) => (
              <div key={n} className={styles.card} style={{ minHeight: '340px', opacity: 0.8, pointerEvents: 'none', animation: 'skeletonPulse 1.5s ease-in-out infinite' }}>
                <div className={styles.coverImageWrapper}>
                  <div className={styles.coverPlaceholder} style={{ background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)' }} />
                  <div className={styles.logoOverlayWrapper} style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
                    <Loader2 className={styles.spinner} size={16} color="#8b5cf6" />
                  </div>
                </div>
                <div className={styles.cardBody} style={{ gap: '12px' }}>
                  <div style={{ height: '18px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', width: '60%' }} />
                  <div style={{ height: '24px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', width: '40%' }} />
                  <div style={{ height: '14px', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', width: '100%', marginTop: '8px' }} />
                  <div style={{ height: '14px', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', width: '80%' }} />
                  <div style={{ height: '40px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', width: '100%', marginTop: 'auto' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateTitle}>No Services Available</p>
            <p className={styles.emptyStateText}>
              There are no matching subscriptions available for your country ({countryName}) at this time.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredSubscriptions.map((sub) => {
              const display = getSubDisplayPrice(sub);
              return (
                <div key={sub.id} className={styles.card}>
                  <div className={styles.coverImageWrapper}>
                    {sub.cover_url ? (
                      <Image
                        src={sub.cover_url}
                        alt={`${sub.name} Cover`}
                        fill
                        sizes="(max-width: 768px) 100vw, 350px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className={styles.coverPlaceholder} />
                    )}
                    
                    <div className={styles.logoOverlayWrapper}>
                      {sub.logo_url ? (
                        <Image
                          src={sub.logo_url}
                          alt={`${sub.name} Logo`}
                          fill
                          sizes="56px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <ShoppingBag size={20} color="#a78bfa" />
                      )}
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <div>
                      <h3 className={styles.cardTitle}>{sub.name}</h3>
                      <div className={styles.cardPriceContainer} style={{ flexWrap: 'wrap', gap: '4px' }}>
                        {display.prefix && (
                          <span style={{ fontSize: '13.5px', color: '#94a3b8', marginRight: '2px', alignSelf: 'center' }}>
                            {display.prefix}
                          </span>
                        )}
                        <span className={styles.cardPrice}>
                          {display.price.toFixed(2)}
                        </span>
                        <span className={styles.cardCurrency}>
                          {display.currency}
                        </span>
                        <span className={styles.cardPeriod}>/ month</span>
                        {display.label && (
                          <span style={{ 
                            marginLeft: '8px', 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            color: '#7c3aed', 
                            background: '#f5f3ff', 
                            border: '1px solid #ddd6fe',
                            padding: '2px 8px', 
                            borderRadius: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            alignSelf: 'center'
                          }}>
                            {display.label}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className={styles.cardDescription}>{display.description}</p>

                    <button
                      type="button"
                      className={styles.buyBtn}
                      onClick={() => router.push(`/checkout?id=${sub.id}`)}
                    >
                      <span>Order Now</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Testimonials Section */}
      <section className={styles.testimonialsSection}>
        <div className={styles.testimonialsInner}>
          <div className={styles.testimonialsHeader}>
            <div>
              <h2 className={styles.testimonialsTitle}>What Our Customers Say</h2>
              <p className={styles.testimonialsSubtitle}>Trusted by thousands of customers worldwide.</p>
            </div>
            <a href="#subscriptions" className={styles.viewAllLink}>
              <span>View All Reviews</span>
              <ArrowRight size={16} />
            </a>
          </div>

          <div className={styles.carouselViewport}>
            <div className={styles.carouselTrackMarquee}>
              {[
                { text: "Got Netflix instantly! Amazing service and super fast support.", name: "Ahmed R.", location: "Pakistan", avatar: "/avatars/1.jpg" },
                { text: "Saved over $150 this year. Best subscription deals!", name: "Sarah K.", location: "UK", avatar: "/avatars/2.jpg" },
                { text: "Excellent support and genuine accounts.", name: "John D.", location: "USA", avatar: "/avatars/3.jpg" },
                { text: "Highly recommended for everyone!", name: "Muhammad A.", location: "Pakistan", avatar: "/avatars/4.jpg" },
                { text: "Midjourney Pro works perfectly. Delivered in 5 minutes!", name: "Elena M.", location: "Spain", avatar: "/avatars/5.jpg" },
                { text: "Cheapest pricing online, absolute lifesaver for student budget.", name: "David K.", location: "Canada", avatar: "/avatars/6.jpg" },
                { text: "Renewed my Prime Video account without losing history. Highly satisfied.", name: "Priya S.", location: "India", avatar: "/avatars/7.jpg" },
                { text: "Premium Hub is my go-to for all my streaming needs.", name: "Liam O.", location: "Ireland", avatar: "/avatars/8.jpg" }
              ].concat([
                { text: "Got Netflix instantly! Amazing service and super fast support.", name: "Ahmed R.", location: "Pakistan", avatar: "/avatars/1.jpg" },
                { text: "Saved over $150 this year. Best subscription deals!", name: "Sarah K.", location: "UK", avatar: "/avatars/2.jpg" },
                { text: "Excellent support and genuine accounts.", name: "John D.", location: "USA", avatar: "/avatars/3.jpg" },
                { text: "Highly recommended for everyone!", name: "Muhammad A.", location: "Pakistan", avatar: "/avatars/4.jpg" },
                { text: "Midjourney Pro works perfectly. Delivered in 5 minutes!", name: "Elena M.", location: "Spain", avatar: "/avatars/5.jpg" },
                { text: "Cheapest pricing online, absolute lifesaver for student budget.", name: "David K.", location: "Canada", avatar: "/avatars/6.jpg" },
                { text: "Renewed my Prime Video account without losing history. Highly satisfied.", name: "Priya S.", location: "India", avatar: "/avatars/7.jpg" },
                { text: "Premium Hub is my go-to for all my streaming needs.", name: "Liam O.", location: "Ireland", avatar: "/avatars/8.jpg" }
              ]).map((t, idx) => (
                <div key={idx} className={styles.testimonialCardMarquee}>
                  <div>
                    <div className={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={14} fill="#fbbf24" className={styles.starIcon} />
                      ))}
                    </div>
                    <p className={styles.testimonialText}>&ldquo;{t.text}&rdquo;</p>
                  </div>
                  <div className={styles.authorWrapper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.avatar} alt={t.name} className={styles.authorAvatar} />
                    <div>
                      <h4 className={styles.authorName}>{t.name}</h4>
                      <span className={styles.authorCountry}>{t.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Save Section */}
      <section className={styles.ctaSaveSection}>
        <div className={styles.ctaSaveInner}>
          <div className={styles.ctaLeftContainer}>
            <div className={styles.giftIllustration}>
              <div className={styles.giftBox}>
                <div className={styles.giftLid} />
                <div className={styles.giftRibbonVertical} />
                <div className={styles.giftRibbonHorizontal} />
                <div className={styles.giftBow} />
              </div>
            </div>
            <div className={styles.ctaTextContent}>
              <h3 className={styles.ctaSaveTitle}>Ready to Save on Premium?</h3>
              <p className={styles.ctaSaveSubtitle}>Join over 25,000+ happy customers and get the best subscriptions at unbeatable prices.</p>
            </div>
          </div>
          <button 
            type="button" 
            className={styles.ctaBtnPrimary}
            onClick={() => {
              const el = document.getElementById('subscriptions');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span>Browse All Plans</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerMain}>
            <div className={styles.footerCol}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <Image
                  src="/premium-hub-logo-v4.png"
                  alt="Premium Hub Logo"
                  width={150}
                  height={42}
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <p className={styles.footerAboutText}>Your one-stop destination for all premium subscriptions. Affordable, reliable and instant.</p>
              <div className={styles.socialRow}>
                <a href="#" className={styles.socialIconBtn}>
                  <svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
                </a>
                <a href="#" className={styles.socialIconBtn}>
                  <svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                </a>
                <a href="#" className={styles.socialIconBtn}>
                  <svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className={styles.socialIconBtn}>
                  <svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2761-3.68-.2761-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.975 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1758 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>
                </a>
              </div>
            </div>

            <div className={styles.footerCol}>
              <h4 className={styles.footerColHeading}>Support</h4>
              <div className={styles.footerLinkList}>
                <Link href="/support/help-center" className={styles.footerLink}>Help Center</Link>
                <Link href="/support/how-it-works" className={styles.footerLink}>How It Works</Link>
                <Link href="/support/payment-methods" className={styles.footerLink}>Payment Methods</Link>
                <Link href="/support/refund-policy" className={styles.footerLink}>Refund Policy</Link>
                <Link href="/support/terms-of-service" className={styles.footerLink}>Terms of Service</Link>
              </div>
            </div>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColHeading}>Categories</h4>
              <div className={styles.footerLinkList}>
                <a href="#subscriptions" className={styles.footerLink}>Entertainment</a>
                <a href="#subscriptions" className={styles.footerLink}>Music</a>
                <a href="#subscriptions" className={styles.footerLink}>AI Tools</a>
                <a href="#subscriptions" className={styles.footerLink}>Streaming</a>
                <a href="#subscriptions" className={styles.footerLink}>View All</a>
              </div>
            </div>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColHeading}>Newsletter</h4>
              <p className={styles.newsletterText}>Subscribe for the latest deals and updates.</p>
              <form className={styles.newsletterForm} onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="Enter your email" className={styles.newsletterInput} required />
                <button type="submit" className={styles.newsletterBtn}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <span className={styles.copyright}>© 2026 Premium Hub. All rights reserved.</span>
            <div className={styles.bottomLinksRow}>
              <Link href="/support/refund-policy" className={styles.bottomLink}>Privacy Policy</Link>
              <Link href="/support/terms-of-service" className={styles.bottomLink}>Terms of Service</Link>
              <Link href="/support/refund-policy" className={styles.bottomLink}>Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
export const dynamic = 'force-dynamic';
