'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Globe, 
  FileText, 
  Copy, 
  Loader2, 
  ArrowLeft, 
  Check, 
  AlertCircle,
  ShoppingBag
} from 'lucide-react';
import styles from './checkout.module.css';
import { uploadReceipt } from '../../lib/firebase';

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

interface PaymentMethodCountry {
  id: number;
  payment_method_id: number;
  country_code: string;
}

interface PaymentMethod {
  id: number;
  name: string;
  type: string;
  instructions: string;
  fields: string; // JSON Array of { label: string, value: string }
  is_global: boolean;
  is_active: boolean;
  countries: PaymentMethodCountry[];
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

function CheckoutForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const subId = searchParams.get('id');

  // Country code state
  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [isLocating, setIsLocating] = useState(true);

  // Subscriptions & Payment state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Selected language state
  const [activeLang, setActiveLang] = useState('en');

  // Checkout inputs
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutWhatsapp, setCheckoutWhatsapp] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');

  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placedTrackingId, setPlacedTrackingId] = useState<string | null>(null);
  const [copiedTrackingId, setCopiedTrackingId] = useState(false);

  // Selected pricing type & duration
  const [selectedType, setSelectedType] = useState<'shared' | 'private'>('shared');
  const [selectedDuration, setSelectedDuration] = useState<number>(1); // 1, 3, 6, 12

  // 1. Geolocation lookup
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
      } catch (e) {
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
      } catch (e) {
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
      } catch (e) {
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

  // 2. Fetch language cookie
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

  // 3. Load Google Translate script
  useEffect(() => {
    const addGoogleTranslateScript = () => {
      if (document.getElementById('google-translate-script')) return;
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);

      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          'google_translate_element'
        );
      };
    };
    addGoogleTranslateScript();
  }, []);

  // 4. Fetch subscriptions and payment methods
  useEffect(() => {
    async function loadClientData() {
      try {
        const [subRes, payRes] = await Promise.all([
          fetch('/api/subscriptions/client'),
          fetch('/api/payments/client'),
        ]);

        const subData = await subRes.json();
        const payData = await payRes.json();

        if (subData.success) {
          setSubscriptions(subData.subscriptions);
        }
        if (payData.success) {
          setPaymentMethods(payData.paymentMethods);
        }
      } catch (err) {
        console.error('Error loading landing page services:', err);
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

  const activeSub = subscriptions.find((sub) => String(sub.id) === subId);



  const getSubPricingOptions = (sub: Subscription) => {
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

    const hasShared = sharedPrice !== null;
    const hasPrivate = privatePrice !== null;

    if (!hasShared && !hasPrivate && legacyPrice !== null) {
      return {
        sharedPrice: legacyPrice,
        privatePrice: 0,
        hasShared: true,
        hasPrivate: false,
        currency,
        description
      };
    }

    return {
      sharedPrice: sharedPrice !== null ? sharedPrice : (legacyPrice || 0),
      privatePrice: privatePrice !== null ? privatePrice : 0,
      hasShared,
      hasPrivate,
      currency,
      description
    };
  };

  const pricingOptions = activeSub ? getSubPricingOptions(activeSub) : null;

  const activeType = pricingOptions 
    ? (pricingOptions.hasShared && selectedType === 'shared' ? 'shared' : (pricingOptions.hasPrivate ? 'private' : 'shared'))
    : 'shared';

  const getSelectedMonthlyPrice = () => {
    if (!pricingOptions) return 0;
    if (activeType === 'shared') {
      return pricingOptions.sharedPrice;
    } else {
      return pricingOptions.privatePrice;
    }
  };

  const calculatePricing = (monthlyPrice: number, duration: number) => {
    const rawTotal = monthlyPrice * duration;
    let discountMonths = 0;
    
    if (duration === 3) {
      discountMonths = 0.5; // 15 days discount
    } else if (duration === 6) {
      discountMonths = 1; // 1 month discount
    } else if (duration === 12) {
      discountMonths = 2; // 2 months discount
    }

    const discountAmount = monthlyPrice * discountMonths;
    const totalAmount = rawTotal - discountAmount;

    return {
      monthlyPrice,
      duration,
      rawTotal,
      discountAmount,
      totalAmount
    };
  };

  // Filter payment methods based on country code
  const filteredPaymentMethods = paymentMethods.filter((method) => {
    if (method.is_global) return true;
    return method.countries.some((c) => c.country_code === countryCode);
  });

  const activePaymentMethod = paymentMethods.find((m) => String(m.id) === paymentMethodId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setReceiptFile(file);
    setIsUploadingFile(true);
    setOrderError(null);

    try {
      const downloadUrl = await uploadReceipt(file);
      setReceiptUrl(downloadUrl);
    } catch (err) {
      console.error('Firebase upload error:', err);
      setOrderError('Failed to upload receipt image. Please try again.');
      setReceiptFile(null);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutName || !checkoutEmail || !checkoutWhatsapp || !receiptUrl || !activeSub || !pricingOptions) {
      setOrderError('Please complete all form fields and upload the payment receipt.');
      return;
    }

    const monthlyPrice = getSelectedMonthlyPrice();
    const billing = calculatePricing(monthlyPrice, selectedDuration);
    const billingTypeLabel = activeType === 'shared' ? 'Shared' : 'Private';
    const durationLabel = selectedDuration === 12 ? '1 Year' : `${selectedDuration} Month${selectedDuration > 1 ? 's' : ''}`;

    setIsSubmittingOrder(true);
    setOrderError(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: checkoutName,
          customer_email: checkoutEmail,
          whatsapp_number: checkoutWhatsapp,
          screenshot_url: receiptUrl,
          subscription_name: `${activeSub.name} - ${billingTypeLabel} (${durationLabel})`,
          price: billing.totalAmount,
          currency: pricingOptions.currency,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit order.');
      }

      setPlacedTrackingId(data.tracking_id);
    } catch (err: any) {
      setOrderError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrackingId(true);
    setTimeout(() => setCopiedTrackingId(false), 2000);
  };

  // Render Skeletons / loaders
  if (isLocating || isLoadingData) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.logoWrapper} onClick={() => router.push('/')}>
            <Image src="/premium-hub-logo-v3.png" alt="Premium Hub Logo" width={180} height={50} style={{ objectFit: 'contain' }} priority />
          </div>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '16px' }}>
          <Loader2 className={styles.spinner} size={36} color="#8b5cf6" />
          <p style={{ color: '#94a3b8', fontSize: '14.5px' }}>Loading checkout portal...</p>
        </div>
      </div>
    );
  }

  if (!activeSub) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.logoWrapper} onClick={() => router.push('/')}>
            <Image src="/premium-hub-logo-v3.png" alt="Premium Hub Logo" width={180} height={50} style={{ objectFit: 'contain' }} priority />
          </div>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '16px' }}>
          <AlertCircle size={40} color="#f87171" />
          <p style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 600 }}>Subscription package not found.</p>
          <Link href="/" className={styles.backBtn} style={{ margin: 0 }}>
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }



  return (
    <div className={styles.container}>
      <div id="google_translate_element" style={{ display: 'none' }} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoWrapper} onClick={() => router.push('/')}>
          <Image
            src="/premium-hub-logo-v3.png"
            alt="Premium Hub Logo"
            width={180}
            height={50}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        <div className={styles.navActions}>
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
        </div>
      </header>

      {/* Layout Main */}
      <main className={styles.main}>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        {placedTrackingId ? (
          /* Confirmation card (Success) */
          <div className={`${styles.glassPanel} ${styles.confirmationContainer}`}>
            <div className={styles.successIcon}>
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Order Submitted Successfully!</h2>
            <p className={styles.confirmationInfo}>
              Your subscription request has been received. Please copy the Order Tracking ID below. You can paste it into the homepage tracking tool to verify when credentials are delivered.
            </p>

            <div 
              className={styles.trackCodeBox}
              onClick={() => copyToClipboard(placedTrackingId)}
            >
              <span>{placedTrackingId}</span>
              <Copy size={20} />
              {copiedTrackingId && (
                <span style={{
                  position: 'absolute',
                  bottom: '-28px',
                  fontSize: '11px',
                  color: '#10b981',
                  fontWeight: 600
                }}>
                  Copied!
                </span>
              )}
            </div>

            <Link href="/" className={styles.submitBtn} style={{ width: 'auto', padding: '0 32px', marginTop: '24px', textDecoration: 'none' }}>
              Return to Homepage
            </Link>
          </div>
        ) : (
          /* Checkout Split Grid Layout */
          <div className={styles.grid}>
            
            {/* Left Side: Subscription Package card */}
            <div className={styles.glassPanel}>
              <div className={styles.coverWrapper}>
                {activeSub.cover_url ? (
                  <Image src={activeSub.cover_url} alt="Cover Banner" fill style={{ objectFit: 'cover' }} />
                ) : (
                  <div className={styles.coverPlaceholder} />
                )}
                
                <div className={styles.logoOverlay}>
                  {activeSub.logo_url ? (
                    <Image src={activeSub.logo_url} alt="Logo" fill style={{ objectFit: 'cover' }} />
                  ) : (
                    <ShoppingBag size={24} color="#a78bfa" />
                  )}
                </div>
              </div>

              <div className={styles.detailsContent}>
                <div>
                  <h2 className={styles.subName}>{activeSub.name}</h2>
                  
                  {/* Pricing Type Toggle Tabs / Badge */}
                  {pricingOptions && (
                    <div style={{ marginTop: '16px' }}>
                      {pricingOptions.hasShared && pricingOptions.hasPrivate ? (
                        <div className={styles.tabsContainer}>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${selectedType === 'shared' ? styles.tabBtnActive : ''}`}
                            onClick={() => setSelectedType('shared')}
                          >
                            Shared Pricing
                          </button>
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${selectedType === 'private' ? styles.tabBtnActive : ''}`}
                            onClick={() => setSelectedType('private')}
                          >
                            Private Pricing
                          </button>
                        </div>
                      ) : (
                        <div className={styles.badgeIndicator}>
                          {pricingOptions.hasShared ? 'Shared Subscription' : 'Private Subscription'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2x2 Grid Package Duration Selector */}
                  {pricingOptions && (() => {
                    const monthlyPrice = getSelectedMonthlyPrice();
                    const packages = [
                      { duration: 1, label: '1 Month', desc: 'No discount' },
                      { duration: 3, label: '3 Months', desc: '15 days free' },
                      { duration: 6, label: '6 Months', desc: '1 month free' },
                      { duration: 12, label: '1 Year', desc: '2 months free' },
                    ];

                    return (
                      <div style={{ marginTop: '16px' }}>
                        <span className={styles.formLabel} style={{ display: 'block', marginBottom: '8px' }}>Select Package Duration</span>
                        <div className={styles.packageGrid}>
                          {packages.map((pkg) => {
                            const billing = calculatePricing(monthlyPrice, pkg.duration);
                            const isActive = selectedDuration === pkg.duration;
                            return (
                              <div
                                key={pkg.duration}
                                className={`${styles.packageCard} ${isActive ? styles.packageCardActive : ''}`}
                                onClick={() => setSelectedDuration(pkg.duration)}
                              >
                                <span className={styles.packageDuration}>{pkg.label}</span>
                                <span className={styles.packagePrice}>
                                  {billing.totalAmount.toFixed(2)} {pricingOptions.currency}
                                </span>
                                {billing.discountAmount > 0 ? (
                                  <span className={styles.packageDiscount}>
                                    Save {billing.discountAmount.toFixed(2)} {pricingOptions.currency}
                                  </span>
                                ) : (
                                  <span className={styles.packageNoDiscount}>Standard rate</span>
                                )}
                                {isActive && (
                                  <span className={styles.packageCheckmark}>✓</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Display Selected Summary Price */}
                  {pricingOptions && (() => {
                    const monthlyPrice = getSelectedMonthlyPrice();
                    const billing = calculatePricing(monthlyPrice, selectedDuration);
                    return (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginTop: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#94a3b8' }}>
                          <span>Plan Rate ({selectedType === 'shared' ? 'Shared' : 'Private'}):</span>
                          <span>{monthlyPrice.toFixed(2)} {pricingOptions.currency} / mo</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#94a3b8' }}>
                          <span>Duration:</span>
                          <span>{selectedDuration === 12 ? '1 Year' : `${selectedDuration} month${selectedDuration > 1 ? 's' : ''}`}</span>
                        </div>
                        {billing.discountAmount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#10b981', fontWeight: 600 }}>
                            <span>Discount:</span>
                            <span>-{billing.discountAmount.toFixed(2)} {pricingOptions.currency}</span>
                          </div>
                        )}
                        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)', margin: '6px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                          <span>Total Amount:</span>
                          <span style={{ color: '#c084fc' }}>{billing.totalAmount.toFixed(2)} {pricingOptions.currency}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <p className={styles.description}>{pricingOptions?.description}</p>
              </div>
            </div>

            {/* Right Side: Order Registration and Payment Details Form */}
            <div className={styles.glassPanel}>
              <div className={styles.formContent}>
                <h3 className={styles.formTitle}>Complete Purchase</h3>
                
                <form onSubmit={handleCheckoutSubmit} className={styles.form}>
                  
                  {/* Select payment method */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Payment Method</label>
                    <select
                      className={styles.paymentSelect}
                      value={paymentMethodId}
                      onChange={(e) => setPaymentMethodId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose payment method --</option>
                      {filteredPaymentMethods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.type.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment instructions details */}
                  {activePaymentMethod && (
                    <div className={styles.paymentSection}>
                      <p style={{ fontWeight: 600, fontSize: '13.5px', color: '#c084fc' }}>
                        Instructions:
                      </p>
                      <p className={styles.instructionsBox}>{activePaymentMethod.instructions}</p>
                      
                      {activePaymentMethod.fields && (() => {
                        try {
                          const parsed = JSON.parse(activePaymentMethod.fields);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            return (
                              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {parsed.map((f: any, idx: number) => (
                                  <div key={idx} className={styles.instructionsField}>
                                    <span className={styles.instructionsLabel}>{f.label}</span>
                                    <span className={styles.instructionsVal}>{f.value}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                        } catch (e) {}
                        return null;
                      })()}
                    </div>
                  )}

                  {/* User Inputs */}
                  <div className={styles.formGroup}>
                    <label htmlFor="checkoutName" className={styles.formLabel}>Full Name</label>
                    <input
                      id="checkoutName"
                      type="text"
                      className={styles.formInput}
                      placeholder="John Doe"
                      value={checkoutName}
                      onChange={(e) => setCheckoutName(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="checkoutEmail" className={styles.formLabel}>Email Address</label>
                    <input
                      id="checkoutEmail"
                      type="email"
                      className={styles.formInput}
                      placeholder="john@example.com"
                      value={checkoutEmail}
                      onChange={(e) => setCheckoutEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="checkoutWhatsapp" className={styles.formLabel}>WhatsApp Number</label>
                    <input
                      id="checkoutWhatsapp"
                      type="text"
                      className={styles.formInput}
                      placeholder="+92 (300) 123-4567"
                      value={checkoutWhatsapp}
                      onChange={(e) => setCheckoutWhatsapp(e.target.value)}
                      required
                    />
                  </div>

                  {/* Receipt screenshot uploader */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Payment Screenshot / Receipt</label>
                    
                    <label className={styles.fileInputWrapper}>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        required
                        disabled={isUploadingFile || isSubmittingOrder}
                      />
                      {isUploadingFile ? (
                        <>
                          <Loader2 className={styles.spinner} size={24} color="#8b5cf6" />
                          <span className={styles.fileInputText}>Uploading screenshot...</span>
                        </>
                      ) : receiptUrl ? (
                        <span className={styles.fileInputSuccess}>
                          <Check size={18} />
                          Screenshot Uploaded
                        </span>
                      ) : (
                        <>
                          <FileText size={24} style={{ color: '#475569' }} />
                          <span className={styles.fileInputText}>Select and upload payment receipt</span>
                        </>
                      )}
                    </label>
                  </div>

                  {orderError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '13px' }}>
                      <AlertCircle size={16} />
                      <span>{orderError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isUploadingFile || isSubmittingOrder || !receiptUrl}
                  >
                    {isSubmittingOrder ? (
                      <>
                        <Loader2 className={styles.spinner} size={18} />
                        <span>Submitting Order...</span>
                      </>
                    ) : (
                      <span>
                        Place Order ({pricingOptions ? calculatePricing(getSelectedMonthlyPrice(), selectedDuration).totalAmount.toFixed(2) : '0.00'} {pricingOptions?.currency})
                      </span>
                    )}
                  </button>
                </form>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070709', color: '#94a3b8' }}>
        <span>Loading Checkout...</span>
      </div>
    }>
      <CheckoutForm />
    </Suspense>
  );
}
export const dynamic = 'force-dynamic';
