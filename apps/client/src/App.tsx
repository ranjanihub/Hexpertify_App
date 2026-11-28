import { lazy, Suspense, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

import Layout from '@/components/layout';
import Dashboard from '@/pages/dashboard';
import Login from '@/pages/login';

// Every other page downloads when it is first opened, so the first load only carries login + dashboard
const TherapistPage = lazy(() => import('@/pages/therapist'));
const SessionsPage = lazy(() => import('@/pages/sessions'));
const ActivitiesPage = lazy(() => import('@/pages/activities'));
const AssessmentsPage = lazy(() => import('@/pages/assessments'));
const ProgressPage = lazy(() => import('@/pages/progress'));
const ResourcesPage = lazy(() => import('@/pages/resources'));
const MessagesPage = lazy(() => import('@/pages/messages'));
const ProfilePage = lazy(() => import('@/pages/profile'));

function PageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-8 h-8 border-[3px] border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}
import {
  isClientAuthenticated,
  getClientAuth,
  setClientAuth,
  logoutClient,
  redeemSsoTicket,
  verifyApiSession,
  isAuthenticated as isConsultantAuthenticated,
  isAdminAuthenticated
} from '@/lib/auth';
import { finishLoginLoader } from '@/lib/login-loader';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: false,
    },
  },
});

function ClientAuthGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<'loading' | 'allowed' | 'denied' | 'unauthenticated' | 'error'>('loading');
  const [deniedMessage, setDeniedMessage] = useState<string>('');
  const [redirectTarget, setRedirectTarget] = useState<string>('');
  const [attempt, setAttempt] = useState(0);

  // The sign-in loading screen (from the login page) plays out once there is something to show
  useEffect(() => {
    if (state === 'allowed' || state === 'denied' || state === 'error') finishLoginLoader();
  }, [state]);

  useEffect(() => {
    let isMounted = true;

    const signInAgain = () => {
      logoutClient();
      if (isMounted) {
        setState('unauthenticated');
        setLocation('/login');
      }
    };

    // Only a session the server confirms opens the panel; when the check cannot be made, nothing opens
    const verifyAccess = async () => {
      await redeemSsoTicket();
      const client = getClientAuth();
      if (!client) {
        signInAgain();
        return;
      }

      const session = await verifyApiSession(['client']);
      if (!isMounted) return;
      if (session === 'invalid') {
        signInAgain();
        return;
      }
      if (session === 'error') {
        setState('error');
        return;
      }

      const emailParam = client?.email ? `?email=${encodeURIComponent(client.email)}` : '';

      try {
        const res = await fetch(`/api/client-data${emailParam}`);
        const data = await res.json().catch(() => ({}));

        if (!isMounted) return;

        if (res.status === 401) {
          signInAgain();
          return;
        }

        if (res.status === 403 || data.hasConfirmedBooking === false) {
          setState('denied');
          setDeniedMessage(
            data.error || 
            "Access denied: You do not have a confirmed consultation booking. Please schedule and confirm a consultation session on the live site to access your Client Dashboard."
          );

          const liveUrl = (data.redirectUrl && !data.redirectUrl.includes('localhost'))
            ? data.redirectUrl
            : '/';

          setRedirectTarget(liveUrl);

          setTimeout(() => {
            window.location.href = liveUrl;
          }, 3000);
          return;
        }

        if (res.ok && data.hasConfirmedBooking) {
          if (data.client && client) {
            setClientAuth({
              ...client,
              ...data.client,
            }, false);
          }
          setState('allowed');
        } else {
          setState('error');
        }
      } catch (err) {
        if (isMounted) setState('error');
      }
    };

    // Most reads still answer (with less data) when the token has expired, so a 401 alone can't be relied on:
    // re-check the sign-in when the client comes back to the tab and every few minutes while it stays open.
    // Only a definite "invalid" signs out; a failed check (offline) is left for the next one.
    let lastRecheck = Date.now();
    const recheck = async (force = false) => {
      if (!getClientAuth()) return;
      if (!force && Date.now() - lastRecheck < 30_000) return;
      lastRecheck = Date.now();
      if ((await verifyApiSession(['client'])) === 'invalid' && isMounted) signInAgain();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void recheck();
    };
    const onFocus = () => void recheck();
    const interval = window.setInterval(() => void recheck(true), 5 * 60_000);

    setState('loading');
    verifyAccess();
    // The sign-in ended while the panel was open (expired or revoked): back to the login page
    window.addEventListener('hexpertify_session_expired', signInAgain);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener('hexpertify_session_expired', signInAgain);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [setLocation, attempt]);

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white gap-4">
        <h2 className="text-xl font-bold">We couldn&apos;t check your sign-in</h2>
        <p className="text-sm text-slate-400 max-w-sm">
          Hexpertify could not be reached just now. Check your connection and try again.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="py-2.5 px-6 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-semibold cursor-pointer"
          >
            Try again
          </button>
          <a href="/login" className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium border border-slate-700">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4">
        <div className="w-10 h-10 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400">Verifying consultation booking status...</p>
      </div>
    );
  }

  if (state === 'denied') {
    const liveHref = redirectTarget || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : '/');
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl text-red-400">
            🔒
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Confirmed Consultation Required</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            {deniedMessage}
          </p>
          <div className="bg-red-950/40 border border-red-800/40 rounded-lg p-3 text-xs text-red-300 mb-6">
            Status: <strong>403 Forbidden</strong> • Keeping you on the Hexpertify Live Site until your session is confirmed.
          </div>
          <div className="flex flex-col gap-3">
            <a
              href={liveHref}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-purple-600/25 transition-all text-sm cursor-pointer"
            >
              Return to Live Site Now
            </a>
            <a
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs transition-all cursor-pointer border border-slate-700"
            >
              Back to Login
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-4">Redirecting automatically to the Live Site in 3 seconds...</p>
        </div>
      </div>
    );
  }

  if (state === 'unauthenticated') {
    return null;
  }

  return <>{children}</>;
}

const LEGACY_LOGIN_ROLES: Record<string, string> = {
  '/client/login': 'client',
  '/consultant/login': 'therapist',
  '/admin/login': 'admin',
  '/signin': '',
  '/auth/login': '',
};

function Router() {
  const [location] = useLocation();

  // Route 1: Unified Single-Port Login
  if (location === '/login') {
    return <Login />;
  }
  // Older panel login addresses (e.g. bookmarks, earlier sign-out links) open the same login page
  const legacyLogin = LEGACY_LOGIN_ROLES[location.replace(/\/$/, '')];
  if (legacyLogin !== undefined) {
    window.location.replace(legacyLogin ? `/login?role=${legacyLogin}` : '/login');
    return null;
  }

  // Smart Root Route: If logged in as Admin or Consultant (and NOT logged in as a Client), route accordingly.
  // A full page load serves the dedicated Super Admin / Consultant panel builds at those paths.
  if (location === '/') {
    if (!isClientAuthenticated()) {
      if (isAdminAuthenticated()) {
        window.location.replace('/admin');
        return null;
      }
      if (isConsultantAuthenticated()) {
        window.location.replace('/consultant');
        return null;
      }
    }
  }

  // The admin and therapist panels are their own apps (apps/admin, apps/consultant)
  if (location.startsWith('/admin') || location.startsWith('/consultant')) {
    window.location.replace(location.startsWith('/admin') ? '/admin' : '/consultant');
    return null;
  }

  // Client Care Portal
  return (
    <ClientAuthGuard>
      <Layout>
        <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/client" component={Dashboard} />
          <Route path="/client/therapist" component={TherapistPage} />
          <Route path="/therapist" component={TherapistPage} />
          <Route path="/client/sessions" component={SessionsPage} />
          <Route path="/sessions" component={SessionsPage} />
          <Route path="/client/activities" component={ActivitiesPage} />
          <Route path="/client/activities/:slug" component={ActivitiesPage} />
          <Route path="/activities" component={ActivitiesPage} />
          <Route path="/activities/:slug" component={ActivitiesPage} />
          <Route path="/client/assessments" component={AssessmentsPage} />
          <Route path="/assessments" component={AssessmentsPage} />
          <Route path="/client/progress" component={ProgressPage} />
          <Route path="/progress" component={ProgressPage} />
          <Route path="/client/resources" component={ResourcesPage} />
          <Route path="/resources" component={ResourcesPage} />
          <Route path="/client/messages" component={MessagesPage} />
          <Route path="/messages" component={MessagesPage} />
          <Route path="/client/profile" component={ProfilePage} />
          <Route path="/profile" component={ProfilePage} />
          <Route component={NotFound} />
        </Switch>
        </Suspense>
      </Layout>
    </ClientAuthGuard>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
