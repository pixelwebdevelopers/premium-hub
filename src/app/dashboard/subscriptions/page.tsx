'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useDashboard } from '../layout';
import { fuzzySearchFilter } from '@/lib/fuzzySearch';
import styles from './subscriptions.module.css';
import SearchableCountrySelect from '../../../components/SearchableCountrySelect';
import { uploadSubscriptionAsset } from '../../../lib/firebase';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Globe2,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  Flag,
  Link2,
  FileText,
  Upload,
} from 'lucide-react';

interface CountryOverride {
  id?: number;
  country_code: string;
  price?: number | null | '';
  shared_price?: number | null | '';
  private_price?: number | null | '';
  full_account_price?: number | null | '';
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
  countries: CountryOverride[];
}

import { COUNTRIES } from '../../../lib/countries';

export default function SubscriptionsPage() {
  const { user: currentUser } = useDashboard();
  const isAdmin = currentUser?.role === 'admin';

  const UNIQUE_CURRENCIES = Array.from(new Set(COUNTRIES.map((c) => c.currency))).sort();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'global' | 'overrides'>('global');

  // Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isGlobal, setIsGlobal] = useState(true);
  const [defaultPrice, setDefaultPrice] = useState<number | ''>('');
  const [defaultSharedPrice, setDefaultSharedPrice] = useState<number | ''>('');
  const [defaultPrivatePrice, setDefaultPrivatePrice] = useState<number | ''>('');
  const [defaultFullAccountPrice, setDefaultFullAccountPrice] = useState<number | ''>('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [defaultDescription, setDefaultDescription] = useState('');
  const [defaultSharedDescription, setDefaultSharedDescription] = useState('');
  const [defaultPrivateDescription, setDefaultPrivateDescription] = useState('');
  const [defaultFullAccountDescription, setDefaultFullAccountDescription] = useState('');
  const [countries, setCountries] = useState<CountryOverride[]>([]);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch subscriptions list
  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/subscriptions');
      if (!response.ok) throw new Error('Failed to load subscriptions.');
      const data = await response.json();
      setSubscriptions(data.subscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const openCreateModal = () => {
    setEditId(null);
    setName('');
    setLogoUrl('');
    setCoverUrl('');
    setIsGlobal(true);
    setDefaultPrice('');
    setDefaultSharedPrice('');
    setDefaultPrivatePrice('');
    setDefaultFullAccountPrice('');
    setDefaultCurrency('USD');
    setDefaultDescription('');
    setDefaultSharedDescription('');
    setDefaultPrivateDescription('');
    setDefaultFullAccountDescription('');
    setCountries([]);
    setFormError(null);
    setActiveTab('global');
    setIsModalOpen(true);
  };

  const openEditModal = (sub: Subscription) => {
    setEditId(sub.id);
    setName(sub.name);
    setLogoUrl(sub.logo_url || '');
    setCoverUrl(sub.cover_url || '');
    setIsGlobal(sub.is_global);
    setDefaultPrice(sub.default_price !== null && sub.default_price !== undefined ? sub.default_price : '');
    setDefaultSharedPrice(sub.default_shared_price !== null && sub.default_shared_price !== undefined ? sub.default_shared_price : '');
    setDefaultPrivatePrice(sub.default_private_price !== null && sub.default_private_price !== undefined ? sub.default_private_price : '');
    setDefaultFullAccountPrice(sub.default_full_account_price !== null && sub.default_full_account_price !== undefined ? sub.default_full_account_price : '');
    setDefaultCurrency(sub.default_currency);
    setDefaultDescription(sub.default_description || '');
    setDefaultSharedDescription(sub.default_shared_description || '');
    setDefaultPrivateDescription(sub.default_private_description || '');
    setDefaultFullAccountDescription(sub.default_full_account_description || '');
    setCountries([...sub.countries]);
    setFormError(null);
    setActiveTab('global');
    setIsModalOpen(true);
  };

  const handleAddOverride = () => {
    // Select first country not already added
    const unusedCountry = COUNTRIES.find(
      (c) => !countries.some((o) => o.country_code === c.code)
    );
    if (!unusedCountry) {
      alert('Overrides have already been configured for all available countries.');
      return;
    }

    setCountries([
      ...countries,
      {
        country_code: unusedCountry.code,
        shared_price: defaultSharedPrice !== '' ? Number(defaultSharedPrice) : '',
        private_price: defaultPrivatePrice !== '' ? Number(defaultPrivatePrice) : '',
        full_account_price: defaultFullAccountPrice !== '' ? Number(defaultFullAccountPrice) : '',
        currency: unusedCountry.currency,
        description: defaultDescription || `Local pricing package.`,
        shared_description: defaultSharedDescription || '',
        private_description: defaultPrivateDescription || '',
        full_account_description: defaultFullAccountDescription || '',
        is_visible: true,
      },
    ]);
  };

  const handleRemoveOverride = (index: number) => {
    setCountries(countries.filter((_, idx) => idx !== index));
  };

  const handleOverrideChange = (
    index: number,
    key: keyof CountryOverride,
    val: string | number | boolean
  ) => {
    const updated = [...countries];
    
    // Auto-update currency if country is updated
    if (key === 'country_code') {
      // Prevent duplicates
      const exists = countries.some((o, idx) => o.country_code === val && idx !== index);
      if (exists) {
        alert('This country has already been added to localized overrides.');
        return;
      }
      const cMeta = COUNTRIES.find((c) => c.code === val);
      updated[index] = {
        ...updated[index],
        country_code: val as string,
        currency: cMeta ? cMeta.currency : 'USD',
      };
    } else {
      updated[index] = {
        ...updated[index],
        [key]: val,
      };
    }
    setCountries(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !defaultCurrency) {
      setFormError('Please fill in all global required fields.');
      return;
    }

    if (defaultSharedPrice === '' && defaultPrivatePrice === '' && defaultFullAccountPrice === '' && defaultPrice === '') {
      setFormError('At least one default price tier (Shared, Private, or Full Account) must be provided.');
      return;
    }

    // Verify overrides validation
    const uniqueCountries = new Set(countries.map((c) => c.country_code));
    if (uniqueCountries.size !== countries.length) {
      setFormError('Duplicate country override entries detected. Remove duplicate country rows.');
      return;
    }

    // Validate that overrides also have at least one price
    for (let i = 0; i < countries.length; i++) {
      const o = countries[i];
      if (
        (o.shared_price === undefined || o.shared_price === '' || o.shared_price === null) &&
        (o.private_price === undefined || o.private_price === '' || o.private_price === null) &&
        (o.full_account_price === undefined || o.full_account_price === '' || o.full_account_price === null) &&
        (o.price === undefined || o.price === '' || o.price === null)
      ) {
        setFormError(`Override for ${o.country_code} must have at least one price tier configured.`);
        return;
      }
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      id: editId,
      name,
      logo_url: logoUrl || null,
      cover_url: coverUrl || null,
      is_global: isGlobal,
      default_price: defaultPrice !== '' ? Number(defaultPrice) : null,
      default_shared_price: defaultSharedPrice !== '' ? Number(defaultSharedPrice) : null,
      default_private_price: defaultPrivatePrice !== '' ? Number(defaultPrivatePrice) : null,
      default_full_account_price: defaultFullAccountPrice !== '' ? Number(defaultFullAccountPrice) : null,
      default_currency: defaultCurrency,
      default_description: defaultDescription,
      default_shared_description: defaultSharedDescription || null,
      default_private_description: defaultPrivateDescription || null,
      default_full_account_description: defaultFullAccountDescription || null,
      countries: countries.map(c => ({
        ...c,
        price: c.price !== undefined && c.price !== '' && c.price !== null ? Number(c.price) : null,
        shared_price: c.shared_price !== undefined && c.shared_price !== '' && c.shared_price !== null ? Number(c.shared_price) : null,
        private_price: c.private_price !== undefined && c.private_price !== '' && c.private_price !== null ? Number(c.private_price) : null,
        full_account_price: c.full_account_price !== undefined && c.full_account_price !== '' && c.full_account_price !== null ? Number(c.full_account_price) : null,
        shared_description: c.shared_description || null,
        private_description: c.private_description || null,
        full_account_description: c.full_account_description || null,
      })),
    };

    try {
      const url = '/api/subscriptions';
      const method = editId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save subscription.');
      }

      await fetchSubscriptions();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'cover'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.');
      return;
    }

    try {
      setFormError(null);
      setIsSubmitting(true);
      const downloadUrl = await uploadSubscriptionAsset(file);

      if (type === 'logo') {
        setLogoUrl(downloadUrl);
      } else {
        setCoverUrl(downloadUrl);
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during upload.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, subName: string) => {
    if (!confirm(`Are you sure you want to delete "${subName}"? All localized country configurations will be permanently removed.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/subscriptions?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete subscription.');
      }
      setSubscriptions(subscriptions.filter((s) => s.id !== id));
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // Filter subscriptions based on search
  const filteredSubscriptions = fuzzySearchFilter(
    subscriptions,
    searchQuery,
    (sub) => [sub.name, ...sub.countries.map((c) => c.country_code)]
  );

  return (
    <>
      <div className="animate-fade-in">
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Subscriptions Selling Manager</h1>
          <p className={styles.subtitle}>
            Create global subscriptions and localize pricing configurations for specific countries.
          </p>
        </div>
        {isAdmin && (
          <button className={styles.createBtn} onClick={openCreateModal}>
            <Plus size={18} />
            <span>Create Subscription</span>
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      <div className={styles.searchBar}>
        <input
          type="text"
          className={styles.input}
          placeholder="Search subscriptions by name or localized country code (e.g. IN, US)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: '440px' }}
        />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className={styles.spinner} size={30} color="#8b5cf6" />
        </div>
      ) : filteredSubscriptions.length === 0 ? (
        <div className={styles.emptyState}>
          <CreditCard size={40} />
          <h3 className={styles.emptyTitle}>No Subscriptions Found</h3>
          <p className={styles.emptyDesc}>
            {searchQuery ? 'No packages match your search.' : 'Create your first subscription package to start selling.'}
          </p>
        </div>
      ) : (
        /* Subscriptions Grid */
        <div className={styles.grid}>
          {filteredSubscriptions.map((sub) => {
            const hasOverrides = sub.countries.length > 0;
            return (
              <div key={sub.id} className={`${styles.card} glassmorphism`}>
                {/* Cover Picture */}
                <div className={styles.cardCover}>
                  {sub.cover_url ? (
                    <Image
                      src={sub.cover_url}
                      alt={`${sub.name} Cover`}
                      fill
                      className={styles.coverImg}
                      sizes="(max-width: 768px) 100vw, 340px"
                    />
                  ) : (
                    <div className={styles.coverPlaceholder} />
                  )}
                  {/* Service Logo overlapping cover */}
                  <div className={styles.cardHeader}>
                    <div className={styles.logoWrapper}>
                      {sub.logo_url ? (
                        <Image
                          src={sub.logo_url}
                          alt={`${sub.name} Logo`}
                          width={46}
                          height={46}
                          className={styles.logoImg}
                        />
                      ) : (
                        <div className={styles.logoPlaceholder}>
                          {sub.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body content */}
                <div className={styles.cardBody}>
                  <h3 className={styles.subName}>{sub.name}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                    {sub.default_shared_price !== null && (
                      <span className={styles.defaultPrice} style={{ fontSize: '14px', margin: 0 }}>
                        Shared: {sub.default_currency} {Number(sub.default_shared_price).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>/ mo</span>
                      </span>
                    )}
                    {sub.default_private_price !== null && (
                      <span className={styles.defaultPrice} style={{ fontSize: '14px', margin: 0 }}>
                        Private: {sub.default_currency} {Number(sub.default_private_price).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>/ mo</span>
                      </span>
                    )}
                    {sub.default_full_account_price !== null && (
                      <span className={styles.defaultPrice} style={{ fontSize: '14px', margin: 0 }}>
                        Full Account: {sub.default_currency} {Number(sub.default_full_account_price).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>/ mo</span>
                      </span>
                    )}
                    {sub.default_shared_price === null && sub.default_private_price === null && sub.default_full_account_price === null && sub.default_price !== null && (
                      <span className={styles.defaultPrice} style={{ fontSize: '14px', margin: 0 }}>
                        Default: {sub.default_currency} {Number(sub.default_price).toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>/ mo</span>
                      </span>
                    )}
                  </div>
                  <p className={styles.subDesc}>{sub.default_description}</p>

                  <div className={styles.cardDivider} />

                  {/* Coverage details */}
                  <div className={styles.coverageSection}>
                    <div className={styles.coverageHeader}>
                      <Globe2 size={13} style={{ color: 'var(--accent-purple)' }} />
                      <span>Country Coverage & Local Pricing</span>
                    </div>

                    <div className={styles.coverageBadgeList}>
                      {sub.is_global && (
                        <span className={styles.countryBadge} style={{ background: 'var(--accent-purple-glow)', color: 'var(--accent-purple)', borderColor: 'rgba(139, 92, 246, 0.15)' }}>
                          Global Enabled
                        </span>
                      )}
                      {hasOverrides ? (
                        sub.countries.map((override) => {
                          const pricesStr = [];
                          if (override.shared_price !== null && override.shared_price !== undefined) {
                            pricesStr.push(`S: ${Number(override.shared_price).toFixed(2)}`);
                          }
                          if (override.private_price !== null && override.private_price !== undefined) {
                            pricesStr.push(`P: ${Number(override.private_price).toFixed(2)}`);
                          }
                          if (override.full_account_price !== null && override.full_account_price !== undefined) {
                            pricesStr.push(`F: ${Number(override.full_account_price).toFixed(2)}`);
                          }
                          if (pricesStr.length === 0 && override.price !== null && override.price !== undefined) {
                            pricesStr.push(`${Number(override.price).toFixed(2)}`);
                          }
                          return (
                            <span key={override.country_code} className={styles.countryBadge} title={override.description}>
                              <Flag size={11} style={{ opacity: 0.8 }} />
                              <span>
                                {override.country_code}: {override.currency} ({pricesStr.join(', ')})
                              </span>
                            </span>
                          );
                        })
                      ) : !sub.is_global ? (
                        <span className={styles.countryBadge} style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.1)' }}>
                          No Countries Configured (Hidden)
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Operations (Edit / Delete) - Admin only */}
                  {isAdmin && (
                    <div className={styles.actions}>
                      <button
                        onClick={() => openEditModal(sub)}
                        className={styles.editBtn}
                        title="Edit package parameters"
                      >
                        <Edit2 size={14} />
                        <span>Edit Plan</span>
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id, sub.name)}
                        className={styles.deleteBtn}
                        title="Delete subscription"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Tabbed Configuration Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className={`${styles.modal} glassmorphism`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editId ? `Edit Plan: ${name}` : 'Create Subscription'}
              </h3>
              <button
                className={styles.closeBtn}
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Links Selector */}
            <div className={styles.tabsHeader}>
              <button
                type="button"
                className={`${styles.tabLink} ${activeTab === 'global' ? styles.tabLinkActive : ''}`}
                onClick={() => setActiveTab('global')}
              >
                Global Plan Configurations
              </button>
              <button
                type="button"
                className={`${styles.tabLink} ${activeTab === 'overrides' ? styles.tabLinkActive : ''}`}
                onClick={() => setActiveTab('overrides')}
              >
                Localized Country Overrides ({countries.length})
              </button>
            </div>

            {/* Tab Contents */}
            <div className={styles.modalBody}>
              {formError && (
                <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '6px', fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* TAB 1: GLOBAL CONFIGURATIONS */}
              {activeTab === 'global' && (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Subscription Service Name *</label>
                    <div className={styles.inputWithIcon}>
                      <FileText size={16} className={styles.inputIcon} />
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Netflix Premium"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Default Shared Price</label>
                    <div className={styles.inputWithIcon}>
                      <CreditCard size={16} className={styles.inputIcon} />
                      <input
                        type="number"
                        step="0.01"
                        className={styles.input}
                        placeholder="e.g. 4.99"
                        value={defaultSharedPrice}
                        onChange={(e) => setDefaultSharedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Default Private Price</label>
                    <div className={styles.inputWithIcon}>
                      <CreditCard size={16} className={styles.inputIcon} />
                      <input
                        type="number"
                        step="0.01"
                        className={styles.input}
                        placeholder="e.g. 15.99"
                        value={defaultPrivatePrice}
                        onChange={(e) => setDefaultPrivatePrice(e.target.value === '' ? '' : Number(e.target.value))}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Default Full Account Price</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div className={styles.inputWithIcon} style={{ flexGrow: 1 }}>
                        <CreditCard size={16} className={styles.inputIcon} />
                        <input
                          type="number"
                          step="0.01"
                          className={styles.input}
                          placeholder="e.g. 24.99"
                          value={defaultFullAccountPrice}
                          onChange={(e) => setDefaultFullAccountPrice(e.target.value === '' ? '' : Number(e.target.value))}
                          disabled={isSubmitting}
                        />
                      </div>
                      <select
                        className={styles.input}
                        value={defaultCurrency}
                        onChange={(e) => setDefaultCurrency(e.target.value)}
                        disabled={isSubmitting}
                        style={{ width: '100px' }}
                      >
                        {UNIQUE_CURRENCIES.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Shared Screen Description</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Specific description for Shared screen option (e.g. 1 profile access with PIN)..."
                      value={defaultSharedDescription}
                      onChange={(e) => setDefaultSharedDescription(e.target.value)}
                      disabled={isSubmitting}
                      style={{ minHeight: '60px' }}
                    />
                  </div>

                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Private Screen Description</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Specific description for Private screen option (e.g. Dedicated screen with full controls)..."
                      value={defaultPrivateDescription}
                      onChange={(e) => setDefaultPrivateDescription(e.target.value)}
                      disabled={isSubmitting}
                      style={{ minHeight: '60px' }}
                    />
                  </div>

                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Full Account Description</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Specific description for Full Account option (e.g. Entire 4-screen account with total admin credentials access)..."
                      value={defaultFullAccountDescription}
                      onChange={(e) => setDefaultFullAccountDescription(e.target.value)}
                      disabled={isSubmitting}
                      style={{ minHeight: '60px' }}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Service Brand Logo</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {logoUrl && (
                        <div className={styles.imagePreviewWrapper}>
                          <Image src={logoUrl} alt="Logo Preview" width={40} height={40} className={styles.imagePreview} />
                          <button
                            type="button"
                            className={styles.removeImageBtn}
                            onClick={() => setLogoUrl('')}
                            title="Remove image"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      <div style={{ flexGrow: 1, display: 'flex', gap: '8px' }}>
                        <div className={styles.inputWithIcon} style={{ flexGrow: 1 }}>
                          <Link2 size={16} className={styles.inputIcon} />
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="Image URL or upload file..."
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                        <label className={styles.uploadBtn}>
                          <Upload size={16} />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'logo')}
                            disabled={isSubmitting}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Card Cover Image</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {coverUrl && (
                        <div className={styles.imagePreviewWrapper}>
                          <Image src={coverUrl} alt="Cover Preview" width={60} height={34} className={styles.imagePreview} style={{ borderRadius: '4px', objectFit: 'cover' }} />
                          <button
                            type="button"
                            className={styles.removeImageBtn}
                            onClick={() => setCoverUrl('')}
                            title="Remove image"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      <div style={{ flexGrow: 1, display: 'flex', gap: '8px' }}>
                        <div className={styles.inputWithIcon} style={{ flexGrow: 1 }}>
                          <Link2 size={16} className={styles.inputIcon} />
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="Image URL or upload file..."
                            value={coverUrl}
                            onChange={(e) => setCoverUrl(e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                        <label className={styles.uploadBtn}>
                          <Upload size={16} />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'cover')}
                            disabled={isSubmitting}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Default Service Description (General Fallback) *</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Input description of package benefits, user accounts, and billing rules..."
                      value={defaultDescription}
                      onChange={(e) => setDefaultDescription(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  {/* Global Availability toggle */}
                  <div className={styles.formGroupFull}>
                    <div className={styles.toggleRow}>
                      <div className={styles.toggleLabel}>
                        <span className={styles.toggleTitle}>Enable Global Visibility</span>
                        <span className={styles.toggleDesc}>
                          If active, the plan is sold in all countries using default settings if no localized overrides are set. If deactivated, the plan is ONLY visible in allowed override countries.
                        </span>
                      </div>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={isGlobal}
                          onChange={(e) => setIsGlobal(e.target.checked)}
                          disabled={isSubmitting}
                        />
                        <span className={styles.slider} />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LOCALIZED COUNTRY OVERRIDES */}
              {activeTab === 'overrides' && (
                <div>
                  <div className={styles.overridesHeader}>
                    <span style={{ fontSize: '14.5px', color: 'var(--text-secondary)' }}>
                      Localize subscription descriptions, custom pricing rules, and currency codes per country.
                    </span>
                    <button
                      type="button"
                      className={styles.createBtn}
                      onClick={handleAddOverride}
                      disabled={isSubmitting}
                      style={{ padding: '8px 16px' }}
                    >
                      <Plus size={16} />
                      <span>Add Override</span>
                    </button>
                  </div>

                  {countries.length === 0 ? (
                    <div className={styles.emptyState} style={{ padding: '40px' }}>
                      <Globe2 size={32} />
                      <h3 className={styles.emptyTitle}>No Localized Overrides Set</h3>
                      <p className={styles.emptyDesc}>
                        This plan will default entirely to global configuration rules in all locations.
                      </p>
                    </div>
                  ) : (
                    /* Overrides Card List */
                    <div className={styles.overridesList}>
                      {countries.map((override, idx) => (
                        <div key={idx} className={styles.overrideCard}>
                          <div className={styles.overrideCardHeader}>
                            <div className={styles.overrideTitle}>
                              <Flag size={14} style={{ color: 'var(--accent-purple)' }} />
                              <span>Override Country Row #{idx + 1}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveOverride(idx)}
                              disabled={isSubmitting}
                              className={styles.deleteBtn}
                              style={{ width: '32px', height: '32px' }}
                              title="Delete row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className={styles.overrideGrid}>
                            {/* Country Selector */}
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Country Location *</label>
                              <SearchableCountrySelect
                                value={override.country_code}
                                onChange={(val) => handleOverrideChange(idx, 'country_code', val)}
                                disabled={isSubmitting}
                              />
                            </div>

                            {/* Local Shared Price */}
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Localized Shared Price</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <div className={styles.inputWithIcon} style={{ flexGrow: 1 }}>
                                  <CreditCard size={16} className={styles.inputIcon} />
                                  <input
                                    type="number"
                                    step="0.01"
                                    className={styles.input}
                                    placeholder="e.g. 5.99"
                                    value={override.shared_price !== undefined && override.shared_price !== null ? override.shared_price : ''}
                                    onChange={(e) => handleOverrideChange(idx, 'shared_price', e.target.value === '' ? '' : Number(e.target.value))}
                                    disabled={isSubmitting}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Local Private Price */}
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Localized Private Price</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <div className={styles.inputWithIcon} style={{ flexGrow: 1 }}>
                                  <CreditCard size={16} className={styles.inputIcon} />
                                  <input
                                    type="number"
                                    step="0.01"
                                    className={styles.input}
                                    placeholder="e.g. 17.99"
                                    value={override.private_price !== undefined && override.private_price !== null ? override.private_price : ''}
                                    onChange={(e) => handleOverrideChange(idx, 'private_price', e.target.value === '' ? '' : Number(e.target.value))}
                                    disabled={isSubmitting}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Local Full Account Price */}
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Localized Full Account Price</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <div className={styles.inputWithIcon} style={{ flexGrow: 1 }}>
                                  <CreditCard size={16} className={styles.inputIcon} />
                                  <input
                                    type="number"
                                    step="0.01"
                                    className={styles.input}
                                    placeholder="e.g. 29.99"
                                    value={override.full_account_price !== undefined && override.full_account_price !== null ? override.full_account_price : ''}
                                    onChange={(e) => handleOverrideChange(idx, 'full_account_price', e.target.value === '' ? '' : Number(e.target.value))}
                                    disabled={isSubmitting}
                                  />
                                </div>
                                <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--border-radius-sm)', fontSize: '13.5px', fontWeight: 600 }}>
                                  {override.currency}
                                </span>
                              </div>
                            </div>

                            {/* Visibility check */}
                            <div className={styles.formGroup}>
                              <label className={styles.label}>Visible in Country? *</label>
                              <div className={styles.toggleRow} style={{ padding: '8px 12px', marginTop: 0, height: '42px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Allowed</span>
                                <label className={styles.switch}>
                                  <input
                                    type="checkbox"
                                    checked={override.is_visible}
                                    onChange={(e) => handleOverrideChange(idx, 'is_visible', e.target.checked)}
                                    disabled={isSubmitting}
                                  />
                                  <span className={styles.slider} />
                                </label>
                              </div>
                            </div>

                            {/* Local Shared Description */}
                            <div className={styles.formGroupFull}>
                              <label className={styles.label}>Localized Shared Description</label>
                              <textarea
                                className={styles.textarea}
                                rows={2}
                                placeholder="Localized description for Shared option..."
                                value={override.shared_description || ''}
                                onChange={(e) => handleOverrideChange(idx, 'shared_description', e.target.value)}
                                disabled={isSubmitting}
                                style={{ minHeight: '50px' }}
                              />
                            </div>

                            {/* Local Private Description */}
                            <div className={styles.formGroupFull}>
                              <label className={styles.label}>Localized Private Description</label>
                              <textarea
                                className={styles.textarea}
                                rows={2}
                                placeholder="Localized description for Private option..."
                                value={override.private_description || ''}
                                onChange={(e) => handleOverrideChange(idx, 'private_description', e.target.value)}
                                disabled={isSubmitting}
                                style={{ minHeight: '50px' }}
                              />
                            </div>

                            {/* Local Full Account Description */}
                            <div className={styles.formGroupFull}>
                              <label className={styles.label}>Localized Full Account Description</label>
                              <textarea
                                className={styles.textarea}
                                rows={2}
                                placeholder="Localized description for Full Account option..."
                                value={override.full_account_description || ''}
                                onChange={(e) => handleOverrideChange(idx, 'full_account_description', e.target.value)}
                                disabled={isSubmitting}
                                style={{ minHeight: '50px' }}
                              />
                            </div>

                            {/* Local Description Fallback */}
                            <div className={styles.formGroupFull}>
                              <label className={styles.label}>Localized Main Description (Fallback) *</label>
                              <textarea
                                className={styles.textarea}
                                rows={2}
                                placeholder="Localized plan benefits and tax rules translation for this country..."
                                value={override.description}
                                onChange={(e) => handleOverrideChange(idx, 'description', e.target.value)}
                                disabled={isSubmitting}
                                required
                                style={{ minHeight: '60px' }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className={styles.spinner} size={16} />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
