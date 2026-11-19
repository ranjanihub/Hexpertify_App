import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { pageTransition, safeFormatDate } from '@/components/shared';
import { 
  Send, Search, ArrowLeft, 
  Calendar, CheckCircle2, ShieldCheck, Sparkles,
  MessageSquare, CheckCheck, Bell, X
} from 'lucide-react';
import { isSameDay, formatRelative } from 'date-fns';
import { enUS } from 'date-fns/locale';

const chatDateLocale = {
  ...enUS,
  formatRelative: (token: string) => {
    const formatRelativeLocale: Record<string, string> = {
      lastWeek: "'Last' eeee",
      yesterday: "'Yesterday'",
      today: "'Today'",
      tomorrow: "'Tomorrow'",
      nextWeek: "eeee",
      other: 'MMM d, yyyy',
    };
    return formatRelativeLocale[token] || 'MMM d, yyyy';
  },
};

import { getUserMessages, saveUserMessages, sendUserMessage, markUserMessagesRead, MessageItem } from '@/lib/client-store';
import { getClientAuth } from '@/lib/auth';
import { BookingModal } from '@/components/booking-modal';

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.35);
  } catch {}
}

export default function MessagesPage() {
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [storeMessages, setStoreMessages] = useState<MessageItem[]>(() => getUserMessages());
  const [searchQuery, setSearchQuery] = useState('');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isTherapistTyping, setIsTherapistTyping] = useState<boolean>(false);
  const [isTherapistOnline, setIsTherapistOnline] = useState<boolean>(false);
  const [incomingNotification, setIncomingNotification] = useState<{ senderName: string; text: string } | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const authUser = getClientAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  const notifTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mobileViewRef = useRef<'list' | 'chat'>(mobileView);

  useEffect(() => {
    mobileViewRef.current = mobileView;
    if (mobileView === 'chat') {
      markUserMessagesRead(therapistInfo.id);
    }
  }, [mobileView]);

  // Mark all messages as read upon entering the messages page
  useEffect(() => {
    markUserMessagesRead(therapistInfo.id);
  }, []);

  const normalizeImg = (u?: string) => {
    if (!u || typeof u !== 'string') return '';
    const t = u.trim();
    if (t.includes('google.com/imgres') || t.includes('imgurl=')) {
      try {
        const m = t.match(/[?&]imgurl=([^&]+)/i);
        if (m && m[1]) return decodeURIComponent(m[1]);
      } catch {}
    }
    return t;
  };

  const [therapistInfo, setTherapistInfo] = useState({
    id: authUser?.assignedTherapistId || "",
    name: authUser?.assignedTherapistName || "Your therapist",
    email: String(authUser?.assignedTherapistEmail || ""),
    title: "",
    avatarUrl: normalizeImg(authUser?.assignedTherapistPhoto) || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
    experience: "12 Years Exp.",
    rating: 4.96
  });
  // The server found no assigned therapist for this client (it never picks one at random)
  const [noTherapist, setNoTherapist] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [storeMessages, isTherapistTyping]);

  // Request browser notification permission once
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Fetch client's exclusively assigned consultant from backend
  useEffect(() => {
    const emailParam = authUser?.email ? `?email=${encodeURIComponent(authUser.email)}` : '';
    fetch(`/api/messages/consultant${emailParam}`)
      .then(res => res.json())
      .then(data => {
        if (data?.success && !data?.consultant) {
          setNoTherapist(true);
          return;
        }
        if (data?.success && data?.consultant) {
          setNoTherapist(false);
          const c = data.consultant;
          const freshAvatar = normalizeImg(c.avatarUrl) || c.avatarUrl || therapistInfo.avatarUrl;
          setTherapistInfo(prev => ({
            ...prev,
            id: c.id || prev.id,
            name: c.name || prev.name,
            email: c.email || prev.email,
            title: c.title || prev.title,
            avatarUrl: freshAvatar || prev.avatarUrl
          }));
          if (authUser) {
            try {
              const updated = {
                ...authUser,
                assignedTherapistId: c.id,
                assignedTherapistName: c.name,
                assignedTherapistEmail: c.email,
                assignedTherapistPhoto: freshAvatar
              };
              localStorage.setItem('hexpertify_client_auth', JSON.stringify(updated));
            } catch {}
          }
          if (typeof c.isOnline === 'boolean') {
            setIsTherapistOnline(c.isOnline);
          }
        }
      })
      .catch(() => {});
  }, [authUser]);

  // Ref to track known message IDs for notification chime
  const knownMsgIdsRef = useRef<Set<string>>(new Set());

  // 🔄 REAL-TIME AUTO-SYNC: Fetch latest messages from MongoDB Atlas
  const fetchLiveMessages = useRef<() => void>(() => {});
  fetchLiveMessages.current = async () => {
    const clientEmail = (authUser?.email || '').toLowerCase().trim();
    if (!clientEmail) return;

    try {
      const res = await fetch(`/api/messages?clientEmail=${encodeURIComponent(clientEmail)}`);
      const data = await res.json();

      if (data?.success && Array.isArray(data.messages)) {
        const assignedConsultant = data.consultant;
        if (assignedConsultant) {
          const freshAvatar = normalizeImg(assignedConsultant.avatarUrl) || assignedConsultant.avatarUrl || therapistInfo.avatarUrl;
          setTherapistInfo(prev => ({
            ...prev,
            id: assignedConsultant.id || prev.id,
            name: assignedConsultant.name || prev.name,
            email: assignedConsultant.email || prev.email,
            title: assignedConsultant.title || prev.title,
            avatarUrl: freshAvatar || prev.avatarUrl
          }));
        }

        const clientName = authUser?.name || 'Client';
        const clientAvatar = authUser?.avatarUrl || '';
        const isViewingChat = mobileViewRef.current === 'chat' || (typeof window !== 'undefined' && window.innerWidth >= 768);

        const mapped: MessageItem[] = data.messages.map((m: any) => {
          const isClient = (m.senderRole === 'client' || m.sender === 'client');
          const consultantName = m.consultantName || m.senderName || assignedConsultant?.name || therapistInfo.name || 'Therapist';
          const consultantAvatar = assignedConsultant?.avatarUrl || therapistInfo.avatarUrl;

          return {
            id: m.id || m._id,
            type: "text",
            senderRole: isClient ? 'client' : 'therapist',
            senderId: isClient ? (authUser?.id || 'client-1') : (m.consultantId || assignedConsultant?.id || therapistInfo.id),
            senderName: isClient ? clientName : consultantName,
            senderAvatarUrl: isClient ? clientAvatar : consultantAvatar,
            content: m.content || m.text || '',
            sentAt: m.createdAt || m.sentAt || new Date().toISOString(),
            isRead: isViewingChat ? true : (isClient || Boolean(m.read || m.isRead))
          };
        });

        // If user is actively viewing chat, mark messages as read
        if (isViewingChat) {
          const hasUnreadFromTherapist = data.messages.some((m: any) => (m.senderRole === 'therapist' || m.sender === 'therapist') && !m.read && !m.isRead);
          if (hasUnreadFromTherapist) {
            markUserMessagesRead(therapistInfo.id);
          }
        }

        // Check for new incoming therapist messages
        let hasNewTherapistMsg = false;
        let newestTherapistContent = '';

        mapped.forEach(msg => {
          const msgIdStr = String(msg.id);
          if (!knownMsgIdsRef.current.has(msgIdStr)) {
            knownMsgIdsRef.current.add(msgIdStr);
            if (!isInitialLoadRef.current && msg.senderRole === 'therapist') {
              hasNewTherapistMsg = true;
              newestTherapistContent = msg.content;
            }
          }
        });

        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
        } else if (hasNewTherapistMsg && newestTherapistContent) {
          const isTabActive = typeof document !== 'undefined' && !document.hidden;

          if (!isTabActive) {
            playNotificationChime();
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`💬 Message from ${therapistInfo.name}`, {
                  body: newestTherapistContent,
                  icon: therapistInfo.avatarUrl
                });
              } catch {}
            }
          } else if (!isViewingChat) {
            playNotificationChime();
            if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
            setIncomingNotification({
              senderName: therapistInfo.name,
              text: newestTherapistContent
            });
            notifTimeoutRef.current = setTimeout(() => {
              setIncomingNotification(null);
            }, 3500);
          }
        }

        setStoreMessages(mapped);
        saveUserMessages(mapped);
      }
    } catch {}
  };

  // Initial load & high-frequency 2-second background polling
  useEffect(() => {
    // Initial fetch
    fetchLiveMessages.current();

    // Active real-time poller (every 2.5s)
    const poller = setInterval(() => {
      fetchLiveMessages.current();
    }, 2500);

    // Immediate refetch when user refocuses or makes tab visible
    const handleFocus = () => fetchLiveMessages.current();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('client_data_updated', handleFocus);

    return () => {
      clearInterval(poller);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('client_data_updated', handleFocus);
    };
  }, [authUser?.email]);

  // Fetch presence every 6s
  useEffect(() => {
    const fetchPresence = () => {
      fetch('/api/messages/presence')
        .then(res => res.json())
        .then(data => {
          if (data?.onlineEmails && Array.isArray(data.onlineEmails)) {
            const list = data.onlineEmails.map((e: string) => e.toLowerCase());
            const target = therapistInfo.email.toLowerCase();
            setIsTherapistOnline(list.includes(target) || list.some((e: string) => e.includes('therapist') || e.includes('consultant')));
          }
        })
        .catch(() => {});
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 6000);
    return () => clearInterval(interval);
  }, [therapistInfo.email]);

  // ⚡ INSTANT 0ms REAL-TIME SERVER-SENT EVENTS (SSE) STREAM WITH AUTO-RECONNECT
  useEffect(() => {
    const clientEmail = (authUser?.email || '').toLowerCase().trim();
    if (!clientEmail) return;

    let sse: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    const connectSSE = () => {
      if (!isSubscribed) return;
      try {
        sse = new EventSource(`/api/messages/stream?email=${encodeURIComponent(clientEmail)}&role=client`);

        sse.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);

            if (parsed.type === 'CONNECTED' && parsed.onlineEmails) {
              const list = parsed.onlineEmails.map((e: string) => e.toLowerCase());
              const target = therapistInfo.email.toLowerCase();
              setIsTherapistOnline(list.includes(target) || list.some((e: string) => e.includes('therapist') || e.includes('consultant')));
            }

            if (parsed.type === 'PRESENCE_CHANGE' && parsed.data?.onlineEmails) {
              const list = parsed.data.onlineEmails.map((e: string) => e.toLowerCase());
              const target = therapistInfo.email.toLowerCase();
              setIsTherapistOnline(list.includes(target) || list.some((e: string) => e.includes('therapist') || e.includes('consultant')));
            }

            if (parsed.type === 'NEW_MESSAGE' && parsed.data) {
              fetchLiveMessages.current();
              setIsTherapistTyping(false);
              setTimeout(scrollToBottom, 50);
            }

            if (parsed.type === 'TYPING' && parsed.data) {
              const { senderRole, isTyping } = parsed.data;
              if (senderRole === 'therapist') {
                setIsTherapistTyping(Boolean(isTyping));
              }
            }
          } catch (err) {}
        };

        sse.onerror = () => {
          if (sse) sse.close();
          if (isSubscribed) {
            reconnectTimer = setTimeout(connectSSE, 4000);
          }
        };
      } catch {
        if (isSubscribed) {
          reconnectTimer = setTimeout(connectSSE, 4000);
        }
      }
    };

    connectSSE();

    return () => {
      isSubscribed = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (sse) sse.close();
    };
  }, [authUser?.email, therapistInfo.email]);

  const handleSendText = (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || noTherapist) return;

    if (incomingNotification) setIncomingNotification(null);

    sendUserMessage(text, {
      consultantId: therapistInfo.id,
      consultantName: therapistInfo.name,
      consultantEmail: therapistInfo.email
    });
    setNewMessage('');
    setTimeout(scrollToBottom, 50);
    setTimeout(() => {
      fetchLiveMessages.current();
    }, 400);

    // Cancel typing
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        senderRole: 'client', 
        senderName: authUser?.name || 'Client',
        recipientEmail: therapistInfo.email,
        recipientId: therapistInfo.id,
        isTyping: false 
      })
    }).catch(() => {});
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendText(newMessage);
  };

  const handleInputChange = (text: string) => {
    setNewMessage(text);
    if (incomingNotification) setIncomingNotification(null);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderRole: 'client',
        senderName: authUser?.name || 'Client',
        recipientEmail: therapistInfo.email,
        recipientId: therapistInfo.id,
        isTyping: true
      })
    }).catch(() => {});

    typingTimeoutRef.current = setTimeout(() => {
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole: 'client',
          senderName: authUser?.name || 'Client',
          recipientEmail: therapistInfo.email,
          recipientId: therapistInfo.id,
          isTyping: false
        })
      }).catch(() => {});
    }, 2000);
  };

  // Filter messages based on search query
  const filteredMessages = storeMessages.filter((m) => {
    if (!searchQuery.trim()) return true;
    return m.content?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedMessages = filteredMessages.slice().sort((a, b) => {
    const tA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const tB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
  });

  const lastMessage = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1] : null;

  return (
    <motion.div {...pageTransition} className="relative w-full h-[calc(100dvh-95px)] md:h-[calc(100vh-115px)] flex flex-col md:flex-row gap-4 sm:gap-6 pb-2 font-['Plus_Jakarta_Sans']">
      
      {/* Floating In-App Toast Notification Banner */}
      {incomingNotification && (
        <div 
          onClick={() => {
            setMobileView('chat');
            setIncomingNotification(null);
          }}
          className="absolute top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-purple-500/30 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 cursor-pointer hover:bg-slate-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[#5e2be2] flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-white animate-bounce" />
          </div>
          <div className="text-xs flex-1 min-w-0 pr-1">
            <p className="font-extrabold text-purple-200">New message from {incomingNotification.senderName}</p>
            <p className="text-slate-300 truncate max-w-[240px]">{incomingNotification.text}</p>
          </div>
          <button 
            type="button" 
            onClick={(e) => {
              e.stopPropagation();
              setIncomingNotification(null);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Threads Sidebar ────────────────────────────────────────── */}
      <div className={`w-full md:w-84 flex-shrink-0 hex-card !p-0 flex flex-col overflow-hidden h-full ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Direct Messages</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              1 Active
            </span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..." 
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/50 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Conversation List Item */}
        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={() => {
              setMobileView('chat');
              setIncomingNotification(null);
            }}
            className="w-full p-3.5 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex items-start gap-3 text-left transition-all relative group cursor-pointer"
          >
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-muted border border-border shadow-xs">
                <img 
                  src={therapistInfo.avatarUrl} 
                  alt={therapistInfo.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80";
                  }}
                />
              </div>
              <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-card rounded-full ${isTherapistOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <h3 className="font-extrabold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {therapistInfo.name}
                </h3>
                <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                  {lastMessage?.sentAt ? safeFormatDate(lastMessage.sentAt, 'h:mm a') : 'Now'}
                </span>
              </div>
              <p className="text-[11px] text-primary font-bold truncate mb-1">
                Therapist
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1 leading-snug">
                {isTherapistTyping ? (
                  <span className="text-primary font-bold animate-pulse">Typing...</span>
                ) : (
                  lastMessage?.content || "Tap to chat with your therapist"
                )}
              </p>
            </div>
          </button>
        </div>

        {/* Security & Support Note */}
        <div className="p-3.5 bg-muted/30 border-t border-border mt-auto flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[11px] text-muted-foreground font-medium leading-tight">
            End-to-End HIPAA Encrypted Care Channel
          </span>
        </div>
      </div>

      {/* ── Chat Canvas ────────────────────────────────────────────── */}
      <div className={`flex-1 hex-card !p-0 flex flex-col overflow-hidden h-full ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {/* Chat Header */}
        <div className="p-3.5 sm:p-4 border-b border-border bg-white dark:bg-card flex items-center justify-between shrink-0 shadow-2xs z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileView('list')}
              className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="relative">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden bg-muted border border-border shadow-xs">
                <img 
                  src={therapistInfo.avatarUrl} 
                  alt={therapistInfo.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80";
                  }}
                />
              </div>
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white dark:border-card rounded-full ${isTherapistOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-foreground leading-snug">
                  {therapistInfo.name}
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                  Verified Specialist
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                <span>{therapistInfo.title}</span>
                <span>&bull;</span>
                {isTherapistOnline ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Offline
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsBookingOpen(true)}
              className="px-3 sm:px-4 py-2 rounded-xl bg-purple-50 text-[#5e2be2] hover:bg-purple-100 font-extrabold text-xs transition-all flex items-center gap-1.5 border border-purple-200 cursor-pointer shadow-2xs"
              title="Schedule next session"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Book Session</span>
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F6F7FB] dark:bg-muted/20 space-y-4">
          {sortedMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8 text-center min-h-[320px]">
              <div className="space-y-3 max-w-sm">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-[#5e2be2] flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">No Messages Yet</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Send a message to {therapistInfo.name} to begin your consultation communication.
                </p>
              </div>
            </div>
          ) : (
            sortedMessages.map((msg, index) => {
              const isMe = 
                msg.senderRole === 'client' ||
                (msg.senderRole !== 'therapist' && (
                  msg.senderName?.toLowerCase() === 'you' || 
                  (authUser?.name && msg.senderName?.toLowerCase() === authUser.name.toLowerCase()) ||
                  msg.senderId === (authUser?.id || 'client-1') ||
                  msg.senderId === 2
                ));

              const prevMsg = index > 0 ? sortedMessages[index - 1] : null;
              const isValidDate = msg.sentAt && !isNaN(new Date(msg.sentAt).getTime());
              const showDate = isValidDate && (!prevMsg || !prevMsg.sentAt || !isSameDay(new Date(msg.sentAt), new Date(prevMsg.sentAt)));

              return (
                <React.Fragment key={msg.id || index}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <span className="text-[11px] font-bold text-muted-foreground bg-white dark:bg-card px-3 py-1 rounded-full shadow-2xs border border-border">
                        {formatRelative(new Date(msg.sentAt), new Date(), { locale: chatDateLocale })}
                      </span>
                    </div>
                  )}
                  
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`flex gap-2.5 max-w-[88%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isMe && (
                        <div className="w-8 h-8 rounded-xl shrink-0 overflow-hidden bg-muted border border-border shadow-2xs mt-auto">
                          <img 
                            src={msg.senderAvatarUrl || therapistInfo.avatarUrl} 
                            alt={therapistInfo.name} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = therapistInfo.avatarUrl;
                            }}
                          />
                        </div>
                      )}
                      
                      <div className={`p-4 rounded-3xl shadow-sm space-y-1 ${
                        isMe 
                          ? 'bg-[#5e2be2] text-white rounded-br-xs shadow-md shadow-[#5e2be2]/15' 
                          : 'bg-white dark:bg-card text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/90 dark:border-border'
                      }`}>
                        <p className="text-xs sm:text-sm leading-relaxed font-medium whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <div className={`flex items-center gap-1 text-[10px] font-medium pt-1 ${isMe ? 'text-white/80 justify-end' : 'text-slate-400'}`}>
                          <span>{safeFormatDate(msg.sentAt, 'h:mm a')}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-white ml-0.5" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}

          {/* Real-time Typing Bubble */}
          {isTherapistTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1.5 shadow-xs">
                <span className="text-xs text-slate-500 font-medium">{therapistInfo.name} is typing</span>
                <span className="flex gap-1 items-center pt-1">
                  <span className="w-1.5 h-1.5 bg-[#5e2be2] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#5e2be2] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#5e2be2] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-card border-t border-border shrink-0 z-10">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={noTherapist ? "You don't have an assigned therapist yet" : `Send message to ${therapistInfo.name}...`}
              disabled={noTherapist}
              className="flex-1 bg-slate-100/80 dark:bg-muted/50 border border-slate-200 dark:border-border rounded-full px-5 sm:px-6 py-3 text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 text-foreground transition-all shadow-inner"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-full bg-[#5e2be2] hover:bg-[#4f28d9] text-white flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-md shadow-[#5e2be2]/25 cursor-pointer"
              title="Send Message"
            >
              <Send className="w-4.5 sm:w-5 h-4.5 sm:h-5 ml-0.5" />
            </button>
          </form>
        </div>
      </div>

      <BookingModal 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)}
        therapistName={therapistInfo.name}
        therapistAvatar={therapistInfo.avatarUrl}
        therapistTitle={therapistInfo.title}
      />
    </motion.div>
  );
}
