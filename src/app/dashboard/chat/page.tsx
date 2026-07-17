'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, ShieldAlert, Loader2, User, Phone, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { useDashboard } from '../layout';
import styles from './chat.module.css';

interface Message {
  id: number;
  session_id: number;
  sender_type: 'customer' | 'staff';
  sender_name: string;
  message: string;
  created_at: string;
}

interface ChatSession {
  id: number;
  session_token: string;
  customer_name: string;
  customer_email: string | null;
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

const CANNED_RESPONSES = [
  { label: 'Standard Greeting', text: 'Hello! Thank you for contacting Premium Hub support. How can I help you today?' },
  { label: 'Request Receipt', text: 'To verify your order, please upload or send a screenshot of your payment receipt.' },
  { label: 'Credentials Handover', text: 'Your premium account credentials have been configured. Please check your registered email or let me know if you need help.' },
  { label: 'Close Ticket', text: 'I am marking this support session as resolved. Let us know if you need anything else. Thank you for choosing Premium Hub!' },
];

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

  // Customer Management Right Panel States
  const [customerOrders, setCustomerOrders] = useState<ChatOrder[]>([]);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState<number | null>(null);

  const prevWaitingLengthRef = useRef(0);
  const lastMessageIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedChatIdRef = useRef<number | null>(null);

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

        if (data.messages && data.messages.length > 0) {
          if (!isInitial) {
            const hasNewCustomerMsg = data.messages.some(
              (m: Message) => m.sender_type === 'customer'
            );
            if (hasNewCustomerMsg) {
              playChime();
            }
          }

          if (isInitial) {
            setMessages(data.messages);
          } else {
            setMessages((prev) => [...prev, ...data.messages]);
          }

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
  const fetchCustomerOrders = async (email: string) => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.orders) {
          const filtered = data.orders.filter(
            (o: ChatOrder) => o.customer_email.toLowerCase() === email.toLowerCase()
          );
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
      waitingQueue.find((c) => c.id === selectedChatId);

    if (currentChat && currentChat.customer_email) {
      fetchCustomerOrders(currentChat.customer_email);
    }
  }, [selectedChatId, activeChats, waitingQueue]);

  const handleApplyCanned = (text: string) => {
    setInputText(text);
  };

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

      const pollUrl = `/api/chat/staff/messages?session_id=${selectedChatId}&last_message_id=${lastMessageIdRef.current}`;
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
      console.error('Send message error:', error);
      alert('Failed to send message. Please retry.');
    } finally {
      setIsSubmittingMsg(false);
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

        {/* Conversation Viewport */}
        <main className={styles.chatViewport}>
          {isLoading ? (
            <div className={styles.emptyState}>
              <Loader2 className={styles.spinner} size={28} color="#8b5cf6" />
              <span>Loading Live Support console...</span>
            </div>
          ) : !selectedChatId ? (
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
                {messages.map((msg) => {
                  let rowClass = styles.rowCustomer;
                  let bubbleClass = styles.bubbleCustomer;

                  if (msg.sender_name === 'System') {
                    rowClass = styles.rowSystem;
                    bubbleClass = styles.bubbleSystem;
                  } else if (msg.sender_type === 'staff') {
                    rowClass = styles.rowStaff;
                    bubbleClass = styles.bubbleStaff;
                  }

                  return (
                    <div key={msg.id} className={`${styles.messageRow} ${rowClass}`}>
                      <div className={`${styles.messageBubble} ${bubbleClass}`}>
                        {msg.sender_name !== 'System' && (
                          <span className={styles.messageSender}>{msg.sender_name}</span>
                        )}
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input strip */}
              {selectedChat.status === 'active' ? (
                <form onSubmit={handleSendMessage} className={styles.inputBar}>
                  <input
                    type="text"
                    placeholder="Type support reply here..."
                    className={styles.inputField}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isSubmittingMsg}
                  />
                  <button
                    type="submit"
                    className={styles.sendBtn}
                    disabled={!inputText.trim() || isSubmittingMsg}
                  >
                    <Send size={16} />
                  </button>
                </form>
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
        </main>

        {/* Right Panel: Customer Profile & Order Management (Staff View) */}
        {activeSession && activeSession.customer_email && (
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
                    {activeSession.customer_email}
                  </div>
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

            {/* Quick Canned Responses */}
            <div className={styles.rightPanelSection}>
              <div className={styles.panelTitle}>
                <MessageSquare size={14} />
                <span>Quick Canned Replies</span>
              </div>
              <div className={styles.cannedGrid}>
                {CANNED_RESPONSES.map((resp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyCanned(resp.text)}
                    className={styles.cannedBtn}
                    title={resp.text}
                  >
                    <div style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '2px' }}>
                      {resp.label}
                    </div>
                    <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {resp.text}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Subscriptions/Orders history */}
            <div className={styles.rightPanelSection} style={{ flex: 1 }}>
              <div className={styles.panelTitle}>
                <FileText size={14} />
                <span>Customer Orders ({customerOrders.length})</span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 400px)' }}>
                {customerOrders.length === 0 ? (
                  <div style={{ fontSize: '12.5px', color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                    No orders on record.
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
