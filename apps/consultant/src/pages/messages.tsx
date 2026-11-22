import { useState, useEffect, useMemo, useRef } from "react";
import { Send, Search, ArrowLeft, MessageSquare, Users, CheckCheck, Bell, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/format";
import { getAuthUser } from "@/lib/auth";

interface Message {
  id: number | string;
  sender: "therapist" | "client";
  text: string;
  time: string;
  createdAt?: string;
}

interface Chat {
  id: string | number;
  clientEmail?: string;
  name: string;
  avatar?: string;
  status: "online" | "offline";
  lastMessage: string;
  unreadCount: number;
  time: string;
  serviceTitle?: string;
  history: Message[];
  lastActivityTime?: number;
}

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

export default function Messages() {
  const authUser = useMemo(() => getAuthUser(), []);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeChatId, setActiveChatId] = useState<string | number>("");
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [isClientTyping, setIsClientTyping] = useState<boolean>(false);
  const [onlineEmails, setOnlineEmails] = useState<Set<string>>(new Set());
  const [incomingNotification, setIncomingNotification] = useState<{ senderName: string; text: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeChatIdRef = useRef<string | number>("");

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChatId, isClientTyping]);

  // Request browser notification permission once
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Fetch initial online presence
  useEffect(() => {
    fetch('/api/messages/presence')
      .then(res => res.json())
      .then(data => {
        if (data?.onlineEmails && Array.isArray(data.onlineEmails)) {
          setOnlineEmails(new Set(data.onlineEmails.map((e: string) => e.toLowerCase())));
        }
      })
      .catch(() => {});
  }, []);

  // Initial load of respected clients and database history
  const loadMessagesData = async (isFirst = false) => {
    try {
      if (isFirst) setIsLoading(true);

      // Only this therapist's conversations: the server filters by consultant id / email
      const messageQuery = new URLSearchParams({ role: 'consultant' });
      if (authUser?.id) messageQuery.set('consultantId', String(authUser.id));
      if (authUser?.email) messageQuery.set('consultantEmail', String(authUser.email).toLowerCase());
      const [usersRes, bookingsRes, messagesRes] = await Promise.all([
        fetch('/api/users').then(r => r.ok ? r.json() : { users: [] }).catch(() => ({ users: [] })),
        fetch('/api/bookings').then(r => r.ok ? r.json() : { bookings: [] }).catch(() => ({ bookings: [] })),
        fetch(`/api/messages?${messageQuery.toString()}`).then(r => r.ok ? r.json() : { messages: [] }).catch(() => ({ messages: [] }))
      ]);

      const rawUsers = Array.isArray(usersRes?.users) ? usersRes.users : [];
      const rawBookings = Array.isArray(bookingsRes?.bookings) ? bookingsRes.bookings : [];
      const rawMessages = Array.isArray(messagesRes?.messages) ? messagesRes.messages : [];

      const myName = (authUser?.name || '').toLowerCase().trim();
      const myId = String(authUser?.id || '').toLowerCase().trim();

      // 1. Find all bookings that belong exclusively to this consultant
      const myBookings = rawBookings.filter((b: any) => {
        const bCid = String(b.consultantId || b.therapistId || '').toLowerCase().trim();
        const bCname = String(b.consultantName || b.therapistName || '').toLowerCase().trim();
        return (myId && bCid === myId) || (myName && bCname === myName) || (myName && bCname.includes(myName)) || (myName && myName.includes(bCname) && bCname.length > 3);
      });

      // 2. Find all users assigned exclusively to this consultant
      const myUsers = rawUsers.filter((u: any) => {
        const role = String(u.role || '').toUpperCase();
        if (role === 'ADMIN') return false;

        const uAssignedName = String(u.assignedTherapistName || u.therapist || '').toLowerCase().trim();
        const uAssignedId = String(u.assignedTherapistId || '').toLowerCase().trim();

        const isAssigned = (myId && uAssignedId === myId) || (myName && uAssignedName === myName) || (myName && uAssignedName.includes(myName));
        const hasBooking = myBookings.some((b: any) => 
          (b.clientEmail && u.email && b.clientEmail.toLowerCase() === u.email.toLowerCase()) ||
          (b.clientId && String(u._id || u.id) === String(b.clientId)) ||
          (b.clientName && u.name && b.clientName.toLowerCase() === u.name.toLowerCase())
        );

        return isAssigned || hasBooking;
      });

      // 3. Construct conversation list for each unique respected client
      const clientMap = new Map<string, any>();

      myUsers.forEach((u: any) => {
        const key = (u.email || u.name || String(u._id || u.id)).toLowerCase();
        clientMap.set(key, {
          id: String(u._id || u.id),
          name: u.name || 'Client User',
          email: u.email || '',
          serviceTitle: u.service || 'Individual Therapy'
        });
      });

      myBookings.forEach((b: any) => {
        if (b.clientName === 'Open Consultation Slot' || b.clientName === 'Blocked Time Slot') return;
        const key = (b.clientEmail || b.clientName || b.clientId || '').toLowerCase();
        if (key && !clientMap.has(key)) {
          clientMap.set(key, {
            id: b.clientId || b.id || key,
            name: b.clientName || 'Client User',
            email: b.clientEmail || '',
            serviceTitle: b.serviceTitle || 'Individual Therapy'
          });
        }
      });

      const initialChats: Chat[] = Array.from(clientMap.values()).map((client) => {
        const clientEmailLower = (client.email || '').toLowerCase();
        const clientIdStr = String(client.id);

        const matchedDbMessages = rawMessages.filter((m: any) => {
          const mCEmail = (m.clientEmail || m.recipientEmail || m.senderEmail || '').toLowerCase();
          const mCId = String(m.clientId || m.recipientId || m.senderId || '');
          const isMyClient = (clientEmailLower && mCEmail === clientEmailLower) || (clientIdStr && mCId === clientIdStr);

          // Strictly match consultant identity
          const mThId = String(m.consultantId || m.therapistId || m.receiverId || m.senderId || '').toLowerCase().trim();
          const mThName = String(m.consultantName || m.therapistName || m.receiverName || m.senderName || '').toLowerCase().trim();
          const isMyConsultant = (myId && mThId === myId) || (myName && mThName.includes(myName)) || (myName && myName.includes(mThName) && mThName.length > 3);

          return isMyClient && isMyConsultant;
        });

        let history: Message[] = [];
        let lastActivity = 0;

        if (matchedDbMessages.length > 0) {
          history = matchedDbMessages.map((m: any) => {
            const timeVal = m.createdAt ? new Date(m.createdAt).getTime() : 0;
            if (timeVal > lastActivity) lastActivity = timeVal;
            return {
              id: m.id || m._id,
              sender: (m.senderRole === 'client' || m.sender === 'client') ? 'client' : 'therapist',
              text: m.content || m.text || '',
              time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Today'
            };
          });
        } else {
          history = [];
        }

        const lastMsg = history.length > 0 ? history[history.length - 1] : null;

        return {
          id: client.id,
          clientEmail: client.email,
          name: client.name,
          status: "offline",
          serviceTitle: client.serviceTitle,
          lastMessage: lastMsg?.text || "No messages yet",
          unreadCount: 0,
          time: lastMsg?.time || "",
          lastActivityTime: lastActivity,
          history
        };
      });

      // Sort with latest message at the very top (1st place)
      initialChats.sort((a, b) => (b.lastActivityTime || 0) - (a.lastActivityTime || 0));

      setChats(initialChats);
      if (initialChats.length > 0 && !activeChatId) {
        setActiveChatId(initialChats[0].id);
      }
    } catch (err) {
      console.error('Failed to load consultant chats:', err);
    } finally {
      if (isFirst) setIsLoading(false);
    }
  };

  // Initial load, 2.5s polling loop, and focus sync
  useEffect(() => {
    loadMessagesData(true);

    // Active real-time poller (every 2.5s)
    const poller = setInterval(() => {
      loadMessagesData(false);
    }, 2500);

    const handleFocus = () => loadMessagesData(false);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(poller);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [authUser]);

  // ⚡ INSTANT 0ms REAL-TIME SERVER-SENT EVENTS (SSE) LISTENER WITH AUTO-RECONNECT
  useEffect(() => {
    const userEmail = (authUser?.email || '').toLowerCase().trim();
    if (!userEmail) return;

    let sse: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    const connectSSE = () => {
      if (!isSubscribed) return;
      try {
        sse = new EventSource(`/api/messages/stream?email=${encodeURIComponent(userEmail)}&role=consultant`);

        sse.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);

            if (parsed.type === 'CONNECTED' && parsed.onlineEmails) {
              setOnlineEmails(new Set(parsed.onlineEmails.map((e: string) => e.toLowerCase())));
            }

            if (parsed.type === 'PRESENCE_CHANGE' && parsed.data?.onlineEmails) {
              setOnlineEmails(new Set(parsed.data.onlineEmails.map((e: string) => e.toLowerCase())));
            }

            if (parsed.type === 'NEW_MESSAGE' && parsed.data) {
              loadMessagesData(false);
              setIsClientTyping(false);
              setTimeout(scrollToBottom, 50);
            }

            if (parsed.type === 'TYPING' && parsed.data) {
              const { senderRole, isTyping } = parsed.data;
              if (senderRole === 'client') {
                setIsClientTyping(Boolean(isTyping));
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
  }, [authUser]);

  const activeChat = chats.find(c => String(c.id) === String(activeChatId)) || chats[0];
  const isCurrentChatOnline = activeChat?.clientEmail ? onlineEmails.has(activeChat.clientEmail.toLowerCase().trim()) : false;

  // Send message instantly to MongoDB Atlas and SSE stream
  const handleSend = async () => {
    if (!inputText.trim() || !activeChat) return;

    const messageText = inputText.trim();
    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      sender: "therapist",
      text: messageText,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    };

    // Immediate optimistic update and move to 1st place
    setChats(prevChats => {
      let targetChat: Chat | null = null;
      const otherChats: Chat[] = [];

      for (const chat of prevChats) {
        if (String(chat.id) === String(activeChat.id)) {
          targetChat = {
            ...chat,
            lastMessage: messageText,
            time: "Just now",
            lastActivityTime: Date.now(),
            history: [...chat.history, newMessage]
          };
        } else {
          otherChats.push(chat);
        }
      }

      if (targetChat) {
        return [targetChat, ...otherChats];
      }
      return prevChats;
    });

    setInputText("");
    setTimeout(scrollToBottom, 50);

    // Cancel typing
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderRole: 'therapist', senderName: authUser?.name || 'Therapist', recipientEmail: activeChat.clientEmail, isTyping: false })
    }).catch(() => {});

    // Live broadcast + DB write
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole: 'therapist',
          senderName: authUser?.name || 'Therapist',
          senderEmail: authUser?.email || '',
          consultantId: authUser?.id || '',
          consultantName: authUser?.name || 'Therapist',
          clientId: activeChat.id,
          clientName: activeChat.name,
          clientEmail: activeChat.clientEmail || '',
          content: messageText
        })
      });
    } catch (e) {
      console.error('Failed to dispatch message:', e);
    }
  };

  // Broadcast typing event when typing in input
  const handleInputChange = (text: string) => {
    setInputText(text);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (activeChat?.clientEmail) {
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole: 'therapist',
          senderName: authUser?.name || 'Therapist',
          recipientEmail: activeChat.clientEmail,
          isTyping: true
        })
      }).catch(() => {});

      typingTimeoutRef.current = setTimeout(() => {
        fetch('/api/messages/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderRole: 'therapist',
            senderName: authUser?.name || 'Therapist',
            recipientEmail: activeChat.clientEmail,
            isTyping: false
          })
        }).catch(() => {});
      }, 2000);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.serviceTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative h-[calc(100vh-100px)] md:h-[calc(100vh-140px)] min-h-[480px] flex border border-border rounded-2xl bg-card overflow-hidden shadow-sm font-['Plus_Jakarta_Sans']">
      
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

      {/* Left Conversations Sidebar */}
      <div className={`w-full md:w-[340px] border-r border-border flex-col bg-white shrink-0 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#5e2be2]" />
              <span>Client Messages</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#5e2be2]">
              {chats.length} Clients
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search your clients..."
              className="pl-9 w-full h-9 text-xs rounded-xl bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {isLoading && chats.length === 0 ? (
            <div className="p-6 text-center space-y-2 text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-600 rounded-full animate-spin mx-auto mb-2" />
              <span>Loading your assigned clients...</span>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5]" />
              <div>
                <h4 className="font-bold text-xs text-slate-800">No Assigned Clients Yet</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                  You only see conversations with clients who have booked sessions with you or are assigned to your care.
                </p>
              </div>
            </div>
          ) : (
            filteredChats.map(chat => {
              const initials = getInitials(chat.name);
              const isSelected = String(chat.id) === String(activeChatId);
              const isClientOnline = chat.clientEmail ? onlineEmails.has(chat.clientEmail.toLowerCase().trim()) : false;

              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setMobileView('chat');
                    // Reset unread count for this active chat
                    setChats(prev => prev.map(c => String(c.id) === String(chat.id) ? { ...c, unreadCount: 0 } : c));
                  }}
                  className={`flex gap-3 p-3.5 cursor-pointer hover:bg-purple-50/40 transition-all relative ${isSelected ? 'bg-purple-50/70 border-l-4 border-[#5e2be2]' : ''}`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-purple-100 text-[#5e2be2] font-extrabold text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span 
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${isClientOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      title={isClientOnline ? 'Online' : 'Offline'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-bold text-xs truncate text-slate-900">{chat.name}</h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap ml-1">{chat.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mb-1">
                      {chat.serviceTitle || 'Individual Therapy'}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${chat.unreadCount > 0 ? 'text-slate-900 font-bold' : 'text-slate-600 font-medium'}`}>
                        {chat.lastMessage}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-[#5e2be2] text-[10px] font-bold text-white shrink-0 animate-pulse">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Left Sidebar Footer with Hexpertify Logo */}
        <div className="p-3.5 border-t border-border bg-slate-50/70 flex items-center justify-start shrink-0 px-4">
          <img 
            src="/hexpertify-logo.png" 
            alt="Hexpertify Logo" 
            className="h-9 w-auto object-contain max-h-9" 
          />
        </div>
      </div>

      {/* Right Chat Window */}
      <div className={`flex-1 flex-col bg-secondary/10 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-center p-8 bg-slate-50/40">
            <div className="space-y-3 max-w-sm">
              <Users className="w-12 h-12 text-purple-300 mx-auto stroke-[1.5]" />
              <h3 className="font-extrabold text-sm text-slate-800">Select a Respected Client to Chat</h3>
              <p className="text-xs text-slate-500">
                You can securely communicate with clients assigned to your care.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-border flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileView('list')}
                  className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden cursor-pointer"
                  title="Back to Conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border border-border">
                  <AvatarFallback className="bg-purple-100 text-[#5e2be2] font-extrabold text-xs sm:text-sm">{getInitials(activeChat.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">{activeChat.name}</h4>
                  <div className="flex items-center gap-2">
                    {isCurrentChatOnline ? (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" /> Online
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full inline-block" /> Offline
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">• {activeChat.serviceTitle || 'Individual Therapy'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeChat.history.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8 text-center min-h-[300px]">
                  <div className="space-y-3 max-w-xs">
                    <div className="w-12 h-12 rounded-full bg-purple-100 text-[#5e2be2] flex items-center justify-center mx-auto">
                      <MessageSquare className="w-6 h-6 stroke-[2]" />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-800">No Messages Yet</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Send a message to start communicating with {activeChat.name} regarding their care.
                    </p>
                  </div>
                </div>
              ) : (
                activeChat.history.map((msg) => {
                  const isTherapist = msg.sender === "therapist";
                  return (
                    <div key={msg.id} className={`flex ${isTherapist ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] flex flex-col ${isTherapist ? "items-end" : "items-start"}`}>
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-xs ${
                            isTherapist
                              ? "bg-[#5e2be2] text-white rounded-tr-none"
                              : "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <span className="text-[10px] text-slate-400 font-medium">{msg.time}</span>
                          {isTherapist && <CheckCheck className="w-3.5 h-3.5 text-[#5e2be2]" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Real-time Typing Bubble */}
              {isClientTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1.5 shadow-xs">
                    <span className="text-xs text-slate-500 font-medium">{activeChat.name} is typing</span>
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

            {/* Chat input */}
            <div className="p-4 bg-white border-t border-border flex gap-3 items-center">
              <Input
                placeholder={`Type your message to ${activeChat.name}...`}
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                className="flex-1 rounded-xl text-xs"
              />
              <Button onClick={handleSend} className="bg-[#5e2be2] hover:bg-[#4f28d9] text-white gap-2 h-10 px-5 shrink-0 rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-[#5e2be2]/20">
                <Send className="w-4 h-4" />
                Send
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
