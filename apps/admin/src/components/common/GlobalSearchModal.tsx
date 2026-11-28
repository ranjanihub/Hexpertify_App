import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ArrowRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../lib/apiClient';
import { searchRecords, type SearchHit } from '../../lib/global-search';
import type { ResourceItem, PageId } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Opens a result: its page, filtered to that record (path carries ?q=) */
  onNavigate: (page: PageId, path: string) => void;
}

/** The spotlight search, opened with Ctrl+K / Cmd+K (App.tsx) and closed with Esc */
export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  // Search covers the live records loaded by the app
  const { therapists, clients, bookings } = useAppContext();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || resourcesLoaded) return;
    api.get('/api/admin/resources')
      .then((data: any) => {
        setResources(Array.isArray(data?.resources) ? data.resources : []);
        setResourcesLoaded(true);
      })
      .catch(() => {});
  }, [isOpen, resourcesLoaded]);

  // A fresh, focused search box each time it opens
  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(
    () => searchRecords(query, { therapists, clients, bookings, resources }),
    [query, therapists, clients, bookings, resources]
  );

  if (!isOpen) return null;

  const open = (hit: SearchHit) => {
    onNavigate(hit.page, hit.path);
    onClose();
  };

  const groups: { label: string; hits: SearchHit[] }[] = [
    { label: 'Therapists', hits: results.therapists },
    { label: 'Clients', hits: results.clients },
    { label: 'Bookings', hits: results.bookings },
    { label: 'Resources', hits: results.resources }
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden mt-2 sm:mt-8 max-h-[88vh] flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#450bc8]" />
          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const first = groups.find((g) => g.hits.length)?.hits[0];
                if (first) open(first);
              }
            }}
            placeholder="Search therapists, clients (name, email, CL- number), bookings, resources..."
            className="flex-1 text-slate-800 placeholder-slate-400 outline-none text-base font-medium min-w-0"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-500"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {!query.trim() && (
            <div className="text-center py-8 text-slate-400 text-sm font-medium">
              Type a name, email, client number (CL-…), booking number (BK-…) or resource title.
            </div>
          )}

          {query.trim() && results.total === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm font-medium">
              No results match "<span className="font-bold">{query}</span>"
            </div>
          )}

          {query.trim() &&
            groups.map(
              (g) =>
                g.hits.length > 0 && (
                  <div key={g.label} className="space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                      {g.label} ({g.hits.length})
                    </span>
                    <div className="space-y-1">
                      {g.hits.slice(0, 20).map((hit) => (
                        <button
                          type="button"
                          key={hit.key}
                          onClick={() => open(hit)}
                          className="w-full text-left p-3 bg-slate-50 hover:bg-purple-50/60 focus:bg-purple-50/60 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 cursor-pointer group transition-colors outline-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {hit.image && (
                              <img src={hit.image} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-100 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 group-hover:text-[#450bc8] truncate">{hit.title}</p>
                              <p className="text-xs text-slate-500 truncate">{hit.subtitle}</p>
                            </div>
                          </div>
                          {hit.badge ? (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-700 shrink-0">{hit.badge}</span>
                          ) : (
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#450bc8] transition-colors shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )
            )}
        </div>
      </div>
    </div>,
    document.body
  );
};
