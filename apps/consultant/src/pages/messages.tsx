import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Send, Search, ArrowLeft, MessageSquare, Users, CheckCheck, Bell, X, Clock, AlertCircle, RotateCcw } from "lucide-react";
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
  /** Local-only messages: still sending, or the server refused / never answered */
  delivery?: "sending" | "failed";
  failReason?: string;
}

interface Chat {
  id: string | number;
  /** Every id this client may be stored under in messages (custom id and Mongo _id) */
  ids: string[];
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
  /** Server ids of the client's messages this therapist hasn't read yet */
  unreadIds: string[];
}

interface ClientInfo {
  id: string;
  ids: string[];
  name: string;
  email: string;
  serviceTitle: string;
}

/** A therapist message that hasn't been confirmed by the server yet */
interface OutboxMessage {
  tempId: string;
  chatId: string;
  text: string;
  createdAt: number;
  status: "sending" | "failed";
  failReason?: string;
}

// Messages are polled slowly; the live stream (SSE) triggers an immediate refresh on new messages
const MESSAGE_POLL_MS = 8000;

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

const lower = (v: unknown) => String(v || "").toLowerCase().trim();
const timeLabel = (ms: number) =>
  ms ? new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
const isClientMessage = (m: any) => m.senderRole === "client" || m.sender === "client";
const serverMessageId = (m: any) => String(m._id || m.id || "");

export default function Messages() {
  const authUser = useMemo(() => getAuthUser(), []);
  const myId = String(authUser?.id || "");
  const myEmail = lower(authUser?.email);

  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [serverMessages, setServerMessages] = useState<any[]>([]);
  const [outbox, setOutbox] = useState<OutboxMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [clientsLoaded, setClientsLoaded] = useState<boolean>(false);
  const [activeChatId, setActiveChatId] = useState<string | number>("");
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  // Who is typing right now (email / id from the live event) — shown only for the open chat
  const [typingSender, setTypingSender] = useState<{ email: string; id: string } | null>(null);
  const [onlineEmails, setOnlineEmails] = useState<Set<string>>(new Set());
  const [incomingNotification, setIncomingNotification] = useState<{ senderName: string; text: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingClearRef = useRef<NodeJS.Timeout | null>(null);
  const markReadRequestedRef = useRef<Set<string>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  // This therapist's clients, loaded once (the server filters by the therapist's id)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!myId) {
        setIsLoading(false);
        setClientsLoaded(true);
        return;
      }
      const data = await fetch(`/api/users?therapistId=${encodeURIComponent(myId)}`)
        .then(r => r.ok ? r.json() : { users: [] })
        .catch(() => ({ users: [] }));
      if (cancelled) return;
      const list: ClientInfo[] = (Array.isArray(data?.users) ? data.users : []).map((u: any) => ({
        id: String(u.id || u._id),
        ids: [...new Set([u.id, u._id].filter(Boolean).map(String))],
        name: u.name || 'Client',
        email: lower(u.email),
        serviceTitle: u.service || 'Individual Therapy',
      }));
      setClients(list);
      setClientsLoaded(true);

      // /messages?client=<id> opens that client's conversation (used by the client record's Message button)
      const wanted = new URLSearchParams(window.location.search).get('client');
      const match = wanted ? list.find((c) => c.ids.includes(wanted) || (c.email && c.email === lower(wanted))) : undefined;
      if (match) {
        setActiveChatId(match.id);
        setMobileView('chat');
      }
    })();
    return () => { cancelled = true; };
  }, [myId]);

  // Only this therapist's conversations: the server filters by consultant id / email
  const loadMessages = useCallback(async () => {
    const messageQuery = new URLSearchParams({ role: 'consultant' });
    if (myId) messageQuery.set('consultantId', myId);
    if (myEmail) messageQuery.set('consultantEmail', myEmail);
    try {
      const res = await fetch(`/api/messages?${messageQuery.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.messages)) setServerMessages(data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [myId, myEmail]);

  // First load, then poll messages only while the tab is visible
  useEffect(() => {
    loadMessages();
    const poller = setInterval(() => {
      if (document.visibilityState === 'visible') loadMessages();
    }, MESSAGE_POLL_MS);
    const handleVisible = () => {
      if (document.visibilityState === 'visible') loadMessages();
    };
    window.addEventListener('focus', handleVisible);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      clearInterval(poller);
      window.removeEventListener('focus', handleVisible);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [loadMessages]);

  // ⚡ INSTANT 0ms REAL-TIME SERVER-SENT EVENTS (SSE) LISTENER WITH AUTO-RECONNECT
  useEffect(() => {
    if (!myEmail) return;

    let sse: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isSubscribed = true;

    const isForMe = (d: any) =>
      [d?.consultantEmail, d?.recipientEmail, d?.senderEmail].some((e) => lower(e) === myEmail) ||
      (!!myId && [d?.consultantId, d?.recipientId, d?.senderId].some((v) => String(v || '') === myId));

    const connectSSE = async () => {
      if (!isSubscribed) return;
      try {
        // The stream only opens for a signed-in therapist: trade the API token for a one-minute stream ticket
        // (a browser EventSource cannot send the sign-in header). The server then sends only this therapist's events.
        const ticketRes = await fetch('/api/messages/stream-ticket', { method: 'POST' });
        if (!isSubscribed) return;
        if (ticketRes.status === 401) return; // signed out: the panel's session check takes over
        const { ticket } = await ticketRes.json().catch(() => ({}));
        if (!ticketRes.ok || !ticket) throw new Error('No stream ticket');
        sse = new EventSource(`/api/messages/stream?ticket=${encodeURIComponent(ticket)}`);

        sse.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);

            if (parsed.type === 'CONNECTED' && parsed.onlineEmails) {
              setOnlineEmails(new Set(parsed.onlineEmails.map((e: string) => e.toLowerCase())));
            }

            if (parsed.type === 'PRESENCE_CHANGE' && parsed.data?.onlineEmails) {
              setOnlineEmails(new Set(parsed.data.onlineEmails.map((e: string) => e.toLowerCase())));
            }

            // The stream carries everyone's events; refresh only for messages in this therapist's conversations
            if (parsed.type === 'NEW_MESSAGE' && parsed.data && isForMe(parsed.data)) {
              loadMessages();
              if (isClientMessage(parsed.data)) setTypingSender(null);
              setTimeout(scrollToBottom, 50);
            }

            if (parsed.type === 'TYPING' && parsed.data) {
              const d = parsed.data;
              const toMe = lower(d.recipientEmail) === myEmail || (!!myId && String(d.recipientId || '') === myId);
              if (d.senderRole === 'client' && toMe) {
                if (typingClearRef.current) clearTimeout(typingClearRef.current);
                if (d.isTyping) {
                  setTypingSender({ email: lower(d.senderEmail), id: String(d.senderId || '') });
                  // A lost "stopped typing" event must not leave the bubble up forever
                  typingClearRef.current = setTimeout(() => setTypingSender(null), 6000);
                } else {
                  setTypingSender(null);
                }
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
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      if (sse) sse.close();
    };
  }, [myEmail, myId, loadMessages]);

  // One conversation per assigned client: confirmed server messages plus anything still in the outbox
  const chats: Chat[] = useMemo(() => {
    const built = clients.map((client) => {
      // A message belongs to a chat by its CLIENT side only (clientId/clientEmail, or the client end of the
      // sender/recipient pair). Matching the therapist's side too would pull every message into a client account
      // that shares the therapist's email.
      const mine = serverMessages.filter((m: any) => {
        const fromClient = isClientMessage(m);
        const emails = [m.clientEmail, fromClient ? m.senderEmail : m.recipientEmail].map(lower).filter(Boolean);
        const ids = [m.clientId, fromClient ? m.senderId : m.recipientId].map((v) => String(v || '')).filter(Boolean);
        return (!!client.email && emails.includes(client.email)) || ids.some((v) => client.ids.includes(v));
      });

      const history: Message[] = mine.map((m: any) => {
        const t = m.createdAt ? new Date(m.createdAt).getTime() : 0;
        return {
          id: serverMessageId(m),
          sender: isClientMessage(m) ? 'client' : 'therapist',
          text: m.content || m.text || '',
          time: t ? timeLabel(t) : 'Today',
          createdAt: m.createdAt,
        };
      });
      const pending = outbox.filter((o) => o.chatId === client.id);
      pending.forEach((o) => history.push({
        id: o.tempId,
        sender: 'therapist',
        text: o.text,
        time: timeLabel(o.createdAt),
        delivery: o.status,
        failReason: o.failReason,
      }));

      const unreadIds = mine
        .filter((m: any) => isClientMessage(m) && !(m.read || m.isRead))
        .map(serverMessageId)
        .filter(Boolean);

      const lastServer = mine.reduce((max: number, m: any) => Math.max(max, m.createdAt ? new Date(m.createdAt).getTime() : 0), 0);
      const lastActivity = Math.max(lastServer, ...pending.map((o) => o.createdAt), 0);
      const lastMsg = history.length > 0 ? history[history.length - 1] : null;

      return {
        id: client.id,
        ids: client.ids,
        clientEmail: client.email,
        name: client.name,
        status: "offline" as const,
        serviceTitle: client.serviceTitle,
        lastMessage: lastMsg?.text || "No messages yet",
        unreadCount: unreadIds.length,
        unreadIds,
        time: lastMsg?.time || "",
        lastActivityTime: lastActivity,
        history,
      };
    });
    // Latest conversation first
    return built.sort((a, b) => (b.lastActivityTime || 0) - (a.lastActivityTime || 0));
  }, [clients, serverMessages, outbox]);

  // Open the most recent conversation when nothing is selected yet. Wait until the messages have loaded:
  // before that every chat looks empty and the first in the list (not the latest conversation) would be picked.
  useEffect(() => {
    if (!activeChatId && !isLoading && chats.length > 0) setActiveChatId(chats[0].id);
  }, [chats, activeChatId, isLoading]);

  const activeChat = chats.find(c => String(c.id) === String(activeChatId)) || chats[0];
  const isCurrentChatOnline = activeChat?.clientEmail ? onlineEmails.has(activeChat.clientEmail.toLowerCase().trim()) : false;
  // Typing is shown only when the event came from the open chat's own client
  const isClientTyping = !!activeChat && !!typingSender && (
    (!!typingSender.email && typingSender.email === activeChat.clientEmail) ||
    (!!typingSender.id && activeChat.ids.includes(typingSender.id))
  );

  useEffect(() => {
    scrollToBottom();
  }, [activeChatId, isClientTyping, activeChat?.history.length]);

  // Mark the open conversation's client messages read (only those ids, never the whole collection)
  const activeUnreadKey = activeChat ? activeChat.unreadIds.join(',') : '';
  useEffect(() => {
    if (!activeChat || activeChat.unreadIds.length === 0) return;
    if (document.visibilityState !== 'visible') return;
    // On phones the list view may be showing while a chat is pre-selected; only count it as read once opened
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (!isDesktop && mobileView !== 'chat') return;

    const ids = activeChat.unreadIds.filter((mid) => !markReadRequestedRef.current.has(mid));
    if (ids.length === 0) return;
    ids.forEach((mid) => markReadRequestedRef.current.add(mid));

    fetch('/api/messages/read', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds: ids })
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setServerMessages((prev) => prev.map((m: any) => ids.includes(serverMessageId(m)) ? { ...m, read: true, isRead: true } : m));
      })
      .catch(() => {
        // Let a later open / poll try again
        ids.forEach((mid) => markReadRequestedRef.current.delete(mid));
      });
  }, [activeChat?.id, activeUnreadKey, mobileView]);

  // Send to the server; the message shows as delivered only after the server confirms it
  const deliver = async (item: OutboxMessage, chat: Chat) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderRole: 'therapist',
          senderName: authUser?.name || 'Therapist',
          senderEmail: myEmail,
          consultantId: myId,
          consultantEmail: myEmail,
          consultantName: authUser?.name || 'Therapist',
          clientId: chat.id,
          clientName: chat.name,
          clientEmail: chat.clientEmail || '',
          content: item.text
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.message) {
        throw new Error(data?.error || (res.status === 403 ? 'You can only message your own clients.' : 'The server did not accept the message.'));
      }
      // Swap the outbox entry for the confirmed message in one render
      setServerMessages((prev) => [...prev, data.message]);
      setOutbox((prev) => prev.filter((o) => o.tempId !== item.tempId));
    } catch (e: any) {
      const reason = e?.message && e.message !== 'Failed to fetch' ? e.message : 'No connection. Check your internet and retry.';
      setOutbox((prev) => prev.map((o) => o.tempId === item.tempId ? { ...o, status: 'failed', failReason: reason } : o));
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || !activeChat) return;

    const item: OutboxMessage = {
      tempId: `temp-${Date.now()}`,
      chatId: String(activeChat.id),
      text: inputText.trim(),
      createdAt: Date.now(),
      status: 'sending',
    };
    setOutbox((prev) => [...prev, item]);
    setInputText("");
    setTimeout(scrollToBottom, 50);

    // Cancel typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderRole: 'therapist', senderName: authUser?.name || 'Therapist', senderEmail: myEmail, senderId: myId, recipientEmail: activeChat.clientEmail, recipientId: activeChat.id, isTyping: false })
    }).catch(() => {});

    deliver(item, activeChat);
  };

  const retrySend = (tempId: string) => {
    const item = outbox.find((o) => o.tempId === tempId);
    const chat = item ? chats.find((c) => String(c.id) === item.chatId) : undefined;
    if (!item || !chat) return;
    const retried: OutboxMessage = { ...item, status: 'sending', failReason: undefined };
    setOutbox((prev) => prev.map((o) => o.tempId === tempId ? retried : o));
    deliver(retried, chat);
  };

  const removeUnsent = (tempId: string) => {
    setOutbox((prev) => prev.filter((o) => o.tempId !== tempId));
  };

  // Broadcast typing event when typing in input
  const handleInputChange = (text: string) => {
    setInputText(text);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (activeChat?.clientEmail) {
      const typingBody = (isTyping: boolean) => JSON.stringify({
        senderRole: 'therapist',
        senderName: authUser?.name || 'Therapist',
        senderEmail: myEmail,
        senderId: myId,
        recipientEmail: activeChat.clientEmail,
        recipientId: activeChat.id,
        isTyping
      });
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: typingBody(true)
      }).catch(() => {});

      typingTimeoutRef.current = setTimeout(() => {
        fetch('/api/messages/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: typingBody(false)
        }).catch(() => {});
      }, 2000);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.serviceTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative h-[calc(100dvh-144px)] sm:h-[calc(100dvh-114px)] md:h-[calc(100dvh-146px)] lg:h-[calc(100dvh-162px)] min-h-[360px] flex border border-border rounded-2xl bg-card overflow-hidden shadow-sm font-['Open_Sans']">

      {/* Floating In-App Toast Notification Banner */}
      {incomingNotification && (
        <div
          onClick={() => {
            setMobileView('chat');
            setIncomingNotification(null);
          }}
          className="absolute top-4 left-4 right-4 sm:left-auto z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-purple-500/30 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 cursor-pointer hover:bg-slate-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[#450bc8] flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-white animate-bounce" />
          </div>
          <div className="text-xs flex-1 min-w-0 pr-1">
            <p className="font-extrabold text-purple-200">New message from {incomingNotification.senderName}</p>
            <p className="text-slate-300 truncate sm:max-w-[240px]">{incomingNotification.text}</p>
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
      <div className={`w-full md:w-[280px] xl:w-[340px] border-r border-border flex-col bg-white shrink-0 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#450bc8]" />
              <span>Client Messages</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#450bc8]">
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
          {(isLoading || !clientsLoaded) && chats.length === 0 ? (
            <div className="p-6 text-center space-y-2 text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-600 rounded-full animate-spin mx-auto mb-2" />
              <span>Loading your assigned clients...</span>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5]" />
              <div>
                <h4 className="font-bold text-xs text-slate-800">{searchQuery.trim() ? "No clients match your search" : "No Assigned Clients Yet"}</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                  You only see conversations with clients assigned to your care.
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
                  }}
                  className={`flex gap-3 p-3.5 cursor-pointer hover:bg-purple-50/40 transition-all relative ${isSelected ? 'bg-purple-50/70 border-l-4 border-[#450bc8]' : ''}`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-purple-100 text-[#450bc8] font-extrabold text-xs">{initials}</AvatarFallback>
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
                        <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-[#450bc8] text-[10px] font-bold text-white shrink-0 animate-pulse">
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
      <div className={`flex-1 min-w-0 flex-col bg-secondary/10 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
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
            <div className="px-3 sm:px-6 py-3 sm:py-3.5 bg-white border-b border-border flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => setMobileView('list')}
                  className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
                  title="Back to Conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border border-border shrink-0">
                  <AvatarFallback className="bg-purple-100 text-[#450bc8] font-extrabold text-xs sm:text-sm">{getInitials(activeChat.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug truncate">{activeChat.name}</h4>
                  <div className="flex items-center gap-2 min-w-0">
                    {isCurrentChatOnline ? (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" /> Online
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full inline-block" /> Offline
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 truncate">• {activeChat.serviceTitle || 'Individual Therapy'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 space-y-4">
              {activeChat.history.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8 text-center min-h-[300px]">
                  <div className="space-y-3 max-w-xs">
                    <div className="w-12 h-12 rounded-full bg-purple-100 text-[#450bc8] flex items-center justify-center mx-auto">
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
                  const failed = msg.delivery === "failed";
                  return (
                    <div key={msg.id} className={`flex ${isTherapist ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] min-w-0 flex flex-col ${isTherapist ? "items-end" : "items-start"}`}>
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-xs break-words [overflow-wrap:anywhere] ${
                            isTherapist
                              ? `bg-[#450bc8] text-white rounded-tr-none ${msg.delivery ? "opacity-70" : ""}`
                              : "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <span className="text-[10px] text-slate-400 font-medium">{msg.time}</span>
                          {isTherapist && msg.delivery === "sending" && (
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                              <Clock className="w-3 h-3" /> Sending…
                            </span>
                          )}
                          {isTherapist && !msg.delivery && <CheckCheck className="w-3.5 h-3.5 text-[#450bc8]" />}
                        </div>
                        {isTherapist && failed && (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 px-1 text-[10px] font-semibold">
                            <span className="text-rose-600 flex items-center gap-1" title={msg.failReason}>
                              <AlertCircle className="w-3 h-3" /> Not sent{msg.failReason ? ` — ${msg.failReason}` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => retrySend(String(msg.id))}
                              className="text-[#450bc8] hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              <RotateCcw className="w-3 h-3" /> Retry
                            </button>
                            <button
                              type="button"
                              onClick={() => removeUnsent(String(msg.id))}
                              className="text-slate-500 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        )}
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
                      <span className="w-1.5 h-1.5 bg-[#450bc8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#450bc8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#450bc8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <div className="p-3 sm:p-4 bg-white border-t border-border flex gap-2 sm:gap-3 items-center">
              <Input
                placeholder={`Type your message to ${activeChat.name}...`}
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                className="flex-1 min-w-0 h-10 rounded-xl text-xs"
              />
              <Button onClick={handleSend} className="bg-[#450bc8] hover:bg-[#3a0aa8] text-white gap-2 h-10 px-3.5 sm:px-5 shrink-0 rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-[#450bc8]/20">
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
