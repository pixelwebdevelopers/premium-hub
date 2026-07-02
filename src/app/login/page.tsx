'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from './login.module.css';
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials. Please try again.');
      }

      // Successful login, refresh/redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setIsLoading(false);
    }
  };


  return (
    <div className={styles.container}>
      <div className={styles.backgroundGlow} />

      <div className={`${styles.loginCard} glassmorphism animate-fade-in`}>
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <Image
              src="/premium-hub-logo.png"
              alt="Premium Hub Logo"
              width={220}
              height={70}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          
          <p className={styles.subtitle}>Sign in to manage the Premium Hub platform</p>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
              <Mail className={styles.inputIcon} size={16} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.input} ${styles.inputPassword}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <Lock className={styles.inputIcon} size={16} />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className={styles.spinner} size={18} />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
