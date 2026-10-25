import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';
import { classifyBooking, platformCommissionRate, splitFee } from '../services/booking-finance';
import { normalizePaymentStatus } from '../services/booking-status';
import { bookingInstant, isDateLabel, istLabels, toValidDate } from '../services/booking-time';

/**
 * The booking's financial date (YYYY-MM-DD, India time): the session day, or the purchase day for
 * website bookings that are paid but not scheduled yet. Null when neither is a valid date.
 */
function financialDate(b: any): { date: string | null; toBeScheduled: boolean } {
  const when = bookingInstant(b);
  const sessionDate = (isDateLabel(b.date) ? b.date : null) || (when ? istLabels(when).date : null);
  if (sessionDate) return { date: sessionDate, toBeScheduled: false };
  const created = toValidDate(b.createdAt);
  return { date: created ? istLabels(created).date : null, toBeScheduled: true };
}

export class RevenueController {
  /**
   * GET /api/revenue and GET /api/admin/revenue
   * Return real live financial summary, analytics, and transaction logs from MongoDB Atlas
   */
  static async getRevenue(req: Request, res: Response): Promise<void> {
    try {
      const { consultantId, consultantName, period = 'month' } = req.query;
      const isConsultantView = Boolean(consultantId || consultantName);
      const cacheKey = `revenue:${consultantId || ''}:${consultantName || ''}:${period}`;

      const responseData = await cacheService.wrap(cacheKey, ['revenue', 'bookings'], 15, async () => {
        const db = getDatabase();
        const myName = String(consultantName || '').toLowerCase().trim();
        const myId = String(consultantId || '').toLowerCase().trim();

        // Fetch all collections needed for relational hydration in parallel
        const [allBookings, allUsers, allConsultants, allServices] = await Promise.all([
          db.collection('Booking').find({}).sort({ createdAt: -1, sessionDate: -1 }).toArray(),
          db.collection('User').find({}).toArray(),
          db.collection('Consultant').find({}).toArray(),
          db.collection('Service').find({}).toArray()
        ]);

        // Build fast lookup maps
        const userMap = new Map<string, any>();
        allUsers.forEach((u: any) => {
          if (u._id) userMap.set(String(u._id), u);
          if (u.id) userMap.set(String(u.id), u);
        });

        const consultantMap = new Map<string, any>();
        allConsultants.forEach((c: any) => {
          if (c._id) consultantMap.set(String(c._id), c);
          if (c.id) consultantMap.set(String(c.id), c);
        });

        const serviceMap = new Map<string, any>();
        allServices.forEach((s: any) => {
          if (s._id) serviceMap.set(String(s._id), s);
          if (s.id) serviceMap.set(String(s.id), s);
        });

        let relevantBookings = allBookings;

        if (myId || myName) {
          const matchedConsultants = allConsultants.filter((c: any) => {
            const cId = String(c._id || c.id || '').toLowerCase().trim();
            const cName = String(c.name || '').toLowerCase().trim();
            return (myId && cId === myId) || 
                   (myName && cName.includes(myName)) || 
                   (myName && myName.includes(cName) && cName.length > 3);
          });

          const matchedConsultantIds = new Set<string>(matchedConsultants.map((c: any) => String(c._id || c.id)));
          if (myId) matchedConsultantIds.add(myId);

          relevantBookings = allBookings.filter((b: any) => {
            const bCid = String(b.consultantId || b.therapistId || '').trim();
            const bCname = String(b.consultantName || b.therapistName || '').toLowerCase().trim();

            const idMatch = bCid && matchedConsultantIds.has(bCid);
            const nameMatch = (myName && bCname && bCname.includes(myName)) || 
                              (myName && bCname && myName.includes(bCname) && bCname.length > 3);

            return idMatch || nameMatch;
          });
        }

        let totalRevenue = 0;
        let pendingPayments = 0;
        let completedConsultations = 0;
        let therapyHours = 0;
        let platformCommission = 0;
        let therapistEarnings = 0;

        const transactions: any[] = [];
        const serviceTotals = new Map<string, { service: string; revenue: number; count: number }>();

        // Last six months, keyed YYYY-MM (India time) so the same month of different years never merges
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const [thisYear, thisMonth] = istLabels(new Date()).date.split('-').map(Number);
        const monthKeys: string[] = [];
        for (let i = 5; i >= 0; i--) {
          const total = thisYear * 12 + (thisMonth - 1) - i;
          monthKeys.push(`${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`);
        }
        const monthlyDataMap: Record<string, { revenue: number; consultations: number; hours: number }> = {};
        monthKeys.forEach((k) => {
          monthlyDataMap[k] = { revenue: 0, consultations: 0, hours: 0 };
        });

        relevantBookings.forEach((b: any, idx: number) => {
          const u = userMap.get(String(b.userId || b.clientId));
          const c = consultantMap.get(String(b.consultantId || b.therapistId));
          const s = serviceMap.get(String(b.serviceId));

          const clientName = b.clientName || u?.name || u?.email?.split('@')[0] || `Client #${idx + 1}`;
          const rawClientEmail = b.clientEmail || u?.email || '';
          const therapistName = b.consultantName || b.therapistName || c?.name || 'Specialist Consultant';
          const serviceTitle = b.serviceTitle || s?.name || s?.title || 'Consultation';

          const financial = classifyBooking(b, s?.price);
          if (financial.kind === 'ignore') return;
          const rawFee = financial.fee;
          const isPaid = financial.kind === 'paid';
          const isPending = financial.kind === 'pending';
          const durationMinutes = Number(b.durationMinutes);
          const hours = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes / 60 : 1;
          const { date, toBeScheduled } = financialDate(b);

          if (isPaid) {
            const split = splitFee(financial.net);
            totalRevenue += financial.net;
            platformCommission += split.platform;
            therapistEarnings += split.therapist;
            completedConsultations += 1;
            therapyHours += hours;

            const service = serviceTotals.get(serviceTitle) || { service: serviceTitle, revenue: 0, count: 0 };
            service.revenue += financial.net;
            service.count += 1;
            serviceTotals.set(serviceTitle, service);

            const month = date ? monthlyDataMap[date.slice(0, 7)] : undefined;
            if (month) {
              month.revenue += financial.net;
              month.consultations += 1;
              month.hours += hours;
            }
          } else if (isPending) {
            pendingPayments += rawFee;
          }

          transactions.push({
            id: b.id || String(b._id) || `TXN-${idx + 1}`,
            bookingId: String(b.id || b._id),
            date,
            toBeScheduled,
            createdAt: b.createdAt,
            clientName,
            clientEmail: isConsultantView ? undefined : rawClientEmail,
            therapistName,
            therapistId: String(b.consultantId || b.therapistId || ''),
            serviceTitle,
            amount: isPaid ? financial.net : rawFee,
            status: isPaid ? 'paid' : isPending ? 'pending' : 'refunded',
            paymentStatus: normalizePaymentStatus(b.paymentStatus) || b.paymentStatus,
            paymentId: b.paymentId,
            invoiceNumber: `INV-${String(b.customId || b.bookingId || b.id || b._id).replace('BK-', '').replace('HEX-', '').slice(-6)}`
          });
        });

        const monthlyAnalytics = monthKeys.map((key) => ({
          month: months[Number(key.slice(5, 7)) - 1],
          key,
          revenue: monthlyDataMap[key].revenue,
          consultations: monthlyDataMap[key].consultations,
          hours: Math.round(monthlyDataMap[key].hours * 10) / 10
        }));

        return {
          success: true,
          summary: {
            totalRevenue,
            pendingPayments,
            completedConsultations,
            therapyHours: Math.round(therapyHours * 10) / 10,
            platformCommission,
            therapistEarnings,
            commissionRate: platformCommissionRate()
          },
          serviceBreakdown: Array.from(serviceTotals.values()).sort((x, y) => y.revenue - x.revenue),
          monthlyAnalytics,
          transactions
        };
      });

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch revenue analytics' });
    }
  }
}
