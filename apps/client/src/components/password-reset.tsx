import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * "Forgot password?" on the client sign-in form: sends a single-use link (30 minutes) to the email.
 * The answer is the same whether or not the email has an account.
 */
export function ForgotPassword({ initialEmail = "" }: { initialEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setResult({ ok: false, text: "Please enter the email address of your account." });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      setResult(res.ok ? { ok: true, text: data?.message || "Check your email for a link to set a new password." } : { ok: false, text: data?.error || "Could not send the link. Please try again." });
    } catch {
      setResult({ ok: false, text: "Hexpertify could not be reached. Please check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setEmail(initialEmail);
          setOpen(true);
        }}
        className="text-xs font-semibold text-[#450bc8] hover:underline cursor-pointer py-2 -my-2 sm:py-1 sm:-my-1"
      >
        Forgot password?
      </button>
    );
  }

  // Not a <form>: it sits inside the sign-in form, and a nested form would submit the sign-in instead
  return (
    <div role="group" aria-label="Forgot password" className="rounded-2xl border border-[#e4d9fb] bg-[#f7f2ff] p-3.5 space-y-2.5">
      <p className="text-xs font-semibold text-slate-700">We'll email you a link to set a new password.</p>
      <Label htmlFor="forgot-email" className="sr-only">
        Email address
      </Label>
      <Input
        id="forgot-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            send();
          }
        }}
        placeholder="you@example.com"
        className="bg-white"
      />
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`text-xs ${result.ok ? "text-emerald-700" : "text-red-600"}`}>
          {result.text}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button type="button" onClick={send} disabled={busy} className="h-9 rounded-full bg-[#450bc8] hover:bg-[#3708a0] text-white text-xs font-bold">
          {busy ? "Sending..." : "Send link"}
        </Button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer px-1 py-2.5 sm:py-1">
          Back to sign in
        </button>
      </div>
    </div>
  );
}

/**
 * Opened from the emailed link (/login?reset=<token>): the client chooses a new password.
 * Renders nothing when there is no reset link in the address.
 */
export function ResetPasswordPanel({ onDone }: { onDone: (message: string) => void }) {
  const [token] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("reset") || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);

  // The link should not stay in the address bar (or the browser history) once read
  useEffect(() => {
    if (!token) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("reset");
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ""));
    } catch {}
  }, [token]);

  if (!token || finished) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords are different.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.error || "Could not change the password. Please try again.");
        return;
      }
      setFinished(true);
      onDone(data.message || "Your password has been changed. You can sign in with it now.");
    } catch {
      setError("Hexpertify could not be reached. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="reset-title" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-3 max-h-[90dvh] overflow-y-auto my-auto">
        <h2 id="reset-title" className="text-lg font-extrabold text-slate-900">
          Set a new password
        </h2>
        <div className="space-y-1.5">
          <Label htmlFor="reset-password">New password</Label>
          <Input id="reset-password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm">Repeat the new password</Label>
          <Input id="reset-confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full rounded-full bg-[#450bc8] hover:bg-[#3708a0] text-white font-bold">
          {busy ? "Saving..." : "Save new password"}
        </Button>
      </form>
    </div>
  );
}
