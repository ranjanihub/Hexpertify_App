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
import { isAdminAuthenticated } from './lib/auth';

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

  // Unsaved Changes Navigation Guard state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingPageId, setPendingPageId] = useState<PageId | null>(null);
  const [saveHandler, setSaveHandler] = useState<(() => void) | null>(null);
  const [discardHandler, setDiscardHandler] = useState<(() => void) | null>(null);

  const executeNavigation = (page: PageId) => {
    const targetPath = pageToPathMap[page] || `/${page}`;
    navigate(targetPath);
    setIsSidebarOpen(false);
    setPendingPageId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPage = (page: PageId) => {
    if (location.pathname === '/homepage' && hasUnsavedChanges && page !== 'homepage') {
      setPendingPageId(page);
      return;
    }
    executeNavigation(page);
  };

  const handleConfirmSaveAndLeave = () => {
    if (saveHandler) {
      saveHandler();
    }
    setHasUnsavedChanges(false);
    if (pendingPageId) {
      executeNavigation(pendingPageId);
    }
  };

  const handleConfirmDiscardAndLeave = () => {
    if (discardHandler) {
      discardHandler();
    }
    setHasUnsavedChanges(false);
    if (pendingPageId) {
      executeNavigation(pendingPageId);
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

  if (location.pathname === '/login' || !isAdminAuthenticated()) {
    window.location.href = '/login?role=admin';
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppProvider>
      <div className="min-h-screen bg-[#f8f9fd] flex font-['Plus_Jakarta_Sans'] text-slate-800 antialiased">
        {/* Sidebar */}
        <Sidebar
          currentPage={getCurrentPageId()}
          onSelectPage={handleSelectPage}
          isOpen={isSidebarOpen}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:pl-64 min-w-0">
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
          onSelectPage={(page) => {
            handleSelectPage(page);
            setIsSearchOpen(false);
          }}
        />

        {/* ── UNSAVED CHANGES NAVIGATION INTERCEPT MODAL ──────────────── */}
        {pendingPageId && createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden my-auto p-6 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#5e2be2] border border-purple-200/80 flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-6 h-6 animate-pulse text-[#5e2be2]" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-[#5e2be2] uppercase tracking-wider block">Unsaved CMS Changes</span>
                  <h4 className="text-lg font-extrabold text-slate-900 leading-tight">Save before leaving?</h4>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                You modified Homepage CMS settings. Do you want to save your changes before navigating to <span className="font-extrabold text-slate-900 capitalize">{pendingPageId}</span>?
              </p>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmSaveAndLeave}
                  className="w-full py-3 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#5e2be2]/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes & Leave</span>
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
                    onClick={() => setPendingPageId(null)}
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
