import { lazy, Suspense, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AppLayout } from '@/components/layout';

import Dashboard from '@/pages/dashboard';

// Every other page downloads when it is first opened, so the first load only carries the dashboard
const Clients = lazy(() => import('@/pages/clients'));
const ClientDetail = lazy(() => import('@/pages/client-detail'));
const Calendar = lazy(() => import('@/pages/calendar'));
const Outcomes = lazy(() => import('@/pages/outcomes'));
const Revenue = lazy(() => import('@/pages/revenue'));
const Reviews = lazy(() => import('@/pages/reviews'));
const Resources = lazy(() => import('@/pages/resources'));
const Assessments = lazy(() => import('@/pages/assessments'));
const Activities = lazy(() => import('@/pages/activities'));
const Messages = lazy(() => import('@/pages/messages'));
const Blog = lazy(() => import('@/pages/blog'));
const HtmlChunkPages = lazy(() => import('@/pages/html-chunk-pages'));
const HtmlChunkEditor = lazy(() => import('@/pages/html-chunk-editor'));
const PublicHtmlChunkPage = lazy(() => import('@/pages/public-html-chunk-page'));
const Profile = lazy(() => import('@/pages/profile'));

function PageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-8 h-8 border-[3px] border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}
import { isAuthenticated, logoutUser, redeemSsoTicket, verifyApiSession } from '@/lib/auth';
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

/**
 * Opens the panel only for a therapist session the server confirms (signed API token checked with
 * /api/auth/whoami). A stored user alone is not enough; when the check cannot be made, nothing opens.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // The sign-in loading screen (from the login page) plays out once there is something to show
  useEffect(() => {
    if (authenticated || checkFailed) finishLoginLoader();
  }, [authenticated, checkFailed]);

  useEffect(() => {
    let isMounted = true;
    const toLogin = () => {
      window.location.href = '/login?role=therapist';
    };

    const verify = async () => {
      setCheckFailed(false);
      await redeemSsoTicket();
      if (!isAuthenticated()) {
        if (isMounted) setAuthenticated(false);
        toLogin();
        return;
      }
      const session = await verifyApiSession();
      if (!isMounted) return;
      if (session === 'invalid') {
        logoutUser();
        setAuthenticated(false);
        toLogin();
        return;
      }
      if (session === 'error') {
        setCheckFailed(true);
        return;
      }
      setAuthenticated(true);
    };

    // Signing out (here or in another part of the panel) leaves for the login page
    const onAuthChange = () => {
      if (!isAuthenticated()) {
        setAuthenticated(false);
        toLogin();
      }
    };

    // The server says the sign-in has ended (expired or revoked) while the panel was open
    const onSessionExpired = () => {
      logoutUser();
      setAuthenticated(false);
      toLogin();
    };

    // Signing out in another tab removes the stored user or token; 'storage' only fires in the other tabs
    // (key null = storage cleared). Without the token this tab's requests would all be refused.
    const onStorage = (e: StorageEvent) => {
      const signedOut = e.key === null || ((e.key === 'hexpertify_auth_user' || e.key === 'hexpertify_api_token') && !e.newValue);
      // The other tab already cleared the sign-in; only leave (clearing again could wipe a fresh sign-in there)
      if (signedOut) {
        setAuthenticated(false);
        toLogin();
      }
    };

    // Most reads still answer (with less data) when the token has expired, so a 401 alone can't be relied on:
    // re-check the sign-in when the therapist comes back to the tab and every few minutes while it stays open.
    // Only a definite "invalid" signs out; a failed check (offline) is left for the next one.
    let lastRecheck = Date.now();
    const recheck = async (force = false) => {
      if (!isAuthenticated()) return onAuthChange();
      if (!force && Date.now() - lastRecheck < 30_000) return;
      lastRecheck = Date.now();
      if ((await verifyApiSession()) === 'invalid' && isMounted) onSessionExpired();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void recheck();
    };
    const onFocus = () => void recheck();
    const interval = window.setInterval(() => void recheck(true), 5 * 60_000);

    verify();
    window.addEventListener('auth_state_change', onAuthChange);
    window.addEventListener('hexpertify_session_expired', onSessionExpired);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener('auth_state_change', onAuthChange);
      window.removeEventListener('hexpertify_session_expired', onSessionExpired);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [attempt]);

  if (checkFailed) {
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
          <a href="/login?role=therapist" className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium border border-slate-700">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  const [location] = useLocation();
  if (location === '/login') {
    window.location.href = '/login?role=therapist';
    return null;
  }

  return (
    <Suspense fallback={<PageFallback />}>
    <Switch>
      <Route path="/p/:slug" component={PublicHtmlChunkPage} />
      <Route>
        {() => (
          <AuthGuard>
            <AppLayout>
              <Suspense fallback={<PageFallback />}>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/clients" component={Clients} />
                <Route path="/clients/:id" component={ClientDetail} />
                <Route path="/calendar" component={Calendar} />
                <Route path="/messages" component={Messages} />
                <Route path="/outcomes" component={Outcomes} />
                <Route path="/revenue" component={Revenue} />
                <Route path="/reviews" component={Reviews} />
                <Route path="/resources" component={Resources} />
                <Route path="/assessments" component={Assessments} />
                <Route path="/activities" component={Activities} />
                <Route path="/blog" component={Blog} />

                <Route path="/html-chunk-pages" component={HtmlChunkPages} />
                <Route path="/html-chunk-pages/new" component={HtmlChunkEditor} />
                <Route path="/html-chunk-pages/:id/edit" component={HtmlChunkEditor} />
                <Route path="/profile" component={Profile} />
                <Route component={NotFound} />
              </Switch>
              </Suspense>
            </AppLayout>
          </AuthGuard>
        )}
      </Route>
    </Switch>
    </Suspense>
  );
}

function App() {
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
