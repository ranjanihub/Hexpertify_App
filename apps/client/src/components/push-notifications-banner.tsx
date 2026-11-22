import React, { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { enablePushNotifications, pushPermission, syncPushSubscription } from '@/lib/push-notifications';

/** Offers booking status notifications on this device; "Not now" hides it for two weeks */
const DISMISS_KEY = 'hexpertify_push_banner_dismissed_at';
const DISMISS_DAYS = 14;

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function PushNotificationsBanner() {
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const permission = pushPermission();
    if (permission === 'granted') {
      syncPushSubscription();
    } else if (permission === 'default' && !recentlyDismissed()) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  };

  const turnOn = async () => {
    setBusy(true);
    const outcome = await enablePushNotifications();
    setBusy(false);
    setVisible(false);
    if (outcome === 'enabled') {
      toast({ title: 'Notifications on', description: "We'll let you know when a session is confirmed, rescheduled, cancelled or completed." });
    } else if (outcome === 'denied') {
      toast({ title: 'Notifications blocked', description: 'You can allow them later from the lock icon next to the address bar.' });
    } else {
      toast({ title: 'Could not turn on notifications', description: 'Please try again later.', variant: 'destructive' });
    }
  };

  if (!visible) return null;

  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50/70 dark:bg-purple-950/30 dark:border-purple-800/60 px-4 py-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[#5e2be2]/10 text-[#5e2be2] flex items-center justify-center shrink-0">
          <BellRing className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Get booking updates on this device</p>
          <p className="text-xs text-muted-foreground">
            A notification when a session is confirmed, rescheduled, cancelled or completed. Free, and you can turn it off anytime.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button variant="ghost" size="sm" onClick={dismiss} disabled={busy}>Not now</Button>
        <Button size="sm" onClick={turnOn} disabled={busy}>{busy ? 'Turning on…' : 'Turn on'}</Button>
        <button type="button" onClick={dismiss} className="hidden sm:inline-flex p-1 text-muted-foreground hover:text-foreground" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
