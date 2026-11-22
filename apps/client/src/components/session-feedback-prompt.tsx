import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Slider } from './ui/slider';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { getClientAuth } from '@/lib/auth';

/**
 * Post-session feedback (Session Rating Scale): shown after the therapist marks a session
 * completed. Three 0–10 sliders (all required) and an optional message; total out of 30.
 */

type PendingSession = {
  bookingId: string;
  consultantName: string;
  serviceTitle: string;
  sessionDate?: string;
  sessionTime?: string;
};

type ItemKey = 'helpfulness' | 'goalsHeard' | 'approach';

const QUESTIONS: { key: ItemKey; title: string; question: string; low: string; high: string }[] = [
  {
    key: 'helpfulness',
    title: 'Session Helpfulness',
    question: 'How relatable and helpful was today\'s session for you?',
    low: 'Not at all helpful',
    high: 'Extremely helpful',
  },
  {
    key: 'goalsHeard',
    title: 'Goals & Feeling Heard',
    question: 'Was the topic you wanted to discuss addressed, and did you feel heard?',
    low: 'Not at all',
    high: 'Completely',
  },
  {
    key: 'approach',
    title: "Therapist's Approach",
    question: "Did you feel comfortable with and like your therapist's approach during today's session?",
    low: 'Not at all',
    high: 'Very much',
  },
];

// "Maybe later" hides a session's form until the next visit (browser session)
const SNOOZE_KEY = 'hexpertify_feedback_snoozed';

function readSnoozed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SNOOZE_KEY) || '[]');
  } catch {
    return [];
  }
}

function snooze(bookingId: string): void {
  try {
    sessionStorage.setItem(SNOOZE_KEY, JSON.stringify([...readSnoozed(), bookingId]));
  } catch {}
}

function formatSessionDate(session: PendingSession): string {
  const d = session.sessionDate ? new Date(session.sessionDate) : null;
  const date = d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return [date, session.sessionTime].filter(Boolean).join(' · ');
}

export function SessionFeedbackPrompt() {
  const { toast } = useToast();
  const [queue, setQueue] = useState<PendingSession[]>([]);
  const [values, setValues] = useState<Partial<Record<ItemKey, number>>>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const client = getClientAuth();
  const clientEmail = client?.email || '';
  const clientId = client?.id || '';

  const loadPending = useCallback(async () => {
    if (!clientEmail && !clientId) return;
    try {
      const params = new URLSearchParams();
      if (clientEmail) params.set('clientEmail', clientEmail);
      if (clientId) params.set('clientId', String(clientId));
      const res = await fetch(`/api/session-feedback/pending?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (data?.success && Array.isArray(data.pending)) {
        const snoozed = readSnoozed();
        setQueue(data.pending.filter((p: PendingSession) => !snoozed.includes(p.bookingId)));
      }
    } catch {}
  }, [clientEmail, clientId]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const current = queue[0];
  const allAnswered = QUESTIONS.every((q) => typeof values[q.key] === 'number');

  const next = () => {
    setValues({});
    setMessage('');
    setQueue((q) => q.slice(1));
  };

  const handleLater = () => {
    if (current) snooze(current.bookingId);
    next();
  };

  const handleSubmit = async () => {
    if (!current || !allAnswered) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/session-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: current.bookingId, ...values, message, clientEmail, clientId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok && res.status !== 409) {
        throw new Error(data?.error || 'Could not send your feedback. Please try again.');
      }
      toast({ title: 'Thank you for your feedback', description: 'Your therapist will use it to shape your next session.' });
      next();
    } catch (err: any) {
      toast({ title: 'Feedback not sent', description: err?.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!current) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleLater(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">How was your session today?</DialogTitle>
          <DialogDescription>
            Your feedback helps us make your therapy experience better. Please share how today's session felt for you.
          </DialogDescription>
          <p className="text-xs font-semibold text-primary pt-1">
            {current.serviceTitle} with {current.consultantName}
            {formatSessionDate(current) && <span className="text-muted-foreground font-normal"> · {formatSessionDate(current)}</span>}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {QUESTIONS.map((q, idx) => {
            const value = values[q.key];
            return (
              <div key={q.key} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{idx + 1}. {q.title}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{q.question}</p>
                  </div>
                  <span className={`shrink-0 min-w-[3rem] text-center rounded-lg px-2 py-1 text-sm font-bold ${typeof value === 'number' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {typeof value === 'number' ? `${value}/10` : '–'}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[value ?? 5]}
                  onValueChange={([v]) => setValues((prev) => ({ ...prev, [q.key]: v }))}
                  className={typeof value === 'number' ? '' : 'opacity-50'}
                  aria-label={q.title}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>0 — {q.low}</span>
                  <span>10 — {q.high}</span>
                </div>
              </div>
            );
          })}

          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">4. Message for Your Therapist <span className="normal-case font-normal">(optional)</span></p>
            <p className="text-sm font-medium text-foreground">
              Is there anything you'd like to share about today's session or any instructions or preferences for your next session?
            </p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Share anything you'd like your therapist to know, or let them know what you'd like to focus on next time."
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleLater} disabled={submitting}>Maybe later</Button>
          <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
            {submitting ? 'Sending…' : 'Submit Feedback'}
          </Button>
        </div>
        {!allAnswered && (
          <p className="text-[11px] text-muted-foreground text-right -mt-1">Move each of the three sliders to answer.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
