'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '../layout';
import styles from './staff.module.css';
import { Plus, Trash2, X, Loader2, ShieldCheck, UserCheck, ShieldAlert, Key } from 'lucide-react';

interface StaffPermissions {
  subscriptions: boolean;
  analytics: boolean;
  settings: boolean;
}

interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: 'staff';
  permissions: StaffPermissions;
  created_at: string;
}

export default function StaffPage() {
  const { user: currentUser } = useDashboard();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New staff form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch staff list
  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to load staff list.');
      const data = await response.json();
      setStaffList(data.staff);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchStaff();
    }
  }, [currentUser]);

  // Handle permission toggle with optimistic update and rollback
  const handlePermissionToggle = async (staffId: number, permissionKey: keyof StaffPermissions) => {
    // Find member
    const memberIndex = staffList.findIndex((s) => s.id === staffId);
    if (memberIndex === -1) return;

    const member = staffList[memberIndex];
    const previousPermissions = { ...member.permissions };
    const updatedPermissions = {
      ...member.permissions,
      [permissionKey]: !member.permissions[permissionKey],
    };

    // Optimistic Update
    const updatedList = [...staffList];
    updatedList[memberIndex] = {
      ...member,
      permissions: updatedPermissions,
    };
    setStaffList(updatedList);

    try {
      const response = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: staffId,
          permissions: updatedPermissions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update permissions.');
      }
    } catch (error) {
      console.error('Error updating staff permission:', error);
      // Rollback on error
      const rollbackList = [...staffList];
      rollbackList[memberIndex] = {
        ...member,
        permissions: previousPermissions,
      };
      setStaffList(rollbackList);
      alert('Error updating permissions: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Handle staff creation
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) {
      setFormError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          permissions: {
            subscriptions: true, // Default to true as they need to manage subscription sellings
            analytics: false,
            settings: false,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create staff member.');
      }

      // Add to list and close modal
      setStaffList([data.staff, ...staffList]);
      setIsModalOpen(false);
      
      // Reset form
      setNewName('');
      setNewEmail('');
      setNewPassword('');
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle staff deletion
  const handleDeleteStaff = async (staffId: number, staffName: string) => {
    if (!confirm(`Are you sure you want to remove ${staffName} from staff members?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/staff?id=${staffId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete staff member.');
      }

      setStaffList(staffList.filter((s) => s.id !== staffId));
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className={styles.emptyState}>
        <ShieldAlert size={48} style={{ color: 'var(--danger)' }} />
        <h3 className={styles.emptyTitle}>Access Denied</h3>
        <p className={styles.emptyDesc}>
          Only system administrators have permissions to view or configure staff roles and security permissions.
        </p>
      </div>
    );
  }

  // Filter staff list based on search
  const filteredStaff = staffList.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className={styles.headerSection}>
        <div className={styles.titleWrapper}>
          <h1 className={styles.title}>Staff Access Management</h1>
          <p className={styles.description}>
            Create new staff accounts and customize their active dashboard section access keys dynamically.
          </p>
        </div>
        <button className={styles.addBtn} onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Search Filter Bar */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          className={styles.input}
          placeholder="Search staff by name or email address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className={styles.spinner} size={30} color="#8b5cf6" />
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className={styles.emptyState}>
          <UserCheck size={40} />
          <h3 className={styles.emptyTitle}>No Staff Members Found</h3>
          <p className={styles.emptyDesc}>
            {searchQuery ? 'No staff matched your query.' : 'Add your first staff member to distribute system operations.'}
          </p>
        </div>
      ) : (
        /* Staff Cards Grid */
        <div className={styles.grid}>
          {filteredStaff.map((member) => (
            <div key={member.id} className={`${styles.card} glassmorphism`}>
              <div className={styles.cardHeader}>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.userDetails}>
                    <span className={styles.userName}>{member.name}</span>
                    <span className={styles.userEmail}>{member.email}</span>
                  </div>
                </div>
                <div className={styles.actionMenu}>
                  <button
                    onClick={() => handleDeleteStaff(member.id, member.name)}
                    className={`${styles.iconBtn} ${styles.deleteBtn}`}
                    title="Remove staff member"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className={styles.divider} />

              {/* Dynamic Permissions Access Keys */}
              <div className={styles.permissionsSection}>
                <span className={styles.permTitle}>Dashboard Access Keys</span>
                
                {/* Subscriptions Access */}
                <div className={styles.permRow}>
                  <div className={styles.permLabel}>
                    <span className={styles.permName}>Subscriptions View</span>
                    <span className={styles.permDesc}>Browse subscribers and selling details</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={member.permissions.subscriptions}
                      onChange={() => handlePermissionToggle(member.id, 'subscriptions')}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                {/* Analytics Access */}
                <div className={styles.permRow}>
                  <div className={styles.permLabel}>
                    <span className={styles.permName}>Analytics Panel</span>
                    <span className={styles.permDesc}>View income charts & regional reports</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={member.permissions.analytics}
                      onChange={() => handlePermissionToggle(member.id, 'analytics')}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>

                {/* Settings Access */}
                <div className={styles.permRow}>
                  <div className={styles.permLabel}>
                    <span className={styles.permName}>System Settings</span>
                    <span className={styles.permDesc}>Update configs and tax modules</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={member.permissions.settings}
                      onChange={() => handlePermissionToggle(member.id, 'settings')}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className={`${styles.modal} glassmorphism`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Staff Member</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '6px', fontSize: '13.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Email Address</label>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="e.g. john@premiumhub.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Password</label>
                <input
                  type="password"
                  className={styles.input}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                  minLength={6}
                  required
                />
              </div>

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
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
