'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ShoppingBag, 
  Check, 
  Globe, 
  X, 
  Loader2, 
  ArrowRight, 
  AlertCircle,
  Layout
} from 'lucide-react';
import styles from './landing.module.css';

interface SubscriptionCountryOverride {
  id: number;
  country_code: string;
  price: number | null;
  shared_price: number | null;
  private_price: number | null;
  currency: string;
  description: string;
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
  default_currency: string;
  default_description: string;
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

    const applyLocation = (code: string, name: string) => {
      setCountryCode(code);
      setCountryName(name);
      setIsLocating(false);

      const savedLangPref = localStorage.getItem('user_lang_pref');
      if (savedLangPref) {
        const hasLangCookie = document.cookie.includes('googtrans=');
        if (!hasLangCookie || !document.cookie.includes(`googtrans=/en/${savedLangPref}`)) {
          document.cookie = `googtrans=/en/${savedLangPref}; path=/`;
          document.cookie = `googtrans=/en/${savedLangPref}; path=/; domain=${window.location.hostname}`;
          window.location.reload();
        }
      } else {
        const defaultLang = countryToLangMap[code] || 'en';
        localStorage.setItem('user_lang_pref', defaultLang);
        if (defaultLang !== 'en') {
          document.cookie = `googtrans=/en/${defaultLang}; path=/`;
          document.cookie = `googtrans=/en/${defaultLang}; path=/; domain=${window.location.hostname}`;
          window.location.reload();
        }
      }
    };

    fetchGeoLocation();
  }, []);

  // 2. Fetch language from cookies
  useEffect(() => {
    const getActiveLang = () => {
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
    document.cookie = `googtrans=/en/${langCode}; path=/`;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;
    window.location.reload();
  };

  // Filter subscriptions based on country code and search query
  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const override = sub.countries.find((c) => c.country_code === countryCode);
    if (override) {
      return override.is_visible; 
    }
    return sub.is_global; 
  });

  const getSubDisplayPrice = (sub: Subscription) => {
    const override = sub.countries.find((c) => c.country_code === countryCode);
    
    const sharedPrice = override 
      ? (override.shared_price !== null && override.shared_price !== undefined ? Number(override.shared_price) : null)
      : (sub.default_shared_price !== null && sub.default_shared_price !== undefined ? Number(sub.default_shared_price) : null);
      
    const privatePrice = override 
      ? (override.private_price !== null && override.private_price !== undefined ? Number(override.private_price) : null)
      : (sub.default_private_price !== null && sub.default_private_price !== undefined ? Number(sub.default_private_price) : null);
      
    const legacyPrice = override 
      ? (override.price !== null && override.price !== undefined ? Number(override.price) : null)
      : (sub.default_price !== null && sub.default_price !== undefined ? Number(sub.default_price) : null);

    const currency = override?.currency || sub.default_currency;
    const description = override?.description || sub.default_description;

    let finalPrice = legacyPrice || 0;
    let prefix = '';
    let label = '';
    let pricingType: 'shared' | 'private' | 'both' = 'shared';

    if (sharedPrice !== null && privatePrice !== null) {
      finalPrice = Math.min(sharedPrice, privatePrice);
      prefix = 'From ';
      label = '';
      pricingType = 'both';
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

        <div className={styles.navActions}>
          {/* Static region display */}
          {isLocating ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: '#64748b', 
              fontSize: '13.5px', 
              background: 'rgba(255,255,255,0.02)', 
              padding: '8px 16px', 
              borderRadius: '10px', 
              border: '1px solid rgba(255,255,255,0.06)' 
            }}>
              <Loader2 className={styles.spinner} size={14} />
              <span>Locating region...</span>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: '#94a3b8', 
              fontSize: '13.5px', 
              background: 'rgba(255,255,255,0.02)', 
              padding: '8px 16px', 
              borderRadius: '10px', 
              border: '1px solid rgba(255,255,255,0.06)' 
            }}>
              <Globe size={16} style={{ color: '#c084fc' }} />
              <span>Region: {countryName} ({countryCode})</span>
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
      </header>

      {/* Hero Video Banner */}
      <section className={styles.hero}>
        <video
          className={styles.heroVideo}
          src="/hero-video.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className={styles.heroOverlay} />

        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Premium Subscriptions Hub</h1>
          <p className={styles.heroSubtitle}>
            Unlock premium pricing for Netflix, Spotify, YouTube and more. Check out our services auto-localized for your IP address.
          </p>

          <div className={styles.searchWrapper}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search premium service (e.g. Netflix, Spotify)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className={styles.searchIcon} size={20} />
          </div>
        </div>
      </section>

      {/* Subscriptions section */}
      <main className={styles.mainContent}>

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
    </div>
  );
}
export const dynamic = 'force-dynamic';
