import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Booking, Client, PageId, ResourceItem, Therapist } from '../types';

/**
 * The admin search (top bar and Ctrl+K): matches the live lists and links each result to its page, filtered to
 * that record with ?q= (the page fills its own search box from it, see useUrlSearch).
 */
export interface SearchHit {
  key: string;
  page: PageId;
  /** Router path including ?q=, e.g. /clients?q=CL-00001 */
  path: string;
  title: string;
  subtitle: string;
  badge?: string;
  image?: string;
}

export interface SearchGroups {
  therapists: SearchHit[];
  clients: SearchHit[];
  bookings: SearchHit[];
  resources: SearchHit[];
  total: number;
}

const has = (value: unknown, q: string) => String(value ?? '').toLowerCase().includes(q);
const link = (base: string, q: string) => `${base}?q=${encodeURIComponent(q)}`;

export function searchRecords(
  query: string,
  data: { therapists: Therapist[]; clients: Client[]; bookings: Booking[]; resources: ResourceItem[] }
): SearchGroups {
  const q = query.trim().toLowerCase();
  if (!q) return { therapists: [], clients: [], bookings: [], resources: [], total: 0 };

  const therapists = data.therapists
    .filter((t) => has(t.name, q) || has(t.profession, q) || has(t.email, q))
    .map<SearchHit>((t) => ({
      key: `t-${t.id}`,
      page: 'therapists',
      path: link('/therapists', t.name),
      title: t.name,
      subtitle: t.profession || '',
      image: t.photo
    }));

  const clients = data.clients
    .filter((c) => has(c.name, q) || has(c.email, q) || has(c.clientNumber, q) || has(c.phone, q))
    .map<SearchHit>((c) => ({
      key: `c-${c.id}`,
      page: 'clients',
      path: link('/clients', c.clientNumber || c.email || c.name),
      title: c.name,
      subtitle: [c.clientNumber, c.email].filter(Boolean).join(' · '),
      image: c.avatar
    }));

  const bookings = data.bookings
    .filter((b) => has(b.bookingCode, q) || has(b.clientName, q) || has(b.therapistName, q) || has(b.id, q))
    .map<SearchHit>((b) => ({
      key: `b-${b.id}`,
      page: 'bookings',
      path: link('/bookings', b.bookingCode || b.id),
      title: `${b.bookingCode} - ${b.clientName}`,
      subtitle: `${b.service} with ${b.therapistName}${b.date ? ` · ${b.date}${b.time ? `, ${b.time}` : ''}` : ''}`,
      badge: b.status
    }));

  const resources = data.resources
    .filter((r) => has(r.title, q) || has(r.description, q) || (r.tags || []).some((t) => has(t, q)))
    .map<SearchHit>((r) => ({
      key: `r-${r.id}`,
      page: 'resources',
      path: link('/resources', r.title),
      title: r.title,
      subtitle: r.description || '',
      badge: r.typeLabel
    }));

  return { therapists, clients, bookings, resources, total: therapists.length + clients.length + bookings.length + resources.length };
}

/** Fills a page's search box from ?q= in the address (search results link to e.g. /clients?q=CL-00001) */
export function useUrlSearch(setSearch: (q: string) => void): void {
  const { search } = useLocation();
  useEffect(() => {
    const q = new URLSearchParams(search).get('q');
    if (q !== null) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
}
