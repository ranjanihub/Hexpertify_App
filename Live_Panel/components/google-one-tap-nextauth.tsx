"use client";

import { useEffect, useCallback, useState, useRef } from "react";
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
  use_fedcm_for_prompt?: boolean;
  itp_support?: boolean;
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
  getMomentType: () => string;
}

export function GoogleOneTapNextAuth() {
  const { data: session, status } = useSession();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const isPromptedRef = useRef(false);

  // Suppress benign GSI / FedCM abort errors that trigger Next.js console error overlays
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalConsoleError = console.error;
    const consoleErrorHandler = (...args: any[]) => {
      const firstArg = typeof args[0] === "string" ? args[0] : "";
      if (
        (firstArg.includes("[GSI_LOGGER]") || firstArg.includes("FedCM")) &&
        (firstArg.includes("AbortError") || firstArg.includes("signal is aborted"))
      ) {
        // Benign Google Identity Services FedCM abort (user dismissed, tapped outside, or unmounted)
        return;
      }
      originalConsoleError.apply(console, args);
    };

    console.error = consoleErrorHandler;

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (
        reason?.name === "AbortError" ||
        (typeof reason?.message === "string" &&
          (reason.message.includes("signal is aborted") || reason.message.includes("FedCM")))
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", rejectionHandler);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener("unhandledrejection", rejectionHandler);
      try {
        if (window.google?.accounts?.id && isPromptedRef.current) {
          isPromptedRef.current = false;
          window.google.accounts.id.cancel();
        }
      } catch {
        // ignore
      }
    };
  }, []);

  const handleCredentialResponse = useCallback(
    async (response: CredentialResponse) => {
      try {
        const isProd = typeof window !== "undefined" && (window.location.hostname.includes("vercel.app") || window.location.hostname.includes("hexpertify"));
        const centralAuthUrl = isProd
          ? "https://hexpertify-backend.vercel.app/api/auth/google"
          : "http://localhost:5000/api/auth/google";

        // Authenticate with central auth API to determine user role and target panel
        const res = await fetch(centralAuthUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        const data = await res.json();
        if (data?.success) {
          const targetUrl = data.redirectUrl || (
            data.role === "super_admin" || data.role === "admin"
              ? (isProd ? "https://hexpertify-backend.vercel.app/admin" : "http://localhost:5000/admin")
              : data.role === "therapist"
              ? (isProd ? "https://hexpertify-backend.vercel.app/consultant" : "http://localhost:5000/consultant")
              : (isProd ? "https://hexpertify-backend.vercel.app/client" : "http://localhost:5000/client")
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
    if (!window.google || session || !clientId || isPromptedRef.current) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: "signin",
        use_fedcm_for_prompt: false,
        itp_support: true,
      });

      isPromptedRef.current = true;
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          isPromptedRef.current = false;
        } else if (notification.isDismissedMoment() || notification.isSkippedMoment()) {
          isPromptedRef.current = false;
        }
      });
    } catch {
      isPromptedRef.current = false;
    }
  }, [clientId, session, handleCredentialResponse]);

  useEffect(() => {
    if (isScriptLoaded && !session && status === "unauthenticated") {
      const timer = setTimeout(() => {
        initializeOneTap();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isScriptLoaded, session, status, initializeOneTap]);

  useEffect(() => {
    if (session) {
      isPromptedRef.current = false;
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        // ignore
      }
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
