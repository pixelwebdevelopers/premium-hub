'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, ShieldAlert, Loader2, User, Phone, FileText, ExternalLink, AlertCircle, Paperclip, Mic, Square, Download } from 'lucide-react';
import { useDashboard } from '../layout';
import styles from './chat.module.css';
import { uploadChatFile } from '../../../lib/firebase';

interface Message {
  id: number;
  session_id: number;
  sender_type: 'customer' | 'staff';
  sender_name: string;
  message: string;
  created_at: string;
  is_historical?: boolean;
  session_created_at?: string;
  session_tracking_id?: string | null;
}

interface ChatSession {
  id: number;
  session_token: string;
  customer_name: string;
  customer_email: string | null;
  tracking_id?: string | null;
  status: 'waiting' | 'active' | 'closed';
  assigned_to_id: number | null;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

interface StaffAgent {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ChatOrder {
  id: number;
  tracking_id: string;
  customer_name: string;
  customer_email: string;
  whatsapp_number: string;
  screenshot_url: string;
  status: string;
  subscription_name: string;
  price: number;
  currency: string;
  created_at: string;
  updated_at: string;
}



function playChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime);
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.35);
      } catch {}
    }, 110);
  } catch (error) {
    console.warn('Audio chime failed:', error);
  }
}

interface DbQuickReply {
  id: number;
  shortcut: string;
  title: string;
  content: string;
}

export default function StaffChatPage() {
  const { user: currentUser, isLoading: userLoading } = useDashboard();
  const [waitingQueue, setWaitingQueue] = useState<ChatSession[]>([]);
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
  const [onlineAgents, setOnlineAgents] = useState<StaffAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSubmittingMsg, setIsSubmittingMsg] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Quick Replies Slash Command state
  const [quickReplies, setQuickReplies] = useState<DbQuickReply[]>([]);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [selectedQuickIndex, setSelectedQuickIndex] = useState(0);

  // Customer Management Right Panel States
  const [customerOrders, setCustomerOrders] = useState<ChatOrder[]>([]);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState<number | null>(null);

  // Lazy loading Chat History States
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Media / Audio States & Refs
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const prevWaitingLengthRef = useRef(0);
  const lastMessageIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedChatIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Fetch quick replies list on mount
  useEffect(() => {
    async function loadQuickReplies() {
      try {
        const res = await fetch('/api/quick-replies');
        if (res.ok) {
          const data = await res.json();
          setQuickReplies(data.quick_replies || []);
        }
      } catch (err) {
        console.error('Error fetching quick replies for chat:', err);
      }
    }
    loadQuickReplies();
  }, []);

  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Handler to clear states when chat selection changes
  const handleSelectChat = (id: number | null) => {
    setSelectedChatId(id);
    setMessages([]);
    setSelectedChat(null);
    setCustomerOrders([]);
    lastMessageIdRef.current = 0;
    setHistoryOffset(0);
    setHasMoreHistory(true);
    setIsLoadingHistory(false);
  };

  // 1. Poll Queues & Staff
  useEffect(() => {
    if (userLoading || (currentUser?.role !== 'admin' && !currentUser?.permissions?.chat)) return;
    const fetchQueues = async () => {
      try {
        const response = await fetch('/api/chat/staff/poll');
        if (!response.ok) throw new Error('Failed staff poll.');
        const data = await response.json();
        
        setWaitingQueue(data.waiting_sessions || []);
        setActiveChats(data.my_active_sessions || []);
        setOnlineAgents(data.online_staff || []);

        const currentWaitingCount = (data.waiting_sessions || []).length;
        if (currentWaitingCount > prevWaitingLengthRef.current) {
          playChime();
        }
        prevWaitingLengthRef.current = currentWaitingCount;
      } catch (err) {
        console.error('Queue poll error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueues();
    const interval = setInterval(fetchQueues, 2000);
    return () => clearInterval(interval);
  }, [currentUser, userLoading]);

  // 2. Poll Messages for Active Chat
  useEffect(() => {
    if (!selectedChatId) return;

    const fetchMessages = async (isInitial = false) => {
      if (selectedChatIdRef.current !== selectedChatId) return;

      try {
        const url = `/api/chat/staff/messages?session_id=${selectedChatId}&last_message_id=${
          isInitial ? 0 : lastMessageIdRef.current
        }`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load messages.');
        const data = await response.json();

        setSelectedChat(data.session);

        if (isInitial) {
          const historical = data.historicalMessages || [];
          const activeMsgs = data.messages || [];
          setMessages([...historical, ...activeMsgs]);
          if (activeMsgs.length > 0) {
            const maxId = Math.max(...activeMsgs.map((m: Message) => m.id));
            lastMessageIdRef.current = maxId;
          }
        } else if (data.messages && data.messages.length > 0) {
          const hasNewCustomerMsg = data.messages.some(
            (m: Message) => m.sender_type === 'customer'
          );
          if (hasNewCustomerMsg) {
            playChime();
          }
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id));
            return [...prev, ...newMsgs];
          });
          const maxId = Math.max(...data.messages.map((m: Message) => m.id));
          lastMessageIdRef.current = maxId;
        }
      } catch (err) {
        console.error('Message poll error:', err);
      }
    };

    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 2000);
    return () => clearInterval(interval);
  }, [selectedChatId]);

  // 3. Load Customer Orders history
  const fetchCustomerOrders = async (email?: string | null, trackingId?: string | null) => {
    if (!email && !trackingId) {
      setCustomerOrders([]);
      return;
    }
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.orders) {
          const filtered = data.orders.filter((o: ChatOrder) => {
            const matchesEmail = Boolean(email && o.customer_email.toLowerCase() === email.toLowerCase());
            const matchesTracking = Boolean(trackingId && o.tracking_id.toLowerCase() === trackingId.toLowerCase());
            return matchesEmail || matchesTracking;
          });
          setCustomerOrders(filtered);
        }
      }
    } catch (err) {
      console.error('Error fetching customer orders in chat:', err);
    }
  };

  useEffect(() => {
    if (!selectedChatId) return;
    const currentChat =
      activeChats.find((c) => c.id === selectedChatId) ||
      waitingQueue.find((c) => c.id === selectedChatId) ||
      selectedChat;

    if (currentChat) {
      fetchCustomerOrders(currentChat.customer_email, currentChat.tracking_id);
    } else {
      setCustomerOrders([]);
    }
  }, [selectedChatId, activeChats, waitingQueue, selectedChat]);



  // 4. Claim Chat
  const handleClaimChat = async (id: number) => {
    setIsClaiming(true);
    try {
      const response = await fetch('/api/chat/session/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: id }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to claim chat session.');
        return;
      }
      handleSelectChat(id);
    } catch (error) {
      console.error('Claim chat error:', error);
      alert('Network error claiming chat.');
    } finally {
      setIsClaiming(false);
    }
  };

  // 5. Close Chat
  const handleCloseChat = async () => {
    if (!selectedChatId) return;
    if (!confirm('Are you sure you want to close this chat session?')) return;

    try {
      const response = await fetch('/api/chat/session/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedChatId }),
      });
      if (!response.ok) {
        throw new Error('Failed to close session.');
      }
      handleSelectChat(null);
    } catch (error) {
      console.error('Close chat error:', error);
      alert('Failed to close chat session.');
    }
  };

  const sendMediaMessage = async (url: string, type: 'image' | 'audio') => {
    if (!selectedChatId) return;
    const prefix = type === 'image' ? '[image]' : '[audio]';
    const messageContent = `${prefix}${url}`;

    try {
      const response = await fetch('/api/chat/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedChatId,
          message: messageContent,
          sender_type: 'staff',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send media message.');
      }

      const pollUrl = `/api/chat/staff/messages?session_id=${selectedChatId}&last_message_id=${lastMessageIdRef.current}`;
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
    } catch (err) {
      console.error('Deliver media message error:', err);
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

  const loadOlderHistory = async () => {
    const email = selectedChat?.customer_email;
    if (!email || !selectedChatId || isLoadingHistory || !hasMoreHistory) return;

    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/chat/staff/history?email=${encodeURIComponent(email)}&offset=${historyOffset}&current_session_id=${selectedChatId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.messages && data.messages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id));
              return [...newMsgs, ...prev];
            });
            setHistoryOffset((prev) => prev + 1);
          }
          setHasMoreHistory(data.hasMore);
        }
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 6. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChatId || isSubmittingMsg) return;

    const messageContent = inputText.trim();
    setInputText('');
    setIsSubmittingMsg(true);

    try {
      const response = await fetch('/api/chat/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedChatId,
          message: messageContent,
          sender_type: 'staff',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message.');
      }

      setShowQuickMenu(false);

      const pollUrl = `/api/chat/staff/messages?session_id=${selectedChatId}&last_message_id=${lastMessageIdRef.current}`;
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
      console.error('Send message error:', error);
      alert('Failed to send message. Please retry.');
    } finally {
      setIsSubmittingMsg(false);
    }
  };

  // 6.5. Quick Replies slash autocomplete helper functions
  const filteredQuickReplies = quickReplies.filter(
    (q) =>
      q.shortcut.toLowerCase().includes(quickSearch.toLowerCase()) ||
      q.title.toLowerCase().includes(quickSearch.toLowerCase())
  );

  const applyQuickReply = (reply: DbQuickReply) => {
    const lastSlashIdx = inputText.lastIndexOf('/');
    const textBeforeSlash = lastSlashIdx !== -1 ? inputText.slice(0, lastSlashIdx) : '';
    const newText = textBeforeSlash ? `${textBeforeSlash}${reply.content} ` : `${reply.content} `;
    setInputText(newText);
    setShowQuickMenu(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      const query = textBeforeCursor.slice(lastSlashIndex + 1);
      if (!query.includes(' ')) {
        setShowQuickMenu(true);
        setQuickSearch(query);
        setSelectedQuickIndex(0);
        return;
      }
    }

    setShowQuickMenu(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showQuickMenu && filteredQuickReplies.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedQuickIndex((prev) => (prev + 1) % filteredQuickReplies.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedQuickIndex((prev) => (prev - 1 + filteredQuickReplies.length) % filteredQuickReplies.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredQuickReplies[selectedQuickIndex] || filteredQuickReplies[0];
        if (selected) {
          applyQuickReply(selected);
        }
      } else if (e.key === 'Escape') {
        setShowQuickMenu(false);
      }
    }
  };

  // 7. Inline Order processing
  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    setIsUpdatingOrder(orderId);
    try {
      const response = await fetch('/api/orders/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: newStatus }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const currentChat =
          activeChats.find((c) => c.id === selectedChatId) ||
          waitingQueue.find((c) => c.id === selectedChatId);
        if (currentChat && currentChat.customer_email) {
          fetchCustomerOrders(currentChat.customer_email);
        }
      } else {
        alert(data.error || 'Failed to update order status.');
      }
    } catch (err) {
      console.error('Error processing order status from chat:', err);
      alert('Error updating order.');
    } finally {
      setIsUpdatingOrder(null);
    }
  };

  const currentActiveChat = activeChats.find((c) => c.id === selectedChatId);
  const currentWaitingChat = waitingQueue.find((c) => c.id === selectedChatId);
  const activeSession = currentActiveChat || currentWaitingChat;

  const getWhatsAppLink = (num: string) => {
    const cleanNum = num.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanNum}`;
  };

  // Find whatsapp number if available in history
  const customerWhatsapp = customerOrders.find((o) => o.whatsapp_number)?.whatsapp_number;

  if (userLoading) {
    return (
      <div className={styles.emptyState}>
        <Loader2 className={styles.spinner} size={28} color="#8b5cf6" />
        <span>Loading Live Support console...</span>
      </div>
    );
  }

  if (currentUser && currentUser.role !== 'admin' && !currentUser.permissions?.chat) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px', gap: '16px', background: '#ffffff', height: 'calc(100vh - 80px)' }}>
        <AlertCircle size={48} color="#ef4444" />
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Access Denied</h2>
        <p style={{ color: '#64748b', fontSize: '14.5px', maxWidth: '360px', textAlign: 'center', lineHeight: '1.5' }}>
          You do not have the required permissions to access the Support Chat console. Please contact your system administrator.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.splitView}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {/* Active Chats */}
          <div className={styles.sidebarSection}>
            <div className={styles.sectionHeader}>
              <span>My Active Chats</span>
              <span className={styles.badge}>{activeChats.length}</span>
            </div>
            <div className={styles.list}>
              {activeChats.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#71717a', fontStyle: 'italic', padding: '4px 0' }}>
                  No active chats assigned
                </div>
              ) : (
                activeChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`${styles.sessionItem} ${
                      selectedChatId === chat.id ? styles.sessionItemActive : ''
                    }`}
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    <div className={styles.sessionName}>
                      <span>{chat.customer_name}</span>
                    </div>
                    <div className={styles.sessionMeta}>
                      {chat.customer_email || 'No email provided'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Waiting Queue */}
          <div className={styles.sidebarSection}>
            <div className={styles.sectionHeader}>
              <span>Waiting Queue</span>
              <span className={`${styles.badge} ${styles.badgeWaiting}`}>
                {waitingQueue.length}
              </span>
            </div>
            <div className={styles.list}>
              {waitingQueue.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#71717a', fontStyle: 'italic', padding: '4px 0' }}>
                  Queue is currently empty
                </div>
              ) : (
                waitingQueue.map((chat) => {
                  const initialMsg = chat.messages && chat.messages[0] ? chat.messages[0].message : 'Requested support...';
                  return (
                    <div
                      key={chat.id}
                      className={`${styles.sessionItem} ${
                        selectedChatId === chat.id ? styles.sessionItemActive : ''
                      }`}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className={styles.sessionName}>
                        <span>{chat.customer_name}</span>
                        <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>WAITING</span>
                      </div>
                      <div className={styles.sessionMeta} title={initialMsg}>
                        {initialMsg}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Online Staff */}
          <div className={styles.sidebarSection} style={{ borderBottom: 'none' }}>
            <div className={styles.sectionHeader}>
              <span>Online Agents</span>
              <span className={styles.badge}>{onlineAgents.length}</span>
            </div>
            <div className={styles.list}>
              {onlineAgents.map((agent) => (
                <div key={agent.id} className={styles.agentItem}>
                  <div className={styles.onlineIndicator} />
                  <span style={{ fontWeight: 500 }}>{agent.name}</span>
                  <span style={{ fontSize: '11px', color: '#71717a' }}>({agent.role})</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Center Panel: Active Chat Stream */}
        <main className={styles.chatViewport}>
          {!selectedChatId ? (
            <div className={styles.emptyState}>
              <MessageSquare size={48} color="#a1a1aa" />
              <span style={{ fontWeight: 600 }}>Support Chat Console</span>
              <span style={{ fontSize: '13px', color: '#71717a', maxWidth: '320px', textAlign: 'center' }}>
                Select a waiting user to claim their ticket, or open an assigned active chat session.
              </span>
            </div>
          ) : currentWaitingChat ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className={styles.chatHeader}>
                <div className={styles.chatTitleInfo}>
                  <span className={styles.chatCustomerName}>{currentWaitingChat.customer_name}</span>
                  <span className={styles.chatCustomerEmail}>
                    {currentWaitingChat.customer_email || 'No email provided'}
                  </span>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className={styles.claimBanner}>
                  <ShieldAlert size={36} color="#ef4444" />
                  <span className={styles.claimTitle}>Ticket Awaiting Agent</span>
                  <p className={styles.claimDesc}>
                    This ticket has not been claimed yet. Click below to join the chat and start helping the customer.
                  </p>
                  <button
                    onClick={() => handleClaimChat(currentWaitingChat.id)}
                    className={styles.claimBtn}
                    disabled={isClaiming}
                  >
                    {isClaiming ? 'Claiming Chat...' : 'Claim & Open Chat'}
                  </button>
                </div>
              </div>
            </div>
          ) : selectedChat ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Header */}
              <div className={styles.chatHeader}>
                <div className={styles.chatTitleInfo}>
                  <span className={styles.chatCustomerName}>{selectedChat.customer_name}</span>
                  <span className={styles.chatCustomerEmail}>
                    {selectedChat.customer_email || 'No email provided'} | Status: {selectedChat.status}
                  </span>
                </div>

                {selectedChat.status === 'active' && (
                  <button onClick={handleCloseChat} className={styles.closeBtn}>
                    Close Chat Session
                  </button>
                )}
              </div>

              {/* Chat messages */}
              <div className={styles.messagesScroll}>
                {selectedChat.customer_email && hasMoreHistory && (
                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%', paddingBottom: '16px' }}>
                    <button
                      type="button"
                      onClick={loadOlderHistory}
                      disabled={isLoadingHistory}
                      style={{
                        background: 'rgba(139, 92, 246, 0.1)',
                        color: '#8b5cf6',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        borderRadius: '20px',
                        padding: '6px 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isLoadingHistory ? (
                        <>
                          <Loader2 className={styles.spinner} size={14} />
                          <span>Loading History...</span>
                        </>
                      ) : (
                        <span>View Previous Chat Sessions</span>
                      )}
                    </button>
                  </div>
                )}
                {messages.map((msg, index) => {
                  let rowClass = styles.rowCustomer;
                  let bubbleClass = styles.bubbleCustomer;

                  if (msg.sender_name === 'System') {
                    rowClass = styles.rowSystem;
                    bubbleClass = styles.bubbleSystem;
                  } else if (msg.sender_type === 'staff') {
                    rowClass = styles.rowStaff;
                    bubbleClass = styles.bubbleStaff;
                  }

                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const showHistoricalHeader = msg.is_historical && (!prevMsg || prevMsg.session_id !== msg.session_id);

                  const isImage = msg.message.startsWith('[image]');
                  const isAudio = msg.message.startsWith('[audio]');
                  const content = isImage || isAudio ? msg.message.substring(7) : msg.message;

                  return (
                    <React.Fragment key={`${msg.session_id}-${msg.id}`}>
                      {showHistoricalHeader && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px 0', width: '100%' }}>
                          <div style={{ flex: 1, height: '1px', background: 'rgba(139, 92, 246, 0.2)' }} />
                          <span style={{ margin: '0 12px', fontSize: '11px', color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', padding: '4px 12px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                            Previous Chat Session (ID: {msg.session_tracking_id || `Session #${msg.session_id}`}) - {msg.session_created_at ? new Date(msg.session_created_at).toLocaleDateString() : ''}
                          </span>
                          <div style={{ flex: 1, height: '1px', background: 'rgba(139, 92, 246, 0.2)' }} />
                        </div>
                      )}

                      <div className={`${styles.messageRow} ${rowClass}`}>
                        <div className={`${styles.messageBubble} ${bubbleClass}`} style={{ maxWidth: '80%' }}>
                          {msg.sender_name !== 'System' && (
                            <span className={styles.messageSender} style={{ color: msg.is_historical ? '#a78bfa' : undefined }}>
                              {msg.sender_name} {msg.is_historical && '(Archived)'}
                            </span>
                          )}
                          {isImage ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                              <img
                                src={content}
                                alt="attachment"
                                onClick={() => setLightboxImage(content)}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '200px',
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
                                style={{ width: '100%', minWidth: '220px', height: '32px' }}
                              />
                            </div>
                          ) : (
                            msg.message
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input strip */}
              {selectedChat.status === 'active' ? (
                <div style={{ position: 'relative', width: '100%' }}>
                  {showQuickMenu && filteredQuickReplies.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '16px',
                        right: '16px',
                        marginBottom: '8px',
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.1), 0 -8px 10px -6px rgba(0, 0, 0, 0.05)',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        zIndex: 100,
                      }}
                    >
                      <div style={{ padding: '8px 14px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Quick Replies (Type / to filter)</span>
                        <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 500 }}>Press Tab/Enter to select</span>
                      </div>
                      {filteredQuickReplies.map((reply, idx) => (
                        <div
                          key={reply.id}
                          onClick={() => applyQuickReply(reply)}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            background: idx === selectedQuickIndex ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                            borderLeft: idx === selectedQuickIndex ? '3px solid #8b5cf6' : '3px solid transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#7c3aed', fontWeight: 700, fontFamily: 'monospace', fontSize: '12px', padding: '1px 6px', borderRadius: '4px' }}>
                              /{reply.shortcut}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>{reply.title}</span>
                          </div>
                          <span style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {reply.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className={styles.inputBar} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      disabled={isUploading || isSubmittingMsg}
                    >
                      {isUploading ? (
                        <Loader2 size={18} className={styles.spinner} />
                      ) : (
                        <Paperclip size={18} />
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
                          placeholder="Type support reply here... (or type / for Quick Replies)"
                          className={styles.inputField}
                          value={inputText}
                          onChange={handleInputChange}
                          onKeyDown={handleInputKeyDown}
                          disabled={isSubmittingMsg || isUploading}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={startRecording}
                          style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                          title="Record Audio"
                          disabled={isUploading || isSubmittingMsg}
                        >
                          <Mic size={18} />
                        </button>
                        <button
                          type="submit"
                          className={styles.sendBtn}
                          disabled={!inputText.trim() || isSubmittingMsg || isUploading}
                        >
                          <Send size={16} />
                        </button>
                      </>
                    )}
                  </form>
                </div>
              ) : (
                <div
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    background: '#f9fafb',
                    borderTop: '1px solid #e5e7eb',
                    color: '#71717a',
                    fontSize: '13px',
                    fontStyle: 'italic',
                  }}
                >
                  This support session has been closed.
                </div>
              )}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Loader2 className={styles.spinner} size={24} color="#8b5cf6" />
              <span>Fetching conversation metadata...</span>
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
        </main>

        {/* Right Panel: Customer Profile & Order History (Staff View) */}
        {activeSession && (
          <aside className={styles.rightPanel}>
            {/* Customer Details */}
            <div className={styles.rightPanelSection}>
              <div className={styles.panelTitle}>
                <User size={14} />
                <span>Customer Profile</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                    {activeSession.customer_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeSession.customer_email || 'No email provided'}
                  </div>
                  {activeSession.tracking_id && (
                    <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 600, marginTop: '4px' }}>
                      Linked Tracking ID: {activeSession.tracking_id}
                    </div>
                  )}
                </div>
                {customerWhatsapp && (
                  <div style={{ marginTop: '8px' }}>
                    <a
                      href={getWhatsAppLink(customerWhatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#10b981',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      <Phone size={13} />
                      <span>WhatsApp Customer</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Active Subscriptions/Orders history (Expanded) */}
            <div className={styles.rightPanelSection} style={{ flex: 1 }}>
              <div className={styles.panelTitle}>
                <FileText size={14} />
                <span>Customer Orders History ({customerOrders.length})</span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                {customerOrders.length === 0 ? (
                  <div style={{ fontSize: '12.5px', color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
                    No order history found for this customer.
                  </div>
                ) : (
                  customerOrders.map((ord) => (
                    <div key={ord.id} className={styles.orderCard}>
                      <div className={styles.orderCardHeader}>
                        <span className={styles.orderCardId}>{ord.tracking_id}</span>
                        <span className={styles.orderCardPrice}>
                          {Number(ord.price).toFixed(2)} {ord.currency}
                        </span>
                      </div>
                      <div className={styles.orderCardService}>{ord.subscription_name}</div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280' }}>
                        <span>Status:</span>
                        <span style={{
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: ord.status === 'completed' ? '#10b981' : ord.status === 'paid' ? '#3b82f6' : '#f59e0b'
                        }}>
                          {ord.status}
                        </span>
                      </div>

                      {/* Process Order Actions inline */}
                      <div className={styles.orderCardActions}>
                        {ord.status === 'unpaid' && (
                          <button
                            type="button"
                            className={`${styles.orderActionBtn} ${styles.orderActionBtnPrimary}`}
                            onClick={() => handleUpdateOrderStatus(ord.id, 'paid')}
                            disabled={isUpdatingOrder === ord.id}
                          >
                            {isUpdatingOrder === ord.id ? '...' : 'Mark Paid'}
                          </button>
                        )}
                        {ord.status === 'paid' && (
                          <button
                            type="button"
                            className={`${styles.orderActionBtn} ${styles.orderActionBtnPrimary}`}
                            onClick={() => handleUpdateOrderStatus(ord.id, 'completed')}
                            disabled={isUpdatingOrder === ord.id}
                          >
                            {isUpdatingOrder === ord.id ? '...' : 'Complete'}
                          </button>
                        )}
                        {ord.status === 'completed' && (
                          <button
                            type="button"
                            className={styles.orderActionBtn}
                            onClick={() => handleUpdateOrderStatus(ord.id, 'unpaid')}
                            disabled={isUpdatingOrder === ord.id}
                          >
                            {isUpdatingOrder === ord.id ? '...' : 'Reset Unpaid'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
