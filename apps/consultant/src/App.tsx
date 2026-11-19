import { lazy, Suspense, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AppLayout } from '@/components/layout';

import Login from '@/pages/login';

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
import { isAuthenticated } from '@/lib/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: false,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = isAuthenticated();
      setAuthenticated(isAuth);
      if (!isAuth) {
        window.location.href = '/login?role=therapist';
      }
    };

    checkAuth();
    window.addEventListener('auth_state_change', checkAuth);
    return () => window.removeEventListener('auth_state_change', checkAuth);
  }, [setLocation]);

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
