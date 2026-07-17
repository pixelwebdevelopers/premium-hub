'use client';

import React from 'react';
import { ArrowRight, Play, Star, Shield } from 'lucide-react';
import styles from './HeroSection.module.css';

const PLATFORMS = [
  { name: 'Netflix', src: '/platforms/4.png' },
  { name: 'Spotify', src: '/platforms/2.png' },
  { name: 'Prime Video', src: '/platforms/3.png' },
  { name: 'ChatGPT', src: '/platforms/8.png' },
  { name: 'YouTube Premium', src: '/platforms/1.png' },
  { name: 'Canva', src: '/platforms/9.png' },
  { name: 'Midjourney', src: '/platforms/5.png' },
  { name: 'Apple TV+', src: '/platforms/10.png' },
  { name: 'Max', src: '/platforms/6.png' },
  { name: 'Crunchyroll', src: '/platforms/7.png' },
];

interface HeroSectionProps {
  onBrowsePlans: () => void;
}

export default function HeroSection({ onBrowsePlans }: HeroSectionProps) {
  return (
    <section className={styles.heroSection} id="hero">
      <div className={styles.heroInner}>
        {/* Left Column - Text Content */}
        <div className={styles.heroLeft}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            All Premium Subscriptions in One Place
          </div>

          <h1 className={styles.heroHeading}>
            Save up to{' '}
            <span className={styles.heroHeadingAccent}>80%</span>
            <br />
            on Premium
            <br />
            Subscriptions
          </h1>

          <p className={styles.heroDescription}>
            Get Netflix, Spotify, YouTube Premium, Disney+, ChatGPT Plus, Canva Pro, Midjourney and more at the best prices.
          </p>

          <div className={styles.heroCTAs}>
            <button
              type="button"
              className={styles.ctaPrimary}
              onClick={onBrowsePlans}
            >
              Browse Plans
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className={styles.ctaSecondary}
              onClick={() => {
                const el = document.getElementById('subscriptions');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span className={styles.ctaPlayIcon}>
                <Play size={14} fill="#fff" />
              </span>
              How It Works
            </button>
          </div>

          {/* Social Proof */}
          <div className={styles.socialProof}>
            <div className={styles.avatarStack}>
              {[1, 2, 3, 4].map((i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={i}
                  src={`/avatars/${i}.jpg`}
                  alt={`Customer ${i}`}
                  className={styles.avatar}
                />
              ))}
            </div>

            <div className={styles.proofItem}>
              <span className={styles.proofValue}>25,000+</span>
              <span className={styles.proofLabel}>Happy Customers</span>
            </div>

            <div className={styles.proofDivider} />

            <div className={styles.proofItem}>
              <span className={styles.proofValue}>
                <Star size={16} className={styles.proofStar} fill="#fbbf24" />
                4.9/5
              </span>
              <span className={styles.proofLabel}>Average Rating</span>
            </div>

            <div className={styles.proofDivider} />

            <div className={styles.proofItem}>
              <span className={styles.proofValue}>
                <Shield size={14} className={styles.proofSecureIcon} />
                100%
              </span>
              <span className={styles.proofLabel}>Secure Payments</span>
            </div>
          </div>
        </div>

        {/* Right Column - Platform Cards Grid */}
        <div className={styles.heroRight}>
          {/* Orbit glow effects */}
          <div className={styles.orbitGlow} />
          <div className={styles.orbitGlowInner} />

          {/* Sparkle particles */}
          <div className={`${styles.sparkle} ${styles.sparkle1}`} />
          <div className={`${styles.sparkle} ${styles.sparkle2}`} />
          <div className={`${styles.sparkle} ${styles.sparkle3}`} />
          <div className={`${styles.sparkle} ${styles.sparkle4}`} />
          <div className={`${styles.sparkle} ${styles.sparkle5}`} />

          <div className={styles.platformGrid}>
            {PLATFORMS.map((platform) => (
              <div
                key={platform.name}
                className={styles.platformCard}
                title={platform.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={platform.src}
                  alt={platform.name}
                  className={styles.platformCardImage}
                  loading="eager"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

