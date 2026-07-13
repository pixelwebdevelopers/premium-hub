'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  ShieldAlert, 
  User, 
  Check, 
  ArrowLeft, 
  RefreshCw 
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Auth details
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Form controls
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Verification states
  const [verificationMode, setVerificationMode] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Particle background logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }> = [];

    const mouse = {
      x: null as number | null,
      y: null as number | null,
      radius: 180,
    };

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const density = Math.floor((canvas.width * canvas.height) / 18000);
      const particleCount = Math.min(Math.max(density, 35), 90);

      for (let i = 0; i < particleCount; i++) {
        const isPurple = Math.random() > 0.5;
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7,
          radius: Math.random() * 2 + 1,
          color: isPurple ? '#8b5cf6' : '#3b82f6',
        });
      }
    };

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 1;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx = -p.vx;
        if (p.y < 0 || p.y > canvas.height) p.vy = -p.vy;

        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            p.x += (dx / dist) * force * 0.5;
            p.y += (dy / dist) * force * 0.5;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const alpha = ((110 - dist) / 110) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    resizeCanvas();
    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (activeTab === 'login') {
      if (!email || !password) {
        setError('Please fill in all fields.');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.status === 403 && data.error === 'unverified') {
          // Unverified email, send them to verification screen
          setVerificationEmail(data.email || email);
          setVerificationMode(true);
          // Auto dispatch verification code resend
          await fetch('/api/auth/resend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: data.email || email }),
          });
          setSuccess('An account was found but is unverified. Verification code sent.');
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || 'Invalid credentials.');
        }

        window.location.href = '/dashboard';
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'An error occurred during sign in.';
        setError(errMsg);
        setIsLoading(false);
      }
    } else {
      // Register logic
      if (!name || !email || !password || !confirmPassword) {
        setError('Please fill in all fields.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Registration failed.');
        }

        setVerificationEmail(data.email || email);
        setVerificationMode(true);
        setSuccess('Account created! A verification code has been sent to your email.');
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
        setError(errMsg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) return;

    setIsVerifying(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      setSuccess('Account verified successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Invalid or expired code.';
      setError(errMsg);
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (!verificationEmail) return;

    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      setSuccess('A new verification code has been sent to your email.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to resend. Please try again.';
      setError(errMsg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      
      <div className={styles.glowBlob1} />
      <div className={styles.glowBlob2} />

      <div className={`${styles.loginCard} animate-fade-in`}>
        <div className={styles.header}>
          <div className={styles.logoWrapper} style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
            <Image
              src="/premium-hub-logo-v3.png"
              alt="Premium Hub Logo"
              width={200}
              height={60}
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
          <p className={styles.subtitle}>
            {verificationMode 
              ? 'Verify your customer account' 
              : activeTab === 'login' 
                ? 'Sign in to access your dashboard' 
                : 'Create an account to track subscriptions'}
          </p>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={styles.successBanner}>
            <Check size={18} />
            <span>{success}</span>
          </div>
        )}

        {verificationMode ? (
          /* OTP verification form */
          <form onSubmit={handleVerifyOTP} className={styles.form}>
            <div className={styles.formGroup} style={{ textAlign: 'center' }}>
              <label htmlFor="otpCode" className={styles.label} style={{ display: 'block', marginBottom: '8px' }}>
                Enter Verification Code (OTP)
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  className={styles.input}
                  style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '6px', paddingLeft: '16px', fontFamily: 'monospace', fontWeight: 'bold' }}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                  disabled={isVerifying}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isVerifying || verificationCode.length !== 6}
            >
              {isVerifying ? (
                <>
                  <Loader2 className={styles.spinner} size={18} />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify and Login</span>
              )}
            </button>

            <button
              type="button"
              className={styles.backLink}
              style={{ background: 'none', border: 'none', cursor: 'pointer', gap: '4px' }}
              onClick={handleResendOTP}
              disabled={isResending}
            >
              {isResending ? <Loader2 className={styles.spinner} size={14} /> : <RefreshCw size={14} />}
              <span>Resend OTP Code</span>
            </button>

            <button
              type="button"
              className={styles.backLink}
              style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '16px' }}
              onClick={() => {
                setVerificationMode(false);
                setError(null);
                setSuccess(null);
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Login</span>
            </button>
          </form>
        ) : (
          /* Main login/register forms */
          <>
            {/* Tab Swappers */}
            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'login' ? styles.activeTab : ''}`}
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                  setSuccess(null);
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'register' ? styles.activeTab : ''}`}
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                  setSuccess(null);
                }}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit}>
              {activeTab === 'register' && (
                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.label}>
                    Full Name
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="name"
                      type="text"
                      className={styles.input}
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                    <User className={styles.inputIcon} size={16} />
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email Address
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="email"
                    type="email"
                    className={styles.input}
                    placeholder="name@example.com"
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
                    className={styles.input}
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
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {activeTab === 'register' && (
                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword" className={styles.label}>
                    Confirm Password
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      className={styles.input}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                    <Lock className={styles.inputIcon} size={16} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className={styles.spinner} size={18} />
                    <span>Processing...</span>
                  </>
                ) : activeTab === 'login' ? (
                  <span>Sign In</span>
                ) : (
                  <span>Register Account</span>
                )}
              </button>
            </form>
          </>
        )}

        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} />
          <span>Return to Homepage</span>
        </Link>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
