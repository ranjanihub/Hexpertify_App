"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Messages for the reasons the website's email/password sign-in refuses (lib/auth.ts) */
const SIGN_IN_ERRORS: Record<string, string> = {
  "Email not found": "No account uses this email. Create an account first.",
  "Wrong password": "That password is not right. Please try again.",
  "No password set": "This account signs in with Google. Use \"Continue with Google\".",
  "Missing fields": "Enter your email and password.",
};

/**
 * Website sign-in shown where a signed-out visitor needs an account (e.g. to pay for a booking):
 * email + password, Google, or a link to create an account that brings them back here.
 */
export default function WebsiteSignIn({ onSignedIn }: { onSignedIn: () => void | Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (!result?.ok || result.error) {
        setError(SIGN_IN_ERRORS[result?.error || ""] || "Could not sign in. Please try again.");
        return;
      }
      await onSignedIn();
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full rounded-[16px] border border-[#D0BCFF] bg-[#F7F2FF] p-4 flex flex-col gap-3">
      <p className="font-semibold text-[18px] text-left">Sign in to book</p>
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate={false}>
        <div className="flex flex-col gap-1 text-left">
          <Label htmlFor="booking-signin-email">Email</Label>
          <Input
            id="booking-signin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white"
          />
        </div>
        <div className="flex flex-col gap-1 text-left">
          <Label htmlFor="booking-signin-password">Password</Label>
          <Input
            id="booking-signin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600 text-left">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="bg-[#450BC8] hover:bg-[#3708a0] text-white rounded-[12px] h-[44px] cursor-pointer">
          {busy ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <Button
        type="button"
        variant="outline"
        onClick={() => signIn("google", { callbackUrl: here })}
        className="rounded-[12px] h-[44px] bg-white cursor-pointer"
      >
        Continue with Google
      </Button>
      <p className="text-sm text-left">
        New to Hexpertify?{" "}
        {/* The one sign-up page (/login); it brings the visitor back here to sign in and finish booking */}
        <a href={`/login?mode=signup&returnTo=${encodeURIComponent(here)}`} className="font-semibold text-[#450BC8] underline">
          Create an account
        </a>
      </p>
    </div>
  );
}
