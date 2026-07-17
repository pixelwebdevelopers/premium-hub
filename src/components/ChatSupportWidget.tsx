'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import styles from './ChatSupportWidget.module.css';

interface Message {
  id: number;
  session_id: number;
  sender_type: 'customer' | 'staff';
  sender_name: string;
  message: string;
  created_at: string;
}

// Client-side Web Audio API notification chime
function playChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play a soft high-pitched notification alert
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
        gain2.gain.setValueAtTime(0.1, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.3);
      } catch {
        // Omit unused error param
      }
    }, 100);
  } catch (error) {
    console.warn('Audio chime failed:', error);
  }
}

export default function ChatSupportWidget() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Widget visibility
  const [isOpen, setIsOpen] = useState(false);

  // Chat states
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'waiting' | 'active' | 'closed'>('idle');
  const [queuePosition, setQueuePosition] = useState(0);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Input forms state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [initialMsg, setInitialMsg] = useState('');
  const [replyText, setReplyText] = useState('');

  // Submit triggers
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Refs
  const lastMessageIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const tokenRef = useRef<string | null>(null);
  const isOpenRef = useRef(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          if (data.user && data.user.role === 'customer') {
            setCustomerName(data.user.name);
            setCustomerEmail(data.user.email);
          }
        }
      } catch (err) {
        console.error('Error fetching user for chat widget:', err);
      }
    }
    fetchUser();
  }, []);

  // Synchronize token and open status to avoid closures in intervals
  useEffect(() => {
    tokenRef.current = sessionToken;
  }, [sessionToken]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Load chat session from local storage on mount
  useEffect(() => {
    const token = localStorage.getItem('premium_hub_chat_token');
    const storedStatus = localStorage.getItem('premium_hub_chat_status');
    
    if (token) {
      setSessionToken(token);
      setStatus((storedStatus as 'waiting' | 'active' | 'closed') || 'waiting');
    }
  }, []);

  // Poll for message updates (every 2 seconds)
  useEffect(() => {
    const pollUpdates = async () => {
      const currentToken = tokenRef.current;
      if (!currentToken || status === 'closed') return;

      try {
        const url = `/api/chat/session/poll?token=${currentToken}&last_message_id=${lastMessageIdRef.current}`;
        const response = await fetch(url);
        if (!response.ok) {
          // If 404, session might have been purged, reset locally
          if (response.status === 404) {
            localStorage.removeItem('premium_hub_chat_token');
            localStorage.removeItem('premium_hub_chat_status');
            setSessionToken(null);
            setStatus('idle');
            setMessages([]);
            lastMessageIdRef.current = 0;
          }
          return;
        }

        const data = await response.json();
        setStatus(data.status);
        localStorage.setItem('premium_hub_chat_status', data.status);
        setQueuePosition(data.queue_position);
        setAgentName(data.agent_name);

        if (data.messages && data.messages.length > 0) {
          // Play chime & increment unread if message was sent by staff
          const hasNewStaffMsg = data.messages.some(
            (m: Message) => m.sender_type === 'staff' && m.sender_name !== 'System'
          );

          if (hasNewStaffMsg) {
            playChime();
            if (!isOpenRef.current) {
              setUnreadCount((c) => c + data.messages.length);
            }
          }

          setMessages((prev) => [...prev, ...data.messages]);
          
          const maxId = Math.max(...data.messages.map((m: Message) => m.id));
          lastMessageIdRef.current = maxId;
        }
      } catch (error) {
        console.error('Customer chat poll error:', error);
      }
    };

    let interval: any;
    if (sessionToken && status !== 'closed') {
      pollUpdates(); // Initial fetch
      interval = setInterval(pollUpdates, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionToken, status]);

  // Handle starting a new chat
  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !initialMsg.trim() || isStartingChat) return;

    setIsStartingChat(true);

    try {
      const response = await fetch('/api/chat/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || null,
          message: initialMsg.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to connect to support.');
        return;
      }

      localStorage.setItem('premium_hub_chat_token', data.session_token);
      localStorage.setItem('premium_hub_chat_status', data.status);

      setSessionToken(data.session_token);
      setStatus(data.status);
      setAgentName(data.agent_name);
      
      // Seed first customer message locally
      setMessages([
        {
          id: 1,
          session_id: data.session_id,
          sender_type: 'customer',
          sender_name: customerName.trim(),
          message: initialMsg.trim(),
          created_at: new Date().toISOString(),
        },
      ]);
      lastMessageIdRef.current = 1;
    } catch (error) {
      console.error('Start support session error:', error);
      alert('Failed to connect to chat support. Please retry.');
    } finally {
      setIsStartingChat(false);
    }
  };

  // Handle sending reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !sessionToken || isSendingReply) return;

    const messageContent = replyText.trim();
    setReplyText('');
    setIsSendingReply(true);

    try {
      const response = await fetch('/api/chat/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: sessionToken,
          message: messageContent,
          sender_type: 'customer',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to deliver reply.');
      }

      // Refresh messages instantly after sending
      const pollUrl = `/api/chat/session/poll?token=${sessionToken}&last_message_id=${lastMessageIdRef.current}`;
      const pollResp = await fetch(pollUrl);
      if (pollResp.ok) {
        const pollData = await pollResp.json();
        if (pollData.messages && pollData.messages.length > 0) {
          setMessages((prev) => [...prev, ...pollData.messages]);
          const maxId = Math.max(...pollData.messages.map((m: Message) => m.id));
          lastMessageIdRef.current = maxId;
        }
      }
    } catch (error) {
      console.error('Deliver message error:', error);
      alert('Message failed to deliver. Please retry.');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Close/End Chat session
  const handleCancelChat = async () => {
    const currentToken = sessionToken;
    if (!currentToken) return;
    if (!confirm('Are you sure you want to end this chat support session?')) return;

    try {
      await fetch('/api/chat/session/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: currentToken }),
      });
    } catch (err) {
      console.error('Close session error:', err);
    }

    localStorage.removeItem('premium_hub_chat_token');
    localStorage.removeItem('premium_hub_chat_status');
    
    setSessionToken(null);
    setStatus('idle');
    setMessages([]);
    setAgentName(null);
    setQueuePosition(0);
    lastMessageIdRef.current = 0;
    setInitialMsg('');
  };

  if (pathname === '/login' || (currentUser && currentUser.role !== 'customer')) {
    return null;
  }

  return (
    <div className={styles.widgetContainer}>
      {/* Floating Circle Button */}
      <button className={styles.triggerBtn} onClick={handleToggleOpen} aria-label="Toggle chat support widget">
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {unreadCount > 0 && <span className={styles.badgeCount}>{unreadCount}</span>}
      </button>

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className={styles.dialogWindow}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <div className={styles.pulseDot} />
              <span>Live Chat Support</span>
            </div>
            <button className={styles.closeHeaderBtn} onClick={() => setIsOpen(false)} aria-label="Close support overlay">
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className={styles.bodyContent}>
            {status === 'idle' ? (
              /* Idle state: show form to register name and initial message */
              <form onSubmit={handleStartChat} className={styles.form}>
                <div>
                  <label className={styles.formLabel}>Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    className={styles.input}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={styles.formLabel}>Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    className={styles.input}
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className={styles.formLabel}>How can we help you? *</label>
                  <textarea
                    required
                    placeholder="Type your question..."
                    className={`${styles.input} ${styles.textarea}`}
                    value={initialMsg}
                    onChange={(e) => setInitialMsg(e.target.value)}
                  />
                </div>
                <button type="submit" className={styles.startBtn} disabled={isStartingChat}>
                  {isStartingChat ? 'Connecting...' : 'Start Conversation'}
                </button>
              </form>
            ) : status === 'waiting' ? (
              /* Waiting state: show queue number and animation spinner */
              <div className={styles.waitingScreen}>
                <Loader2 className={styles.spinner} size={36} color="#8b5cf6" />
                <span className={styles.waitingTitle}>Connecting to Agent...</span>
                <p className={styles.waitingDesc}>
                  {queuePosition > 0 
                    ? `You are currently number #${queuePosition} in the support queue. Please hold.` 
                    : 'Searching for an available support agent. Please wait.'
                  }
                </p>
                <button onClick={handleCancelChat} className={styles.cancelSessionBtn}>
                  Cancel Chat Request
                </button>
              </div>
            ) : (
              /* Active/Closed state: show full chat stream */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                  
                  {agentName && (
                    <div style={{ fontSize: '11px', color: '#c084fc', textAlign: 'center', background: 'rgba(192, 132, 252, 0.05)', padding: '6px', borderRadius: '6px', marginBottom: '8px' }}>
                      Support Agent <strong>{agentName}</strong> is handling this chat.
                    </div>
                  )}

                  {messages.map((msg) => {
                    let rowClass = styles.msgRowStaff;
                    let bubbleClass = styles.bubbleStaff;

                    if (msg.sender_name === 'System') {
                      rowClass = styles.msgRowSystem;
                      bubbleClass = styles.bubbleSystem;
                    } else if (msg.sender_type === 'customer') {
                      rowClass = styles.msgRowCustomer;
                      bubbleClass = styles.bubbleCustomer;
                    }

                    return (
                      <div key={msg.id} className={`${styles.msgRow} ${rowClass}`}>
                        <div className={`${styles.bubble} ${bubbleClass}`}>
                          {msg.sender_name !== 'System' && (
                            <span className={styles.bubbleSender}>{msg.sender_name}</span>
                          )}
                          {msg.message}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar for Active Chat */}
          {status !== 'idle' && status !== 'waiting' && (
            <div className={styles.footerBar}>
              {status === 'active' ? (
                <form onSubmit={handleSendReply} style={{ display: 'flex', width: '100%', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Type message here..."
                    className={styles.footerInput}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isSendingReply}
                  />
                  <button type="submit" className={styles.sendBtn} disabled={!replyText.trim() || isSendingReply}>
                    <Send size={14} />
                  </button>
                  <button type="button" onClick={handleCancelChat} className={styles.cancelSessionBtn} style={{ padding: '0 10px' }} title="Close support chat">
                    X
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', width: '100%', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#71717a', fontStyle: 'italic' }}>Support session has ended.</span>
                  <button onClick={handleCancelChat} className={styles.startBtn} style={{ width: '100%', padding: '6px 12px', fontSize: '12px', margin: 0 }}>
                    Start New Support Session
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
