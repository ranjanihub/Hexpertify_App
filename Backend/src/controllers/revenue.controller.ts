import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';

const PAID_PAYMENT_STATUSES = new Set(['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING']);
// Abandoned/failed checkouts and manually scheduled unpaid sessions carry no revenue
const NON_FINANCIAL_PAYMENT_STATUSES = new Set(['FAILED', 'EXPIRED', 'UNPAID']);

/**
 * Classifies a booking financially. Bookings created before gateway integration have no
 * paymentStatus and are treated as paid once confirmed/completed.
 */
function classifyBooking(b: any, servicePrice?: number) {
  const statusStr = String(b.status || '').toUpperCase();
  const paymentStatusStr = String(b.paymentStatus || '').toUpperCase();
  const isLegacy = !paymentStatusStr;
  const fee = Number(b.amount ?? b.fee ?? b.price ?? servicePrice ?? 0);
  const refunded = Number(b.refundedAmount || 0);

  if (statusStr === 'PENDING_PAYMENT' && paymentStatusStr !== 'PENDING') return { kind: 'ignore' as const, fee, net: 0 };
  if (statusStr === 'EXPIRED' || NON_FINANCIAL_PAYMENT_STATUSES.has(paymentStatusStr)) return { kind: 'ignore' as const, fee, net: 0 };
  if (paymentStatusStr === 'REFUNDED') return { kind: 'refunded' as const, fee, net: 0 };
  if (PAID_PAYMENT_STATUSES.has(paymentStatusStr) || (isLegacy && (statusStr === 'CONFIRMED' || statusStr === 'COMPLETED'))) {
    return { kind: 'paid' as const, fee, net: Math.max(0, fee - refunded) };
  }
  if (paymentStatusStr === 'PENDING' || (isLegacy && statusStr === 'PENDING')) return { kind: 'pending' as const, fee, net: 0 };
  return { kind: 'ignore' as const, fee, net: 0 };
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

        const transactions: any[] = [];

        relevantBookings.forEach((b: any, idx: number) => {
          const u = userMap.get(String(b.userId || b.clientId));
          const c = consultantMap.get(String(b.consultantId || b.therapistId));
          const s = serviceMap.get(String(b.serviceId));

          const clientName = b.clientName || u?.name || u?.email?.split('@')[0] || `Client #${idx + 1}`;
          const rawClientEmail = b.clientEmail || u?.email || '';
          const therapistName = b.consultantName || b.therapistName || c?.name || 'Specialist Consultant';

          const financial = classifyBooking(b, s?.price);
          if (financial.kind === 'ignore') return;
          const rawFee = financial.fee;
          const isPaid = financial.kind === 'paid';
          const isPending = financial.kind === 'pending';

          if (isPaid) {
            totalRevenue += financial.net;
            completedConsultations += 1;
            therapyHours += Number(b.durationHours ?? (b.durationMinutes ? b.durationMinutes / 60 : 1));
          } else if (isPending) {
            pendingPayments += rawFee;
          }

          const dateStr = b.sessionDate || b.scheduledAt || b.date || b.createdAt;
          const formattedDate = dateStr ? new Date(dateStr).toISOString().split('T')[0] : '2026-08-30';

          transactions.push({
            id: b.id || String(b._id) || `TXN-${idx + 1}`,
            date: formattedDate,
            clientName,
            clientEmail: isConsultantView ? undefined : rawClientEmail,
            therapistName,
            amount: isPaid ? financial.net : rawFee,
            status: isPaid ? 'paid' : isPending ? 'pending' : 'refunded',
            paymentStatus: b.paymentStatus,
            paymentId: b.paymentId,
            invoiceNumber: `INV-${String(b.customId || b.bookingId || b.id || b._id).replace('BK-', '').replace('HEX-', '').slice(-6)}`
          });
        });

        // Monthly aggregation from real data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonthIndex = new Date().getMonth();
        const last6Months: string[] = [];
        for (let i = 5; i >= 0; i--) {
          const mIdx = (currentMonthIndex - i + 12) % 12;
          last6Months.push(months[mIdx]);
        }

        const monthlyDataMap: Record<string, { revenue: number; consultations: number; hours: number }> = {};
        last6Months.forEach((m) => {
          monthlyDataMap[m] = { revenue: 0, consultations: 0, hours: 0 };
        });

        relevantBookings.forEach((b: any) => {
          const d = new Date(b.scheduledAt || b.date || b.createdAt || Date.now());
          if (!isNaN(d.getTime())) {
            const mName = months[d.getMonth()];
            const financial = classifyBooking(b, serviceMap.get(String(b.serviceId))?.price);
            if (monthlyDataMap[mName] && financial.kind === 'paid') {
              monthlyDataMap[mName].revenue += financial.net;
              monthlyDataMap[mName].consultations += 1;
              monthlyDataMap[mName].hours += Number(b.durationHours ?? (b.durationMinutes ? b.durationMinutes / 60 : 1));
            }
          }
        });

        const monthlyAnalytics = last6Months.map((month) => ({
          month,
          revenue: monthlyDataMap[month].revenue,
          consultations: monthlyDataMap[month].consultations,
          hours: Math.round(monthlyDataMap[month].hours * 10) / 10
        }));

        return {
          success: true,
          summary: {
            totalRevenue,
            pendingPayments,
            completedConsultations,
            therapyHours: Math.round(therapyHours * 10) / 10
          },
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
