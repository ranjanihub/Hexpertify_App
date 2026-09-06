"use client";

import { useEffect, useCallback, useState } from "react";
import Script from "next/script";
import { signIn, useSession } from "next-auth/react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleOneTapConfig) => void;
          prompt: (
            callback?: (notification: PromptNotification) => void,
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleOneTapConfig {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: "signin" | "signup" | "use";
}

interface CredentialResponse {
  credential: string;
  select_by: string;
}

interface PromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
  getDismissedReason: () => string;
}

export function GoogleOneTapNextAuth() {
  const { data: session, status } = useSession();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = useCallback(
    async (response: CredentialResponse) => {
      try {
        // Authenticate with central auth API to determine user role and target panel
        const res = await fetch("http://localhost:5000/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        const data = await res.json();
        if (data?.success) {
          const targetUrl = data.redirectUrl || (
            data.role === "super_admin" || data.role === "admin"
              ? "http://localhost:5000/admin"
              : data.role === "therapist"
              ? "http://localhost:5000/consultant"
              : "http://localhost:5000/client"
          );
          const ssoUserParam = encodeURIComponent(JSON.stringify(data.user));
          const ssoTicketParam = data.ssoTicket ? `&sso_ticket=${encodeURIComponent(data.ssoTicket)}` : "";
          const delimiter = targetUrl.includes("?") ? "&" : "?";
          window.location.href = `${targetUrl}${delimiter}sso_user=${ssoUserParam}${ssoTicketParam}`;
          return;
        }

        // Fallback to NextAuth signIn if central verification fails
        await signIn("google-one-tap", {
          credential: response.credential,
          redirect: false,
        });
      } catch {
        return;
      }
    },
    [],
  );

  const initializeOneTap = useCallback(() => {
    if (!window.google || session || !clientId) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: "signin",
      });

      window.google.accounts.id.prompt();
    } catch {
      return;
    }
  }, [clientId, session, handleCredentialResponse]);

  useEffect(() => {
    if (isScriptLoaded && !session && status !== "loading") {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeOneTap();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isScriptLoaded, session, status, initializeOneTap]);

  useEffect(() => {
    if (session) {
      window.google?.accounts.id.cancel();
    }
  }, [session]);

  // Don't render if already authenticated
  if (session || !clientId) return null;

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      onLoad={() => setIsScriptLoaded(true)}
      strategy="afterInteractive"
    />
  );
}
