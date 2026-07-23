'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquareQuote,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  Check,
  Zap,
} from 'lucide-react';
import { useDashboard } from '../layout';

interface QuickReply {
  id: number;
  shortcut: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function QuickRepliesPage() {
  const { user: currentUser, isLoading: userLoading } = useDashboard();

  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    shortcut: '',
    title: '',
    content: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch quick replies
  const fetchQuickReplies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/quick-replies');
      if (!response.ok) throw new Error('Failed to load quick replies.');
      const data = await response.json();
      setReplies(data.quick_replies || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setErrorMsg('Failed to load quick replies.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && (currentUser.role === 'admin' || currentUser.permissions?.chat)) {
      fetchQuickReplies();
    }
  }, [currentUser]);

  // Open modal for creation
  const handleOpenCreateModal = () => {
    setEditingReply(null);
    setFormData({ shortcut: '', title: '', content: '' });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (reply: QuickReply) => {
    setEditingReply(reply);
    setFormData({
      shortcut: reply.shortcut,
      title: reply.title,
      content: reply.content,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const isEdit = Boolean(editingReply);
      const url = isEdit ? `/api/quick-replies/${editingReply!.id}` : '/api/quick-replies';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Operation failed.');
      }

      setSuccessMsg(isEdit ? 'Quick reply updated successfully!' : 'Quick reply created successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setIsModalOpen(false);
      fetchQuickReplies();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save quick reply.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handler
  const handleDeleteReply = async (id: number, shortcut: string) => {
    if (!confirm(`Are you sure you want to delete quick reply /${shortcut}?`)) return;

    try {
      const res = await fetch(`/api/quick-replies/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete.');

      setSuccessMsg(`Quick reply /${shortcut} deleted.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchQuickReplies();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete quick reply.');
    }
  };

  if (userLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <Loader2 size={32} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (currentUser && currentUser.role !== 'admin' && !currentUser.permissions?.chat) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px', gap: '16px', background: '#ffffff', minHeight: 'calc(100vh - 80px)' }}>
        <AlertCircle size={48} color="#ef4444" />
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Access Denied</h2>
        <p style={{ color: '#64748b', fontSize: '14.5px', maxWidth: '360px', textAlign: 'center' }}>
          You do not have permission to manage chat quick replies.
        </p>
      </div>
    );
  }

  const filteredReplies = replies.filter(
    (r) =>
      r.shortcut.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquareQuote size={28} color="#8b5cf6" />
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>
              Chat Quick Replies
            </h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '6px', margin: 0 }}>
            Create and manage slash commands (e.g. <code>/greeting</code>) to instantly insert canned messages in live support chats.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#8b5cf6',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
              transition: 'transform 0.15s ease',
            }}
          >
            <Plus size={18} />
            <span>Add New Quick Reply</span>
          </button>
        )}
      </div>

      {/* Info Tip Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(192, 132, 252, 0.08) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
        }}
      >
        <Zap size={20} color="#8b5cf6" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '13.5px', color: '#374151', lineHeight: '1.5' }}>
          <strong>How to use in Live Support Chat:</strong> Type <code>/</code> into the reply message box in the Support Console. A menu will appear displaying matching shortcuts. Press <kbd style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>Tab</kbd> or <kbd style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>Enter</kbd> to insert the response immediately into your chat box.
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search Filter Bar */}
      <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '420px' }}>
        <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Search by shortcut name, title or message..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px 10px 40px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            background: '#ffffff',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          }}
        />
      </div>

      {/* Quick Replies Cards Grid */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          <Loader2 size={24} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
          <div>Loading quick replies...</div>
        </div>
      ) : filteredReplies.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
          <MessageSquareQuote size={40} color="#d1d5db" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: '0 0 6px 0' }}>
            No Quick Replies Found
          </h3>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
            {searchQuery ? 'No shortcuts match your search query.' : 'Click "Add New Quick Reply" to create your first chat shortcut.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredReplies.map((reply) => (
            <div
              key={reply.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'box-shadow 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span
                    style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      color: '#7c3aed',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      fontSize: '13.5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                    }}
                  >
                    /{reply.shortcut}
                  </span>
                  
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEditModal(reply)}
                        title="Edit quick reply"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#4b5563',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteReply(reply.id, reply.shortcut)}
                        title="Delete quick reply"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
                  {reply.title}
                </h3>

                <p style={{ fontSize: '13.5px', color: '#4b5563', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {reply.content}
                </p>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f3f4f6', fontSize: '11.5px', color: '#9ca3af' }}>
                Updated {new Date(reply.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Create / Edit */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                {editingReply ? 'Edit Quick Reply' : 'Create New Quick Reply'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitForm} style={{ padding: '24px' }}>
              {errorMsg && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13.5px', marginBottom: '16px' }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Shortcut Command *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#8b5cf6' }}>/</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. greeting, receipt, close"
                    value={formData.shortcut}
                    onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/^\/+/, '') })}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 28px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
                <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  Staff will trigger this reply by typing <code>/{formData.shortcut || 'shortcut'}</code> in the chat input.
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Greeting"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Message Response Content *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter the full response message..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#8b5cf6',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'Saving...' : editingReply ? 'Update Quick Reply' : 'Save Quick Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
