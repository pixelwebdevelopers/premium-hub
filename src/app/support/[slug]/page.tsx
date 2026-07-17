'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, Shield, CreditCard, RefreshCw, BookOpen } from 'lucide-react';
import Image from 'next/image';
import styles from '../support.module.css';

interface SupportContent {
  title: string;
  icon: React.ReactNode;
  lastUpdated: string;
  sections: { heading: string; paragraphs: string[] }[];
}

const supportPagesData: Record<string, SupportContent> = {
  'help-center': {
    title: 'Help Center',
    icon: <HelpCircle className="w-8 h-8 text-[#a78bfa]" size={32} />,
    lastUpdated: 'July 17, 2026',
    sections: [
      {
        heading: 'Frequently Asked Questions',
        paragraphs: [
          'How do I receive my premium subscription login? After a successful checkout, our team automatically processes and delivers your login credentials or activation link via email and directly to your user dashboard within 5 to 15 minutes.',
          'Are these accounts shared or private? We offer both private (fully yours with personal profiles) and shared (cost-effective access with your own profile pin) subscriptions. Each product page lists these options clearly.',
          'What happens if my subscription stops working? All subscriptions sold on Premium Hub include our full-period replacement warranty. If your service stops working, simply contact our live chat support, and we will restore or replace it instantly.'
        ]
      },
      {
        heading: 'Getting Support',
        paragraphs: [
          'Our support team is available 24/7. You can start a live chat session by clicking the support bubble widget in the bottom-right corner of the site.',
          'Alternatively, you can track your order status in real-time or manage active services directly from your Premium Hub account dashboard.'
        ]
      }
    ]
  },
  'how-it-works': {
    title: 'How It Works',
    icon: <BookOpen className="w-8 h-8 text-[#818cf8]" size={32} />,
    lastUpdated: 'July 17, 2026',
    sections: [
      {
        heading: '1. Select Your Service',
        paragraphs: [
          'Browse our range of available premium platforms on the landing page, including Netflix, Spotify, ChatGPT Plus, YouTube Premium, Canva Pro, and more.',
          'Choose between Private or Shared subscription packages, and select the duration that fits your budget.'
        ]
      },
      {
        heading: '2. Secure Checkout',
        paragraphs: [
          'Click "Order Now" and fill in your customer details. Choose your preferred local payment method. We support credit/debit cards, secure crypto options, and popular mobile wallets.',
          'All transactions are processed through highly secure end-to-end encrypted gateways.'
        ]
      },
      {
        heading: '3. Instant Account Delivery',
        paragraphs: [
          'Once payment is confirmed, our automated system generates your account details or activation invite.',
          'The credentials are sent to your registered email address and updated in your Dashboard. Start enjoying your premium account immediately!'
        ]
      }
    ]
  },
  'payment-methods': {
    title: 'Payment Methods',
    icon: <CreditCard className="w-8 h-8 text-[#60a5fa]" size={32} />,
    lastUpdated: 'July 17, 2026',
    sections: [
      {
        heading: 'Accepted Payment Options',
        paragraphs: [
          'Credit & Debit Cards: We accept Visa, Mastercard, American Express, and Discover. Card details are never stored on our servers.',
          'Cryptocurrency: For ultimate privacy, pay securely using Bitcoin (BTC), Ethereum (ETH), Litecoin (LTC), or Tether (USDT).',
          'Digital Wallets: PayPal, Apple Pay, Google Pay, and localized bank transfers are available depending on your detected country region.'
        ]
      },
      {
        heading: 'Security & Protection',
        paragraphs: [
          'All payments are processed through PCI-DSS compliant secure payment providers with 256-bit SSL encryption.',
          'We leverage real-time fraud detection filters to ensure all customer transactions are completely safe and secure.'
        ]
      }
    ]
  },
  'refund-policy': {
    title: 'Refund Policy',
    icon: <RefreshCw className="w-8 h-8 text-[#34d399]" size={32} />,
    lastUpdated: 'July 17, 2026',
    sections: [
      {
        heading: 'Our Guarantee',
        paragraphs: [
          'We offer a 100% money-back guarantee if we fail to deliver your subscription credentials within 24 hours of purchase.',
          'All plans include a full-period replacement warranty. If a subscription goes down and we are unable to restore it within 48 hours of reporting, we will issue a prorated refund for the remaining subscription time.'
        ]
      },
      {
        heading: 'Refund Conditions',
        paragraphs: [
          'Refunds are not provided for user error, change of mind, or platforms altering their global terms of service in ways beyond our control.',
          'To request a refund, please open a ticket via the support widget or email billing@premiumhub.com with your order tracking ID.'
        ]
      }
    ]
  },
  'terms-of-service': {
    title: 'Terms of Service',
    icon: <Shield className="w-8 h-8 text-[#f87171]" size={32} />,
    lastUpdated: 'July 17, 2026',
    sections: [
      {
        heading: 'Acceptance of Terms',
        paragraphs: [
          'By accessing and placing an order on Premium Hub, you confirm that you agree to and are bound by these terms of service.',
          'Premium Hub acts as a reseller and distributor. All trademark rights and brand names belong entirely to their respective streaming/software platforms.'
        ]
      },
      {
        heading: 'Usage Rules',
        paragraphs: [
          'Shared accounts must strictly be used on one device at a time and profile names/PINs must not be changed. Violation of shared terms will lead to immediate account termination without refund.',
          'Reselling or sharing account details provided by us to unauthorized third-parties is strictly prohibited.'
        ]
      }
    ]
  }
};

export default function SupportPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const pageData = supportPagesData[slug];

  if (!pageData) {
    return (
      <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '24px' }}>
        <h1 className={styles.title}>Page Not Found</h1>
        <p className={styles.meta} style={{ fontSize: '16px', marginBottom: '24px' }}>The requested support page does not exist.</p>
        <Link href="/" className={styles.calloutBtn}>
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <Image
            src="/premium-hub-logo-v4.png"
            alt="Premium Hub Logo"
            width={150}
            height={42}
            style={{ objectFit: 'contain' }}
            priority
          />
        </Link>
        <button
          onClick={() => router.push('/')}
          className={styles.backBtn}
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>
      </header>

      {/* Main Container */}
      <main className={styles.mainContent}>
        {/* Page Title Header */}
        <div className={styles.pageHeader}>
          {pageData.icon}
          <div>
            <h1 className={styles.title}>{pageData.title}</h1>
            <p className={styles.meta}>Last updated: {pageData.lastUpdated}</p>
          </div>
        </div>

        {/* Content Sections */}
        <div className={styles.sectionsList}>
          {pageData.sections.map((section, idx) => (
            <section key={idx} className={styles.section}>
              <h2 className={styles.sectionHeading}>
                {section.heading}
              </h2>
              <div className={styles.paragraphs}>
                {section.paragraphs.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Support Callout */}
        <div className={styles.supportCallout}>
          <h3 className={styles.calloutTitle}>Still need help?</h3>
          <p className={styles.calloutText}>Our support team is available 24/7 to assist you with any questions.</p>
          <button
            onClick={() => {
              const chatBtn = document.querySelector('[class*="chatBubble"]') as HTMLElement;
              if (chatBtn) {
                chatBtn.click();
              } else {
                router.push('/');
              }
            }}
            className={styles.calloutBtn}
          >
            Start Live Chat
          </button>
        </div>
      </main>
    </div>
  );
}
