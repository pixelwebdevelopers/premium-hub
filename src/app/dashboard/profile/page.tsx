'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import styles from './profile.module.css';
import { Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading: userLoading } = useDashboard();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync state with loaded user data
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  if (userLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
        <Loader2 className={styles.spinner} size={36} color="#8b5cf6" />
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading profile settings...</span>
      </div>
    );
  }

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim() || !email.trim()) {
      setFeedback({ text: 'Name and email are required.', type: 'error' });
      return;
    }

    if (password) {
      if (password.length < 6) {
        setFeedback({ text: 'Password must be at least 6 characters long.', type: 'error' });
        return;
      }
      if (password !== confirmPassword) {
        setFeedback({ text: 'Passwords do not match.', type: 'error' });
        return;
      }
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password: password || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setFeedback({ text: 'Profile details saved successfully!', type: 'success' });
        // Clear password fields
        setPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(data.error || 'Failed to save profile changes.');
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'An error occurred while saving.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>Account Settings</h1>
        <p className={styles.subtitle}>
          Update your personal details, email address, and account password.
        </p>
      </div>

      {feedback && (
        <div className={`${styles.alert} ${feedback.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className={`${styles.formCard} glassmorphism`}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div style={{ height: '1px', background: 'var(--border-light)', margin: '24px 0' }} />

          <div className={styles.formGroup}>
            <label className={styles.label}>New Password (Optional)</label>
            <input
              type="password"
              className={styles.input}
              placeholder="Leave blank to keep current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSaving}
              minLength={6}
            />
          </div>

          {password && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSaving}
                required={!!password}
              />
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className={styles.spinner} size={16} />
                <span>Saving profile changes...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
