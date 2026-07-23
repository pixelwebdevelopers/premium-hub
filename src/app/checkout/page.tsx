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
  ShoppingBag,
  Lock,
  Mail,
  User,
  ShieldCheck,
  RefreshCw,
  Menu,
  X,
  ChevronDown,
  Layout,
  Info
} from 'lucide-react';
import styles from './checkout.module.css';
import { uploadReceipt } from '../../lib/firebase';

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
  fields: Array<{ label: string; value: string }> | string;
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

  // Active user session
  const [currentUser, setCurrentUser] = useState<any>(null);

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Checkout inputs
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutWhatsapp, setCheckoutWhatsapp] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');

  // Account creation inputs (Optional)
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Verification flow states
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placedTrackingId, setPlacedTrackingId] = useState<string | null>(null);
  const [copiedTrackingId, setCopiedTrackingId] = useState(false);

  // Selected pricing type & duration
  const [selectedType, setSelectedType] = useState<'shared' | 'private' | 'full_account'>('shared');
  const [selectedDuration, setSelectedDuration] = useState<number>(1); // 1, 3, 6, 12

  // Fetch logged-in user and fill details
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          setCheckoutName(data.user.name);
          setCheckoutEmail(data.user.email);
        }
      } catch (err) {
        console.error('Failed to load active user profile:', err);
      }
    }
    loadUser();
  }, []);

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

  // 2. Fetch language cookie or localStorage
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
        console.error('Error loading checkout page metadata:', err);
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

  const activeSub = subscriptions.find((sub) => String(sub.id) === subId);

  const getSubPricingOptions = (sub: Subscription) => {
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
    const mainDescription = override?.description || sub.default_description;

    const sharedDescription = override 
      ? (override.shared_description || sub.default_shared_description || mainDescription)
      : (sub.default_shared_description || mainDescription);

    const privateDescription = override 
      ? (override.private_description || sub.default_private_description || mainDescription)
      : (sub.default_private_description || mainDescription);

    const fullAccountDescription = override 
      ? (override.full_account_description || sub.default_full_account_description || mainDescription)
      : (sub.default_full_account_description || mainDescription);

    const hasShared = sharedPrice !== null;
    const hasPrivate = privatePrice !== null;
    const hasFullAccount = fullAccountPrice !== null;

    if (!hasShared && !hasPrivate && !hasFullAccount && legacyPrice !== null) {
      return {
        sharedPrice: legacyPrice,
        privatePrice: 0,
        fullAccountPrice: 0,
        hasShared: true,
        hasPrivate: false,
        hasFullAccount: false,
        currency,
        mainDescription,
        sharedDescription,
        privateDescription,
        fullAccountDescription,
      };
    }

    return {
      sharedPrice: sharedPrice !== null ? sharedPrice : (legacyPrice || 0),
      privatePrice: privatePrice !== null ? privatePrice : 0,
      fullAccountPrice: fullAccountPrice !== null ? fullAccountPrice : 0,
      hasShared,
      hasPrivate,
      hasFullAccount,
      currency,
      mainDescription,
      sharedDescription,
      privateDescription,
      fullAccountDescription,
    };
  };

  const pricingOptions = activeSub ? getSubPricingOptions(activeSub) : null;

  const activeType: 'shared' | 'private' | 'full_account' = pricingOptions 
    ? (
        selectedType === 'shared' && pricingOptions.hasShared
          ? 'shared'
          : selectedType === 'private' && pricingOptions.hasPrivate
          ? 'private'
          : selectedType === 'full_account' && pricingOptions.hasFullAccount
          ? 'full_account'
          : pricingOptions.hasShared
          ? 'shared'
          : pricingOptions.hasPrivate
          ? 'private'
          : pricingOptions.hasFullAccount
          ? 'full_account'
          : 'shared'
      )
    : 'shared';

  const getSelectedMonthlyPrice = () => {
    if (!pricingOptions) return 0;
    if (activeType === 'shared') {
      return pricingOptions.sharedPrice;
    } else if (activeType === 'private') {
      return pricingOptions.privatePrice;
    } else {
      return pricingOptions.fullAccountPrice;
    }
  };

  const getSelectedDescription = () => {
    if (!pricingOptions) return '';
    if (activeType === 'shared') {
      return pricingOptions.sharedDescription || pricingOptions.mainDescription;
    } else if (activeType === 'private') {
      return pricingOptions.privateDescription || pricingOptions.mainDescription;
    } else if (activeType === 'full_account') {
      return pricingOptions.fullAccountDescription || pricingOptions.mainDescription;
    }
    return pricingOptions.mainDescription;
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

    if (createAccount && !currentUser) {
      if (password !== confirmPassword) {
        setOrderError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setOrderError('Password must be at least 6 characters.');
        return;
      }
    }

    const monthlyPrice = getSelectedMonthlyPrice();
    const billing = calculatePricing(monthlyPrice, selectedDuration);
    const billingTypeLabel = activeType === 'shared' ? 'Shared Screen' : activeType === 'private' ? 'Private Screen' : 'Full Account';
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
          duration_months: selectedDuration,
          create_account: createAccount,
          password: createAccount ? password : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit order.');
      }

      setPlacedTrackingId(data.tracking_id);

      if (data.requires_verification) {
        setVerificationEmail(data.email || checkoutEmail);
        setRequiresVerification(true);
      }
    } catch (err: any) {
      setOrderError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !verificationEmail) return;

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, code: verificationCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      // Verification success, hide OTP and go directly to success view
      setRequiresVerification(false);
    } catch (err: any) {
      setVerificationError(err.message || 'Verification code invalid or expired.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!verificationEmail) return;
    setIsResending(true);
    setResendMessage(null);
    setVerificationError(null);

    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      setResendMessage('A new verification code was sent to your email.');
    } catch (err: any) {
      setVerificationError(err.message || 'Failed to resend. Please try again later.');
    } finally {
      setIsResending(false);
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
            <Image src="/premium-hub-logo-v4.png" alt="Premium Hub Logo" width={180} height={50} style={{ objectFit: 'contain' }} priority />
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
            <Image src="/premium-hub-logo-v4.png" alt="Premium Hub Logo" width={180} height={50} style={{ objectFit: 'contain' }} priority />
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
          <div className={styles.regionBadge}>
            <Globe size={16} style={{ color: '#c084fc' }} />
            <span className={styles.regionText}>Region: {countryName} ({countryCode})</span>
            <span className={styles.regionCodeMobile}>{countryCode}</span>
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

          {/* Dashboard / Account Button if logged in */}
          {currentUser ? (
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
                <div className={styles.regionBadge} style={{ width: '100%', justifyContent: 'center' }}>
                  <Globe size={16} style={{ color: '#c084fc' }} />
                  <span>{countryName} ({countryCode})</span>
                </div>
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
                {currentUser ? (
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

      {/* Layout Main */}
      <main className={styles.main}>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        {requiresVerification ? (
          /* Email OTP Verification Screen */
          <div className={`${styles.glassPanel} ${styles.confirmationContainer}`}>
            <div className={styles.successIcon} style={{ borderColor: '#8b5cf6', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
              <ShieldCheck size={40} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Verify Your Email</h2>
            <p className={styles.confirmationInfo} style={{ maxWidth: '460px' }}>
              We have created a pending account for you and sent a 6-digit OTP verification code to <strong style={{ color: '#ffffff' }}>{verificationEmail}</strong>. Please enter the code below to verify your account and complete your order.
            </p>

            <form onSubmit={handleVerificationSubmit} className={styles.form} style={{ width: '100%', maxWidth: '340px' }}>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  maxLength={6}
                  className={styles.formInput}
                  style={{ textAlign: 'center', fontSize: '22px', letterSpacing: '8px', fontWeight: 'bold', fontFamily: 'monospace' }}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                  disabled={isVerifying}
                />
              </div>

              {verificationError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '13px', justifyContent: 'center' }}>
                  <AlertCircle size={16} />
                  <span>{verificationError}</span>
                </div>
              )}

              {resendMessage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '13px', justifyContent: 'center' }}>
                  <Check size={16} />
                  <span>{resendMessage}</span>
                </div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={isVerifying || verificationCode.length !== 6}>
                {isVerifying ? (
                  <>
                    <Loader2 className={styles.spinner} size={18} />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <span>Verify and Complete</span>
                )}
              </button>

              <button
                type="button"
                className={styles.backBtn}
                style={{ alignSelf: 'center', gap: '4px', margin: '8px 0 0 0', cursor: 'pointer', background: 'none', border: 'none', fontSize: '13.5px' }}
                onClick={handleResendCode}
                disabled={isResending}
              >
                {isResending ? <Loader2 className={styles.spinner} size={14} /> : <RefreshCw size={14} />}
                <span>Resend Code</span>
              </button>
            </form>
          </div>
        ) : placedTrackingId ? (
          /* Confirmation card (Success) */
          <div className={`${styles.glassPanel} ${styles.confirmationContainer}`}>
            <div className={styles.successIcon}>
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Order Submitted Successfully!</h2>
            <p className={styles.confirmationInfo}>
              Your subscription request has been received. Please copy the Order Tracking ID below.
              {createAccount || currentUser ? ' Since you have a verified account, you can log in to your dashboard to track subscription health.' : ' You can paste it into the homepage tracking tool to verify when credentials are delivered.'}
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

            <div style={{ display: 'flex', gap: '16px', marginTop: '36px' }}>
              {(createAccount || currentUser) ? (
                <button 
                  onClick={() => window.location.href = '/dashboard'} 
                  className={styles.submitBtn} 
                  style={{ textDecoration: 'none', padding: '0 32px' }}
                >
                  Go to Dashboard
                </button>
              ) : (
                <button 
                  onClick={() => router.push('/')} 
                  className={styles.submitBtn} 
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', padding: '0 32px' }}
                >
                  Return to Homepage
                </button>
              )}
            </div>
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
                      <div className={styles.tabsContainer} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {pricingOptions.hasShared && (
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${activeType === 'shared' ? styles.tabBtnActive : ''}`}
                            onClick={() => setSelectedType('shared')}
                            title="Shared Screen: 1 Profile access with PIN"
                          >
                            <span>Shared Screen</span>
                            <Info size={13} className={styles.infoIcon} />
                            <div className={styles.tooltipBox}>
                              <strong>Shared Screen Option:</strong>
                              <p style={{ margin: '4px 0 0 0' }}>
                                {pricingOptions.sharedDescription || '1 Profile access on a shared account with personal PIN protection.'}
                              </p>
                            </div>
                          </button>
                        )}
                        {pricingOptions.hasPrivate && (
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${activeType === 'private' ? styles.tabBtnActive : ''}`}
                            onClick={() => setSelectedType('private')}
                            title="Private Screen: Dedicated private screen"
                          >
                            <span>Private Screen</span>
                            <Info size={13} className={styles.infoIcon} />
                            <div className={styles.tooltipBox}>
                              <strong>Private Screen Option:</strong>
                              <p style={{ margin: '4px 0 0 0' }}>
                                {pricingOptions.privateDescription || 'Dedicated private screen with customized viewing profile & PIN.'}
                              </p>
                            </div>
                          </button>
                        )}
                        {pricingOptions.hasFullAccount && (
                          <button
                            type="button"
                            className={`${styles.tabBtn} ${activeType === 'full_account' ? styles.tabBtnActive : ''}`}
                            onClick={() => setSelectedType('full_account')}
                            title="Full Account: Total account control & credentials"
                          >
                            <span>Full Account</span>
                            <Info size={13} className={styles.infoIcon} />
                            <div className={styles.tooltipBox}>
                              <strong>Full Account Option:</strong>
                              <p style={{ margin: '4px 0 0 0' }}>
                                {pricingOptions.fullAccountDescription || 'Complete account credentials & ownership access with all screens.'}
                              </p>
                            </div>
                          </button>
                        )}
                      </div>
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
                    const optionLabel = activeType === 'shared' ? 'Shared Screen' : activeType === 'private' ? 'Private Screen' : 'Full Account';
                    return (
                      <div style={{
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '16px',
                        padding: '20px',
                        marginTop: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#9ca3af' }}>
                          <span>Plan Rate ({optionLabel}):</span>
                          <span>{monthlyPrice.toFixed(2)} {pricingOptions.currency} / mo</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#9ca3af' }}>
                          <span>Duration:</span>
                          <span>{selectedDuration === 12 ? '1 Year' : `${selectedDuration} month${selectedDuration > 1 ? 's' : ''}`}</span>
                        </div>
                        {billing.discountAmount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#10b981', fontWeight: 600 }}>
                            <span>Discount:</span>
                            <span>-{billing.discountAmount.toFixed(2)} {pricingOptions.currency}</span>
                          </div>
                        )}
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                          <span>Total Amount:</span>
                          <span style={{ color: '#c084fc' }}>{billing.totalAmount.toFixed(2)} {pricingOptions.currency}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <p className={styles.description}>{getSelectedDescription()}</p>
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
                      <p style={{ fontWeight: 600, fontSize: '13.5px', color: '#a78bfa' }}>
                        Instructions:
                      </p>
                      <p className={styles.instructionsBox}>{activePaymentMethod.instructions}</p>
                      
                      {activePaymentMethod.fields && (() => {
                        try {
                          const parsed = typeof activePaymentMethod.fields === 'string'
                            ? JSON.parse(activePaymentMethod.fields)
                            : activePaymentMethod.fields;
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
                      disabled={currentUser !== null}
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
                      disabled={currentUser !== null}
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

                  {/* Account Creation Block (Optional, only for guests) */}
                  {!currentUser && (
                    <div style={{ marginTop: '8px' }}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          className={styles.checkboxInput}
                          checked={createAccount}
                          onChange={(e) => setCreateAccount(e.target.checked)}
                        />
                        <span>Create an account with this order (Optional)</span>
                      </label>

                      {createAccount && (
                        <div className={styles.accountCreationBox}>
                          <div className={styles.formGroup}>
                            <label htmlFor="checkoutPassword" className={styles.formLabel}>Account Password</label>
                            <input
                              id="checkoutPassword"
                              type="password"
                              className={styles.formInput}
                              placeholder="Min. 6 characters"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required={createAccount}
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label htmlFor="checkoutConfirmPassword" className={styles.formLabel}>Confirm Password</label>
                            <input
                              id="checkoutConfirmPassword"
                              type="password"
                              className={styles.formInput}
                              placeholder="Repeat password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required={createAccount}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                          <FileText size={24} style={{ color: '#4b5563' }} />
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
