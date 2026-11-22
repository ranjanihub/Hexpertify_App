/**
 * What the Super Admin panel's switches mean on the public website.
 * Records created before these fields existed have them unset and stay public.
 */

type ProfessionFlags = { status?: string | null; visibility?: string | null };
type ConsultantFlags = { isHiddenFromLive?: boolean | null; isArchived?: boolean | null; accountStatus?: string | null };
type ServiceFlags = { retired?: boolean | null; price?: number | null };

/** Draft/Archived or Private professions are not listed */
export function isProfessionPublic(p: ProfessionFlags | null | undefined): boolean {
  if (!p) return false;
  const status = String(p.status || "Active").toLowerCase();
  const visibility = String(p.visibility || "Public").toLowerCase();
  return status !== "draft" && status !== "archived" && visibility !== "private";
}

/** Hidden, archived, inactive or suspended therapists are not shown */
export function isConsultantPublic(c: ConsultantFlags | null | undefined): boolean {
  if (!c) return false;
  if (c.isHiddenFromLive || c.isArchived) return false;
  const status = String(c.accountStatus || "Active").toLowerCase();
  return status !== "inactive" && status !== "suspended";
}

/** Plans the therapist currently offers (removed plans stay in the database for past bookings) */
export function activeServices<T extends ServiceFlags>(services: T[] | null | undefined): T[] {
  return (services || []).filter((s) => !s.retired && Number(s.price) > 0);
}

/** Lowest current plan price, or the stored minimum price, or null when there is no price */
export function lowestPrice(services: ServiceFlags[] | null | undefined, minPrice?: number | null): number | null {
  const prices = activeServices(services).map((s) => Number(s.price));
  if (prices.length) return Math.min(...prices);
  return Number(minPrice) > 0 ? Number(minPrice) : null;
}
