'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, X, Send, Loader2, Paperclip, Mic, Square, Download } from 'lucide-react';
import styles from './ChatSupportWidget.module.css';
import { uploadChatFile } from '../lib/firebase';

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
  const [trackingId, setTrackingId] = useState('');
  const [initialMsg, setInitialMsg] = useState('');
  const [replyText, setReplyText] = useState('');

  // Submit triggers
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Refs
  const lastMessageIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const tokenRef = useRef<string | null>(null);
  const isOpenRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      if (!currentToken) return;

      try {
        const pollUrl = `/api/chat/session/poll?token=${currentToken}&last_message_id=${lastMessageIdRef.current}`;
        const response = await fetch(pollUrl);
        if (!response.ok) return;

        const data = await response.json();

        if (data.status) {
          setStatus(data.status);
          localStorage.setItem('premium_hub_chat_status', data.status);
        }

        if (data.agent_name) {
          setAgentName(data.agent_name);
        }

        if (data.queue_position !== undefined) {
          setQueuePosition(data.queue_position);
        }

        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id));
            return [...prev, ...newMsgs];
          });

          const maxId = Math.max(...data.messages.map((m: Message) => m.id));
          lastMessageIdRef.current = maxId;

          // Sound alert & unread badge if drawer is closed or message is from staff
          const hasStaffMessage = data.messages.some((m: Message) => m.sender_type === 'staff');
          if (hasStaffMessage) {
            playChime();
            if (!isOpenRef.current) {
              setUnreadCount((prev) => prev + data.messages.length);
            }
          }
        }
      } catch (err) {
        console.error('Chat poll error:', err);
      }
    };

    pollUpdates();
    const interval = setInterval(pollUpdates, 2000);
    return () => clearInterval(interval);
  }, []);

  // Handle start chat session submission
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
          tracking_id: trackingId.trim() || null,
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

  const sendMediaMessage = async (url: string, type: 'image' | 'audio') => {
    if (!sessionToken) return;
    const prefix = type === 'image' ? '[image]' : '[audio]';
    const messageContent = `${prefix}${url}`;

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
        throw new Error('Failed to deliver media message.');
      }

      // Refresh messages instantly after sending
      const pollUrl = `/api/chat/session/poll?token=${sessionToken}&last_message_id=${lastMessageIdRef.current}`;
      const pollResp = await fetch(pollUrl);
      if (pollResp.ok) {
        const pollData = await pollResp.json();
        if (pollData.messages && pollData.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = pollData.messages.filter((m: Message) => !existingIds.has(m.id));
            return [...prev, ...newMsgs];
          });
          const maxId = Math.max(...pollData.messages.map((m: Message) => m.id));
          lastMessageIdRef.current = maxId;
        }
      }
    } catch (error) {
      console.error('Deliver media message error:', error);
      alert('Media message failed to deliver.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 3 * 1024 * 1024; // 3 MB
    if (file.size > maxSize) {
      alert('File size exceeds the limit of 3 MB.');
      return;
    }

    setIsUploading(true);
    try {
      const downloadUrl = await uploadChatFile(file);
      await sendMediaMessage(downloadUrl, 'image');
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsUploading(true);
        try {
          const downloadUrl = await uploadChatFile(audioBlob, 'webm');
          await sendMediaMessage(downloadUrl, 'audio');
        } catch (err) {
          console.error('Audio upload error:', err);
          alert('Failed to send recorded audio.');
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
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
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = pollData.messages.filter((m: Message) => !existingIds.has(m.id));
            return [...prev, ...newMsgs];
          });
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

  const isCustomerLoggedIn = currentUser && currentUser.name && currentUser.email;

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
                {isCustomerLoggedIn ? (
                  <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '10px 12px', borderRadius: '10px', fontSize: '12.5px' }}>
                    <span style={{ color: '#c084fc', fontWeight: 700 }}>Logged in as:</span>
                    <div style={{ fontWeight: 600, color: '#f3f4f6', marginTop: '2px' }}>{currentUser.name} ({currentUser.email})</div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}

                <div>
                  <label className={styles.formLabel}>Order Tracking ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. TRK-987654"
                    className={styles.input}
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#c084fc', background: 'rgba(192, 132, 252, 0.05)', padding: '6px 12px', borderRadius: '8px', marginBottom: '10px' }}>
                      <span>Agent <strong>{agentName}</strong> is handling this chat.</span>
                      {status === 'active' && (
                        <button type="button" onClick={handleCancelChat} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
                          End Session
                        </button>
                      )}
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

                    const isImage = msg.message.startsWith('[image]');
                    const isAudio = msg.message.startsWith('[audio]');
                    const content = isImage || isAudio ? msg.message.substring(7) : msg.message;

                    return (
                      <div key={`${msg.session_id}-${msg.id}`} className={`${styles.msgRow} ${rowClass}`}>
                        <div className={`${styles.bubble} ${bubbleClass}`} style={{ maxWidth: '85%' }}>
                          {msg.sender_name !== 'System' && (
                            <span className={styles.bubbleSender}>{msg.sender_name}</span>
                          )}
                          {isImage ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                              <img
                                src={content}
                                alt="attachment"
                                onClick={() => setLightboxImage(content)}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '160px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  objectFit: 'cover'
                                }}
                              />
                              <a
                                href={content}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  color: '#a78bfa',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                  marginTop: '2px'
                                }}
                              >
                                <Download size={12} />
                                <span>Download</span>
                              </a>
                            </div>
                          ) : isAudio ? (
                            <div style={{ marginTop: '4px' }}>
                              <audio
                                controls
                                src={content}
                                style={{ width: '100%', minWidth: '180px', height: '32px' }}
                              />
                            </div>
                          ) : (
                            msg.message
                          )}
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
                <form onSubmit={handleSendReply} style={{ display: 'flex', width: '100%', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                    title="Attach Image (Max 3MB)"
                    disabled={isUploading || isSendingReply}
                  >
                    {isUploading ? (
                      <Loader2 size={16} className={styles.spinner} />
                    ) : (
                      <Paperclip size={16} />
                    )}
                  </button>

                  {isRecording ? (
                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', display: 'inline-block' }} />
                      <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, flex: 1 }}>Recording...</span>
                      <button
                        type="button"
                        onClick={stopRecording}
                        style={{ background: '#ef4444', border: 'none', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        title="Stop & Send"
                      >
                        <Square size={10} fill="white" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="Type message here..."
                        className={styles.footerInput}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        disabled={isSendingReply || isUploading}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={startRecording}
                        style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                        title="Record Audio"
                        disabled={isUploading || isSendingReply}
                      >
                        <Mic size={16} />
                      </button>
                      <button type="submit" className={styles.sendBtn} disabled={!replyText.trim() || isSendingReply || isUploading}>
                        <Send size={14} />
                      </button>
                    </>
                  )}
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

      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            cursor: 'pointer',
            padding: '20px'
          }}
        >
          <img
            src={lightboxImage}
            alt="Attachment Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '90%',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              objectFit: 'contain'
            }}
          />
        </div>
      )}
    </div>
  );
}
