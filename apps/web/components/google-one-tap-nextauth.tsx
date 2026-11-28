"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { redirectToPanel } from "@/lib/panel-redirect";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";

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
  const router = useRouter();
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const isPromptedRef = useRef(false);
  const fedcmNoticeShownRef = useRef(false);

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
      if (firstArg.includes("[GSI_LOGGER]") && firstArg.includes("FedCM")) {
        // Google refused to issue the sign-in token (most often: this site's address is not an Authorized
        // JavaScript origin of the Google OAuth client). Not an app crash: warn instead of the dev error overlay.
        console.warn(...args);
        if (!fedcmNoticeShownRef.current) {
          fedcmNoticeShownRef.current = true;
          toast.error("Google sign-in is not available right now", {
            description: "Please sign in with your email and password instead.",
          });
        }
        return;
      }
      if (firstArg.includes("[GSI_LOGGER]")) {
        // Any other Google Identity Services notice (e.g. "Check credential status returns invalid response":
        // the visitor is not signed in to Google, third-party cookies are blocked, or this address is not an
        // Authorized JavaScript origin). One Tap just doesn't show; the other sign-in options still work.
        console.warn(...args);
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
      if (!response?.credential) return;

      // 1. The platform API (same domain): admins, therapists and clients with a completed session go to their panel
      let apiError = "";
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          const targetUrl = data.redirectUrl || (
            data.role === "super_admin" || data.role === "admin"
              ? "/admin"
              : data.role === "therapist"
              ? "/consultant"
              : "/client"
          );
          redirectToPanel(targetUrl, data);
          return;
        }
        apiError = data?.error || `Sign-in was refused (HTTP ${res.status}).`;
        console.warn("[Google One Tap] API sign-in refused:", res.status, apiError);
      } catch (err) {
        console.error("[Google One Tap] API sign-in failed:", err);
      }

      // 2. Not a panel user yet (e.g. a client before the first completed session): sign in to the website itself
      const result = await signIn("google-one-tap", {
        credential: response.credential,
        redirect: false,
      }).catch((err) => {
        console.error("[Google One Tap] website sign-in failed:", err);
        return undefined;
      });

      if (result?.ok && !result.error) {
        toast.success("Signed in with Google", apiError ? { description: apiError } : undefined);
        router.refresh();
        return;
      }
      toast.error("Google sign-in failed", {
        description: apiError || result?.error || "Please try again, or sign in with your email and password.",
      });
    },
    [router],
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
      // After the page has loaded (afterInteractive preloaded it in <head>, competing with the page's own
      // files); the prompt only ever opened after a 500 ms delay anyway
      strategy="lazyOnload"
    />
  );
}
