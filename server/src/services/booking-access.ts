import { Request, Response } from 'express';
import { resolveClientViewer } from './client-access';

export type BookingAccess = 'full' | 'therapist' | 'client' | 'anonymous' | 'none';

/**
 * Who may change this booking: an admin or the server itself ("full"), the booking's own therapist ("therapist"),
 * the client who booked it ("client"), or nobody ("anonymous" when not signed in, "none" when signed in as
 * someone else). Identity comes from the signed API token only.
 */
export async function bookingAccess(req: Request, booking: any): Promise<BookingAccess> {
  const viewer = await resolveClientViewer(req);
  if (viewer.kind === 'internal' || viewer.kind === 'admin') return 'full';
  if (viewer.kind === 'anonymous') return 'anonymous';
  const has = (...values: unknown[]) => values.some((v) => v != null && v !== '' && viewer.ids.has(String(v).toLowerCase().trim()));
  if (viewer.kind === 'therapist') {
    return has(booking.consultantId, booking.therapistId, booking.consultantEmail, booking.therapistEmail) ? 'therapist' : 'none';
  }
  return has(booking.clientEmail, booking.clientId, booking.userId) ? 'client' : 'none';
}

/** Sends the refusal for an access level that may not change the booking; true when one was sent */
export function refuseBookingChange(res: Response, access: BookingAccess): boolean {
  if (access === 'anonymous') {
    res.status(401).json({ success: false, error: 'Please sign in to change a booking.' });
    return true;
  }
  if (access === 'none') {
    res.status(403).json({ success: false, error: 'You can only change your own bookings.' });
    return true;
  }
  return false;
}
