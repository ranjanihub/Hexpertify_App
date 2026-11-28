import { useCallback, useEffect, useState } from "react";

/**
 * The signed-in therapist's notifications from the backend (bookings, cancellations,
 * reschedules, session feedback alerts). The API token identifies the therapist,
 * so each therapist only receives their own notifications.
 */
export interface ServerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const POLL_MS = 30000;

export function formatNotificationTime(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const minutes = Math.round((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function useServerNotifications() {
  const [notifications, setNotifications] = useState<ServerNotification[]>([]);
  // True when the last load failed, so the bell can say so instead of showing an empty list
  const [loadFailed, setLoadFailed] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/notifications?role=CONSULTANT")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setLoadFailed(false);
        } else {
          setLoadFailed(true);
        }
      })
      .catch(() => setLoadFailed(true));
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    window.addEventListener("focus", refresh);
    window.addEventListener("auth_state_change", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("auth_state_change", refresh);
    };
  }, [refresh]);

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PUT" }).catch(() => {});
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    fetch("/api/notifications/mark-all-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "CONSULTANT" }),
    }).catch(() => {});
  };

  return { notifications, unreadCount: notifications.filter((n) => !n.read).length, markRead, markAllRead, refresh, loadFailed };
}
