import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ArrowRight } from 'lucide-react';
import { mockTherapists, mockClients, mockBookings, mockResources } from '../../data/mockData';
import type { PageId } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (page: PageId) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectPage
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTherapists = mockTherapists.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.profession.toLowerCase().includes(query.toLowerCase())
  );

  const filteredClients = mockClients.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.email.toLowerCase().includes(query.toLowerCase())
  );

  const filteredBookings = mockBookings.filter((b) =>
    b.clientName.toLowerCase().includes(query.toLowerCase()) ||
    b.therapistName.toLowerCase().includes(query.toLowerCase()) ||
    b.bookingCode.toLowerCase().includes(query.toLowerCase())
  );

  const filteredResources = mockResources.filter((r) =>
    r.title.toLowerCase().includes(query.toLowerCase()) ||
    r.description.toLowerCase().includes(query.toLowerCase()) ||
    r.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-6 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden mt-2 sm:mt-8 max-h-[88vh] flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#5e2be2]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search therapists, clients, bookings, payouts..."
            className="flex-1 text-slate-800 placeholder-slate-400 outline-none text-base font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-semibold text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {!query && (
            <div className="text-center py-8 text-slate-400 text-sm font-medium">
              Type a name, booking code, or service to search across Hexpertify Admin platform.
            </div>
          )}

          {query && (
            <>
              {/* Therapist Results */}
              {filteredTherapists.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                    Therapists ({filteredTherapists.length})
                  </span>
                  <div className="space-y-1">
                    {filteredTherapists.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onSelectPage('therapists');
                          onClose();
                        }}
                        className="p-3 bg-slate-50 hover:bg-purple-50/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img src={t.photo} alt={t.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-100" />
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-[#5e2be2]">{t.name}</p>
                            <p className="text-xs text-slate-500">{t.profession}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#5e2be2] transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Results */}
              {filteredClients.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                    Clients ({filteredClients.length})
                  </span>
                  <div className="space-y-1">
                    {filteredClients.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onSelectPage('clients');
                          onClose();
                        }}
                        className="p-3 bg-slate-50 hover:bg-purple-50/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img src={c.avatar} alt={c.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-100" />
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-[#5e2be2]">{c.name}</p>
                            <p className="text-xs text-slate-500">{c.email}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#5e2be2] transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Booking Results */}
              {filteredBookings.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                    Bookings ({filteredBookings.length})
                  </span>
                  <div className="space-y-1">
                    {filteredBookings.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          onSelectPage('bookings');
                          onClose();
                        }}
                        className="p-3 bg-slate-50 hover:bg-purple-50/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer group transition-colors"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">{b.bookingCode} - {b.clientName}</p>
                          <p className="text-xs text-slate-500">{b.service} with {b.therapistName} ({b.time})</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-700">
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resource Results */}
              {filteredResources.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-mono">
                    Resources ({filteredResources.length})
                  </span>
                  <div className="space-y-1">
                    {filteredResources.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => {
                          onSelectPage('resources');
                          onClose();
                        }}
                        className="p-3 bg-slate-50 hover:bg-purple-50/60 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer group transition-colors"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900 group-hover:text-[#5e2be2]">{r.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{r.description}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-[#5e2be2]">
                          {r.typeLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
