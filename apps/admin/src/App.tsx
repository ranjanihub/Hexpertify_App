import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Save, RotateCcw } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { DashboardView } from './pages/DashboardView';

// Every other page downloads when it is first opened, so the first load only carries the dashboard
const BookingsView = React.lazy(() => import('./pages/BookingsView').then((m) => ({ default: m.BookingsView })));
const PaymentsView = React.lazy(() => import('./pages/PaymentsView').then((m) => ({ default: m.PaymentsView })));
const RevenueView = React.lazy(() => import('./pages/RevenueView').then((m) => ({ default: m.RevenueView })));
const TransactionsView = React.lazy(() => import('./pages/TransactionsView').then((m) => ({ default: m.TransactionsView })));
const TherapistsView = React.lazy(() => import('./pages/TherapistsView').then((m) => ({ default: m.TherapistsView })));
const AvailabilityView = React.lazy(() => import('./pages/AvailabilityView').then((m) => ({ default: m.AvailabilityView })));
const ClientsView = React.lazy(() => import('./pages/ClientsView').then((m) => ({ default: m.ClientsView })));
const ActivitiesView = React.lazy(() => import('./pages/ActivitiesView').then((m) => ({ default: m.ActivitiesView })));
const LogsView = React.lazy(() => import('./pages/LogsView').then((m) => ({ default: m.LogsView })));
const AssessmentsView = React.lazy(() => import('./pages/AssessmentsView').then((m) => ({ default: m.AssessmentsView })));
const AssetsView = React.lazy(() => import('./pages/AssetsView').then((m) => ({ default: m.AssetsView })));
const ProfessionsView = React.lazy(() => import('./pages/ProfessionsView').then((m) => ({ default: m.ProfessionsView })));
const ResourcesView = React.lazy(() => import('./pages/ResourcesView').then((m) => ({ default: m.ResourcesView })));
const HomepageView = React.lazy(() => import('./pages/HomepageView').then((m) => ({ default: m.HomepageView })));
const ZombiView = React.lazy(() => import('./pages/ZombiView').then((m) => ({ default: m.ZombiView })));
const SettingsView = React.lazy(() => import('./pages/SettingsView').then((m) => ({ default: m.SettingsView })));
const ReviewView = React.lazy(() => import('./pages/ReviewView').then((m) => ({ default: m.ReviewView })));

function PageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-8 h-8 border-[3px] border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}
import {
  checkAdminSession,
  clearAdminAuth,
  isAdminAuthenticated,
  rememberAdminReturnPath,
  takeAdminReturnPath
} from './lib/auth';
import { finishLoginLoader } from './lib/login-loader';

import type { PageId } from './types';

const pageToPathMap: Record<PageId, string> = {
  dashboard: '/',
  bookings: '/bookings',
  payments: '/payments',
  transactions: '/transactions',
  revenue: '/revenue',
  therapists: '/therapists',
  availability: '/availability',
  clients: '/clients',
  activities: '/activities',
  logs: '/logs',
  assessments: '/assessments',
  resources: '/resources',
  assets: '/assets',
  professions: '/professions',
  review: '/review',
  homepage: '/homepage',
  zombi: '/zombie-pages',
  settings: '/settings',
};

const TherapistsRouteWrapper: React.FC<{
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
}> = ({ isAddModalOpen, onCloseAddModal }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const hasAddQuery = searchParams.get('add') === 'true';
  const hasAddState = Boolean(location.state?.openAddModal);
  const shouldOpenAdd = isAddModalOpen || hasAddQuery || hasAddState;

  const handleClose = () => {
    onCloseAddModal();
    if (hasAddQuery || hasAddState) {
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.delete('add');
      const searchString = newSearchParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: searchString ? `?${searchString}` : '',
        },
        { replace: true, state: {} }
      );
    }
  };

  return (
    <TherapistsView
      isAddModalOpen={shouldOpenAdd}
      onCloseAddModal={handleClose}
    />
  );
};

export const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddTherapistModalOpen, setIsAddTherapistModalOpen] = useState(false);

  // The server must accept the stored token as an active admin's before anything is shown (null = still checking)
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);
  // The first check could not be made (offline / server down): offer a retry instead of signing out
  const [checkFailed, setCheckFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  React.useEffect(() => {
    let cancelled = false;
    // Signed out, expired or switched off: forget the sign-in and cached data, then go to the login page
    // (the open page is reopened after signing in again, except after signing out on purpose)
    const endSession = (remember = true) => {
      if (cancelled) return;
      if (remember) rememberAdminReturnPath(window.location.pathname.replace(/^\/admin(?=\/|$)/, '') + window.location.search);
      clearAdminAuth();
      setSessionOk(false);
    };
    const onExpired = () => endSession(true);

    if (!isAdminAuthenticated()) {
      setSessionOk(false);
      return;
    }
    setCheckFailed(false);
    checkAdminSession().then((state) => {
      if (cancelled) return;
      if (state === 'invalid') return endSession();
      if (state === 'error') return setCheckFailed(true);
      setSessionOk(true);
    });

    // Most reads still answer (with less data) when the token has expired, so a 401 alone can't be relied on:
    // re-check the sign-in when the admin comes back to the tab and every 5 minutes while it stays open.
    // Only a definite "invalid" signs out; a failed check (offline) is left for the next one.
    let lastRecheck = Date.now();
    const recheck = async (force = false) => {
      if (!isAdminAuthenticated()) return endSession(false);
      if (!force && Date.now() - lastRecheck < 30_000) return;
      lastRecheck = Date.now();
      if ((await checkAdminSession()) === 'invalid') endSession();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void recheck();
    };
    const onFocus = () => void recheck();
    const onAuthChange = () => {
      if (!isAdminAuthenticated()) endSession(false);
    };
    // Signing out in another tab removes the token; 'storage' only fires in the other tabs (key null = cleared)
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || ((e.key === 'hexpertify_api_token' || e.key === 'hexpertify_admin_auth') && !e.newValue)) {
        setSessionOk(false);
      }
    };
    const interval = window.setInterval(() => void recheck(true), 5 * 60_000);
    window.addEventListener('hexpertify_session_expired', onExpired);
    window.addEventListener('auth_state_change', onAuthChange);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('hexpertify_session_expired', onExpired);
      window.removeEventListener('auth_state_change', onAuthChange);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [attempt]);

  // The sign-in loading screen (from the login page) plays out once there is something to show
  React.useEffect(() => {
    if (sessionOk || checkFailed) finishLoginLoader();
  }, [sessionOk, checkFailed]);

  // After signing in again, go back to the admin page that was open when the session ended
  React.useEffect(() => {
    if (!sessionOk) return;
    const back = takeAdminReturnPath();
    if (back && back !== location.pathname + location.search) navigate(back, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionOk]);

  // Ctrl+K / Cmd+K opens the search from any page (Esc closes it, in the modal)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Unsaved Changes Navigation Guard state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Latest value for the save-and-leave check (the page reports it after its save finishes)
  const unsavedRef = React.useRef(false);
  React.useEffect(() => {
    unsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);
  const [pendingPageId, setPendingPageId] = useState<PageId | null>(null);
  // The exact place to open when the guard lets the admin leave (e.g. a search result: /clients?q=CL-00001)
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [saveHandler, setSaveHandler] = useState<(() => unknown) | null>(null);
  const [discardHandler, setDiscardHandler] = useState<(() => void) | null>(null);
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);
  const [saveBeforeLeaveError, setSaveBeforeLeaveError] = useState<string | null>(null);

  const executeNavigation = (page: PageId, path?: string) => {
    const targetPath = path || pageToPathMap[page] || `/${page}`;
    navigate(targetPath);
    setIsSidebarOpen(false);
    setPendingPageId(null);
    setPendingPath(null);
    setSaveBeforeLeaveError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Every in-app navigation goes through here, so unsaved homepage changes are never left without asking */
  const handleSelectPage = (page: PageId, path?: string) => {
    if (location.pathname === '/homepage' && hasUnsavedChanges && page !== 'homepage') {
      setPendingPageId(page);
      setPendingPath(path || null);
      return;
    }
    executeNavigation(page, path);
  };

  // Leaves only once the save has gone through; a failed save keeps the admin on the page with the error
  const handleConfirmSaveAndLeave = async () => {
    if (!pendingPageId) return;
    setIsSavingBeforeLeave(true);
    setSaveBeforeLeaveError(null);
    try {
      if (saveHandler) await Promise.resolve(saveHandler());
      // The homepage reports its unsaved state after a save; still unsaved means the save failed (it says why)
      for (let i = 0; i < 10 && unsavedRef.current; i++) await new Promise((r) => setTimeout(r, 100));
      if (unsavedRef.current) {
        setSaveBeforeLeaveError('The changes were not saved, so you are still on this page.');
        return;
      }
      setHasUnsavedChanges(false);
      executeNavigation(pendingPageId, pendingPath || undefined);
    } catch (err: any) {
      setSaveBeforeLeaveError(err?.message || 'The changes could not be saved.');
    } finally {
      setIsSavingBeforeLeave(false);
    }
  };

  const handleConfirmDiscardAndLeave = () => {
    if (discardHandler) {
      discardHandler();
    }
    setHasUnsavedChanges(false);
    if (pendingPageId) {
      executeNavigation(pendingPageId, pendingPath || undefined);
    }
  };

  const handleOpenAddTherapist = () => {
    setIsAddTherapistModalOpen(true);
    navigate('/therapists', { state: { openAddModal: true } });
  };

  const getCurrentPageId = (): PageId => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path.startsWith('/review/')) return 'review';
    const match = Object.entries(pageToPathMap).find(([_, p]) => p === path);
    return match ? (match[0] as PageId) : 'dashboard';
  };

  if (checkFailed && !sessionOk) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white gap-4">
        <h2 className="text-xl font-bold">We couldn&apos;t check your sign-in</h2>
        <p className="text-sm text-slate-400 max-w-sm">
          Hexpertify could not be reached just now. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="px-5 py-2.5 rounded-xl bg-[#450bc8] hover:bg-[#3a0aa8] text-sm font-bold"
        >
          Try again
        </button>
      </div>
    );
  }

  if (location.pathname === '/login' || sessionOk === false || !isAdminAuthenticated()) {
    // A deep link opened while signed out (/admin/transactions) is reopened after signing in
    if (sessionOk !== false && location.pathname !== '/login') {
      rememberAdminReturnPath(location.pathname + location.search);
    }
    window.location.href = '/login?role=admin';
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (sessionOk === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center" aria-label="Checking sign-in">
        <div className="w-8 h-8 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppProvider>
      <div className="min-h-screen bg-[#fcfbff] flex font-['Open_Sans'] text-slate-800 antialiased">
        {/* Sidebar */}
        <Sidebar
          currentPage={getCurrentPageId()}
          onSelectPage={handleSelectPage}
          isOpen={isSidebarOpen}
        />
        {/* Tap-outside backdrop while the sidebar is a drawer (below lg) */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
          {/* Top Navigation Header */}
          <TopNav
            onOpenSearch={() => setIsSearchOpen(true)}
            onSelectPage={handleSelectPage}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onAddTherapist={handleOpenAddTherapist}
          />

          {/* Dynamic Page Views */}
          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
            <ErrorBoundary fallbackTitle="View Rendering Issue">
              <React.Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<DashboardView onSelectPage={handleSelectPage} />} />
                <Route path="/dashboard" element={<DashboardView onSelectPage={handleSelectPage} />} />
                <Route path="/bookings" element={<BookingsView />} />
                <Route path="/payments" element={<PaymentsView />} />
                <Route path="/transactions" element={<TransactionsView />} />
                <Route path="/revenue" element={<RevenueView />} />
                <Route
                  path="/therapists"
                  element={
                    <TherapistsRouteWrapper
                      isAddModalOpen={isAddTherapistModalOpen}
                      onCloseAddModal={() => setIsAddTherapistModalOpen(false)}
                    />
                  }
                />
                <Route path="/availability" element={<AvailabilityView />} />
                <Route path="/clients" element={<ClientsView />} />
                <Route path="/activities" element={<ActivitiesView />} />
                <Route path="/logs" element={<LogsView />} />
                <Route path="/audit-logs" element={<LogsView />} />
                <Route path="/assessments" element={<AssessmentsView />} />
                <Route path="/resources" element={<ResourcesView />} />
                <Route path="/assets" element={<AssetsView />} />
                <Route path="/professions" element={<ProfessionsView />} />
                <Route
                  path="/homepage"
                  element={
                    <HomepageView
                      onUnsavedChangesChange={(unsaved) => setHasUnsavedChanges(unsaved)}
                      onRegisterSaveHandler={(fn) => setSaveHandler(() => fn)}
                      onRegisterDiscardHandler={(fn) => setDiscardHandler(() => fn)}
                    />
                  }
                />
                <Route path="/zombie-pages" element={<ZombiView />} />
                <Route path="/zombi" element={<Navigate to="/zombie-pages" replace />} />
                <Route path="/review" element={<ReviewView />} />
                <Route path="/review/outline/:outlineId" element={<ReviewView />} />
                <Route path="/review/:postId" element={<ReviewView />} />
                <Route path="/reviews" element={<ReviewView />} />
                <Route path="/blog-reviews" element={<ReviewView />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </React.Suspense>
            </ErrorBoundary>
          </main>
        </div>

        {/* Global Spotlight Search Modal (⌘ K) */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onNavigate={(page, path) => {
            handleSelectPage(page, path);
            setIsSearchOpen(false);
          }}
        />

        {/* ── UNSAVED CHANGES NAVIGATION INTERCEPT MODAL ──────────────── */}
        {pendingPageId && createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 max-h-[90dvh] overflow-y-auto my-auto p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#450bc8] border border-purple-200/80 flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-6 h-6 animate-pulse text-[#450bc8]" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-[#450bc8] uppercase tracking-wider block">Unsaved CMS Changes</span>
                  <h4 className="text-lg font-extrabold text-slate-900 leading-tight">Save before leaving?</h4>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                You changed the homepage. Do you want to save your changes before navigating to <span className="font-extrabold text-slate-900 capitalize">{pendingPageId}</span>?
              </p>

              <div className="flex flex-col gap-2.5 pt-2">
                {saveBeforeLeaveError && (
                  <p role="alert" className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                    {saveBeforeLeaveError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleConfirmSaveAndLeave}
                  disabled={isSavingBeforeLeave}
                  className="w-full py-3 bg-[#450bc8] hover:bg-[#3a0aa8] disabled:opacity-60 text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#450bc8]/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingBeforeLeave ? 'Saving…' : 'Save Changes & Leave'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmDiscardAndLeave}
                    className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs rounded-xl border border-rose-200/80 transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Discard & Leave</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPendingPageId(null);
                      setPendingPath(null);
                      setSaveBeforeLeaveError(null);
                    }}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                  >
                    Stay on Page
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </AppProvider>
  );
};

export default App;
