'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import styles from './payments.module.css';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Save,
  Globe,
  Flag,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { COUNTRIES } from '../../../lib/countries';
import SearchableCountrySelect from '../../../components/SearchableCountrySelect';

interface PaymentField {
  label: string;
  value: string;
}

interface PaymentMethodCountry {
  id: number;
  payment_method_id: number;
  country_code: string;
  created_at: string;
}

interface PaymentMethod {
  id: number;
  name: string;
  type: 'stripe' | 'paypal' | 'bank' | 'custom';
  instructions: string;
  fields: string; // JSON String of PaymentField[]
  is_global: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  countries: PaymentMethodCountry[];
}

export default function PaymentsPage() {
  const { user: currentUser } = useDashboard();
  const isAdmin = currentUser?.role === 'admin';

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'stripe' | 'paypal' | 'bank' | 'custom'>('stripe');
  const [instructions, setInstructions] = useState('');
  const [isGlobal, setIsGlobal] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [dynamicFields, setDynamicFields] = useState<PaymentField[]>([]);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch payment methods
  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/payments');
      if (!response.ok) {
        throw new Error('Failed to load payment methods.');
      }
      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin' || currentUser?.permissions?.payments) {
      fetchPaymentMethods();
    }
  }, [currentUser]);

  // Apply predefined template fields when type changes
  const applyPresetFields = (selectedType: 'stripe' | 'paypal' | 'bank' | 'custom') => {
    if (selectedType === 'stripe' || selectedType === 'paypal') {
      setDynamicFields([{ label: 'Email Address', value: '' }]);
    } else if (selectedType === 'bank') {
      setDynamicFields([
        { label: 'Bank Name', value: '' },
        { label: 'Account Title', value: '' },
        { label: 'Account Number', value: '' },
        { label: 'Swift Code', value: '' },
      ]);
    } else {
      setDynamicFields([]);
    }
  };

  const handleTypeChange = (newType: 'stripe' | 'paypal' | 'bank' | 'custom') => {
    setType(newType);
    applyPresetFields(newType);
  };

  // Open modal for Create
  const openCreateModal = () => {
    setEditId(null);
    setName('');
    setType('stripe');
    setInstructions('');
    setIsGlobal(true);
    setIsActive(true);
    setSelectedCountries([]);
    setDynamicFields([{ label: 'Email Address', value: '' }]);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const openEditModal = (method: PaymentMethod) => {
    setEditId(method.id);
    setName(method.name);
    setType(method.type);
    setInstructions(method.instructions);
    setIsGlobal(method.is_global);
    setIsActive(method.is_active);
    setSelectedCountries(method.countries.map((c) => c.country_code));
    
    try {
      setDynamicFields(JSON.parse(method.fields));
    } catch {
      setDynamicFields([]);
    }
    
    setFormError(null);
    setIsModalOpen(true);
  };

  // Dynamic fields manipulation
  const handleAddField = () => {
    setDynamicFields([...dynamicFields, { label: '', value: '' }]);
  };

  const handleRemoveField = (index: number) => {
    setDynamicFields(dynamicFields.filter((_, idx) => idx !== index));
  };

  const handleFieldChange = (index: number, key: 'label' | 'value', val: string) => {
    const updated = [...dynamicFields];
    updated[index][key] = val;
    setDynamicFields(updated);
  };

  // Toggle active status directly
  const handleToggleActive = async (method: PaymentMethod) => {
    const originalActive = method.is_active;
    const updatedMethods = paymentMethods.map((m) =>
      m.id === method.id ? { ...m, is_active: !originalActive } : m
    );
    setPaymentMethods(updatedMethods);

    try {
      const response = await fetch('/api/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: method.id,
          is_active: !originalActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status.');
      }
    } catch (error) {
      console.error('Error toggling payment status:', error);
      // Rollback
      setPaymentMethods(paymentMethods.map((m) => (m.id === method.id ? method : m)));
      alert('Error updating status: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Delete payment method
  const handleDelete = async (id: number, methodName: string) => {
    if (!confirm(`Are you sure you want to delete the payment method "${methodName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/payments?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete payment method.');
      }

      setPaymentMethods(paymentMethods.filter((m) => m.id !== id));
    } catch (error) {
      console.error('Error deleting payment method:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Form Submit (Save / Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }

    if (!isGlobal && selectedCountries.length === 0) {
      setFormError('Please select at least one country or enable global access.');
      return;
    }

    // Filter out blank custom fields
    const validatedFields = dynamicFields.filter((f) => f.label.trim() !== '');

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      id: editId,
      name,
      type,
      instructions,
      is_global: isGlobal,
      is_active: isActive,
      fields: validatedFields,
      countries: isGlobal ? [] : selectedCountries,
    };

    try {
      const method = editId ? 'PUT' : 'POST';
      const response = await fetch('/api/payments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save payment method.');
      }

      if (editId) {
        setPaymentMethods(paymentMethods.map((m) => (m.id === editId ? data.paymentMethod : m)));
      } else {
        setPaymentMethods([data.paymentMethod, ...paymentMethods]);
      }

      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter payment methods based on search query
  const filteredMethods = paymentMethods.filter((method) =>
    method.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (currentUser?.role !== 'admin' && !currentUser?.permissions?.payments) {
    return (
      <div className={styles.emptyState}>
        <AlertTriangle size={48} style={{ color: 'var(--danger)' }} />
        <h3 className={styles.emptyTitle}>Access Denied</h3>
        <p className={styles.emptyDesc}>
          Only system administrators or staff members with payments access can configure payments.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="animate-fade-in">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Payment Options Manager</h1>
            <p className={styles.subtitle}>
              Configure and scope manual payment details (bank accounts, PayPal emails, etc.) for subscriber checkouts.
            </p>
          </div>
          {isAdmin && (
            <button className={styles.createBtn} onClick={openCreateModal}>
              <Plus size={18} />
              <span>Add Payment Option</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className={styles.searchBar}>
          <input
            type="text"
            className={styles.input}
            placeholder="Search payment methods by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: '440px' }}
          />
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Loader2 className={styles.spinner} size={30} color="#8b5cf6" />
          </div>
        ) : filteredMethods.length === 0 ? (
          <div className={styles.emptyState}>
            <Wallet size={40} />
            <h3 className={styles.emptyTitle}>No Payment Options Configured</h3>
            <p className={styles.emptyDesc}>
              {searchQuery ? 'No payment methods match your query.' : 'Configure bank transfer details or Stripe/PayPal email accounts to accept subscriber screenshot verify files.'}
            </p>
          </div>
        ) : (
          /* Payment Methods Grid */
          <div className={styles.grid}>
            {filteredMethods.map((method) => {
              let fieldsParsed: PaymentField[] = [];
              try {
                fieldsParsed = JSON.parse(method.fields);
              } catch {
                fieldsParsed = [];
              }

              return (
                <div key={method.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{method.name}</h3>
                    <div className={styles.cardBadges}>
                      <span className={`${styles.badge} ${styles.badgePurple}`}>
                        {method.type}
                      </span>
                      {method.is_global ? (
                        <span className={`${styles.badge} ${styles.badgeSuccess}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Globe size={11} />
                          <span>Global</span>
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeMuted}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Flag size={11} />
                          <span>Scoped ({method.countries.length})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Display fields list */}
                  {fieldsParsed.length > 0 && (
                    <div className={styles.cardFieldsList}>
                      {fieldsParsed.map((f, i) => (
                        <div key={i} className={styles.fieldRow}>
                          <span className={styles.fieldLabel}>{f.label}:</span>
                          <span className={styles.fieldValue}>{f.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Display instructions */}
                  {method.instructions && (
                    <p className={styles.instructionsText} title={method.instructions}>
                      {method.instructions}
                    </p>
                  )}

                  {/* Scoped Countries List Badges */}
                  {!method.is_global && method.countries.length > 0 && (
                    <div className={styles.countryBadgeList}>
                      {method.countries.map((c) => {
                        const countryMeta = COUNTRIES.find((x) => x.code === c.country_code);
                        return (
                          <span key={c.id} className={styles.countryBadge} title={countryMeta?.name}>
                            {c.country_code}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className={styles.divider} />

                  <div className={styles.cardFooter}>
                    {/* Active/Inactive Switch Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={method.is_active}
                          onChange={() => handleToggleActive(method)}
                          disabled={!isAdmin}
                        />
                        <span className={styles.slider} />
                      </label>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: method.is_active ? 'var(--success)' : 'var(--text-secondary)' }}>
                        {method.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    {/* Actions */}
                    {isAdmin && (
                      <div className={styles.actions}>
                        <button
                          className={styles.iconBtn}
                          onClick={() => openEditModal(method)}
                          title="Edit payment method"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className={`${styles.iconBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDelete(method.id, method.name)}
                          title="Delete payment method"
                        >
                          <Trash2 size={15} />
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

      {/* Dynamic Modal Dialog */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editId ? 'Edit Payment Option' : 'Add Payment Option'}
              </h3>
              <button
                className={styles.closeBtn}
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', margin: '16px 24px 0 24px', borderRadius: '6px', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
              <div className={styles.modalBody}>
                {/* Method Name */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Method Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. PayPal Hub, Bank Transfer (Egypt)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                {/* Predefined Layout Selector */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Payment Layout Format</label>
                  <select
                    className={styles.input}
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as 'stripe' | 'paypal' | 'bank' | 'custom')}
                    disabled={isSubmitting}
                  >
                    <option value="stripe">Stripe Email Format</option>
                    <option value="paypal">PayPal Email Format</option>
                    <option value="bank">Bank Account details Format</option>
                    <option value="custom">Custom Format</option>
                  </select>
                </div>

                {/* Dynamic Field List Builder */}
                <div className={styles.formGroup}>
                  <div className={styles.fieldBuilderHeader}>
                    <span className={styles.label}>Payment Detail Fields</span>
                    <button
                      type="button"
                      className={styles.addFieldBtn}
                      onClick={handleAddField}
                      disabled={isSubmitting}
                    >
                      <Plus size={14} />
                      <span>Add Custom Field</span>
                    </button>
                  </div>

                  <div className={styles.fieldsContainer}>
                    {dynamicFields.length === 0 ? (
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', display: 'block', padding: '10px 0' }}>
                        No fields defined yet. Click &quot;Add Custom Field&quot; to write credentials/keys.
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {dynamicFields.map((field, idx) => (
                          <div key={idx} className={styles.dynamicFieldRow}>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="Field Name (e.g. Account Number)"
                              value={field.label}
                              onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                              disabled={isSubmitting}
                              required
                              style={{ flex: 1 }}
                            />
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="Value (e.g. 1204-556-990)"
                              value={field.value}
                              onChange={(e) => handleFieldChange(idx, 'value', e.target.value)}
                              disabled={isSubmitting}
                              required
                              style={{ flex: 2 }}
                            />
                            <button
                              type="button"
                              className={styles.removeFieldBtn}
                              onClick={() => handleRemoveField(idx)}
                              disabled={isSubmitting}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions Text Area */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Payment Instructions / Guidelines</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Enter instructions for the customer (e.g. Please transfer the amount and upload screenshot of the receipt showing transaction ID)."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Availability Scope */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Availability Scope</label>
                  <div className={styles.scopeSelector}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="scope"
                        checked={isGlobal}
                        onChange={() => setIsGlobal(true)}
                        disabled={isSubmitting}
                      />
                      <span>Global</span>
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="scope"
                        checked={!isGlobal}
                        onChange={() => setIsGlobal(false)}
                        disabled={isSubmitting}
                      />
                      <span>Specific Countries</span>
                    </label>
                  </div>

                  {/* Countries Checkbox List */}
                  {!isGlobal && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <SearchableCountrySelect
                        value=""
                        onChange={(val) => {
                          if (val && !selectedCountries.includes(val)) {
                            setSelectedCountries([...selectedCountries, val]);
                          }
                        }}
                        disabled={isSubmitting}
                        placeholder="Add country by name or code..."
                      />

                      {/* Selected Countries Badges */}
                      {selectedCountries.length > 0 && (
                        <div className={styles.countryBadgeList} style={{ marginTop: '4px' }}>
                          {selectedCountries.map((code) => {
                            const countryMeta = COUNTRIES.find((x) => x.code === code);
                            return (
                              <span key={code} className={styles.countryBadge} style={{ padding: '6px 10px', fontSize: '12px' }}>
                                {countryMeta?.name} ({code})
                                <button
                                  type="button"
                                  onClick={() => setSelectedCountries(selectedCountries.filter((c) => c !== code))}
                                  disabled={isSubmitting}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--danger)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '2px',
                                    marginLeft: '4px'
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className={styles.spinner} size={16} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{editId ? 'Save Changes' : 'Create Option'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
