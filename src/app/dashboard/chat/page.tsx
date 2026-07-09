'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, LogOut, CheckCircle2, MessageSquare, ShieldAlert, Loader2 } from 'lucide-react';
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

// Client-side Web Audio API notification chime
function playChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First soft note
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    
    // Second note delayed by 110ms
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.35);
      } catch (e) {}
    }, 110);
  } catch (error) {
    console.warn('Audio chime failed:', error);
  }
}

export default function StaffChatPage() {
  // Chat list state
  const [waitingQueue, setWaitingQueue] = useState<ChatSession[]>([]);
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
  const [onlineAgents, setOnlineAgents] = useState<StaffAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected chat state
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSubmittingMsg, setIsSubmittingMsg] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Refs for tracking queue states and scrolling
  const prevWaitingLengthRef = useRef(0);
  const lastMessageIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedChatIdRef = useRef<number | null>(null);

  // Sync ref to avoid closures in event timers
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  // 1. Scroll message container to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // 2. Poll queues & online agents (every 2 seconds)
  useEffect(() => {
    const fetchQueues = async () => {
      try {
        const response = await fetch('/api/chat/staff/poll');
        if (!response.ok) throw new Error('Failed staff poll.');
        const data = await response.json();
        
        setWaitingQueue(data.waiting_sessions || []);
        setActiveChats(data.my_active_sessions || []);
        setOnlineAgents(data.online_staff || []);

        // Audio notification when waiting queue grows
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

    fetchQueues(); // Immediate fetch on mount
    const interval = setInterval(fetchQueues, 2000);
    return () => clearInterval(interval);
  }, []);

  // 3. Poll messages for the currently selected active conversation (every 2 seconds)
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      setSelectedChat(null);
      lastMessageIdRef.current = 0;
      return;
    }

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
          // Play alert tone if a new message from customer is received (and it's not the initial load)
          if (!isInitial) {
            const hasNewCustomerMsg = data.messages.some(
              (m: Message) => m.sender_type === 'customer'
            );
            if (hasNewCustomerMsg) {
              playChime();
            }
          }

          // Update messages state
          if (isInitial) {
            setMessages(data.messages);
          } else {
            setMessages((prev) => [...prev, ...data.messages]);
          }

          // Update largest message id
          const maxId = Math.max(...data.messages.map((m: Message) => m.id));
          lastMessageIdRef.current = maxId;
        }
      } catch (err) {
        console.error('Message poll error:', err);
      }
    };

    fetchMessages(true); // Load message history
    const interval = setInterval(() => fetchMessages(false), 2000);
    return () => clearInterval(interval);
  }, [selectedChatId]);

  // 4. Handle Claiming a waiting chat session
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

      // Automatically select the claimed chat
      setSelectedChatId(id);
    } catch (error) {
      console.error('Claim chat error:', error);
      alert('Network error claiming chat.');
    } finally {
      setIsClaiming(false);
    }
  };

  // 5. Handle closing/finishing a chat session
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
      setSelectedChatId(null);
      setSelectedChat(null);
      setMessages([]);
    } catch (error) {
      console.error('Close chat error:', error);
      alert('Failed to close chat session.');
    }
  };

  // 6. Handle sending replies
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

      // Query new messages instantly after sending
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

  const currentActiveChat = activeChats.find((c) => c.id === selectedChatId);
  const currentWaitingChat = waitingQueue.find((c) => c.id === selectedChatId);

  return (
    <div className={styles.container}>
      <div className={styles.splitView}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {/* Active Chats list */}
          <div className={styles.sidebarSection}>
            <div className={styles.sectionHeader}>
              <span>My Active Chats</span>
              <span className={styles.badge}>{activeChats.length}</span>
            </div>
            <div className={styles.list}>
              {activeChats.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: '#71717a', fontStyle: 'italic', padding: '4px 0' }}>
                  No active chats assigned
                </div>
              ) : (
                activeChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`${styles.sessionItem} ${
                      selectedChatId === chat.id ? styles.sessionItemActive : ''
                    }`}
                    onClick={() => setSelectedChatId(chat.id)}
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

          {/* Waiting Queue list */}
          <div className={styles.sidebarSection}>
            <div className={styles.sectionHeader}>
              <span>Waiting Queue</span>
              <span className={`${styles.badge} ${styles.badgeWaiting}`}>
                {waitingQueue.length}
              </span>
            </div>
            <div className={styles.list}>
              {waitingQueue.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: '#71717a', fontStyle: 'italic', padding: '4px 0' }}>
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
                      onClick={() => setSelectedChatId(chat.id)}
                    >
                      <div className={styles.sessionName}>
                        <span>{chat.customer_name}</span>
                        <span style={{ fontSize: '10.5px', color: '#ef4444', fontWeight: 700 }}>WAITING</span>
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

          {/* Online Agents List */}
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
              <MessageSquare size={48} color="#27272a" />
              <span style={{ fontWeight: 600 }}>Support Chat Console</span>
              <span style={{ fontSize: '13px', color: '#52525b', maxWidth: '320px', textAlign: 'center' }}>
                Select a waiting user to claim their ticket, or open an assigned active chat session.
              </span>
            </div>
          ) : currentWaitingChat ? (
            /* Waiting state screen (needs to be claimed) */
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
            /* Active state screen (conversation view) */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Active Header */}
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

              {/* Message scroll container */}
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

              {/* Message Input strip */}
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
                    background: 'rgba(255, 255, 255, 0.01)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
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
      </div>
    </div>
  );
}
