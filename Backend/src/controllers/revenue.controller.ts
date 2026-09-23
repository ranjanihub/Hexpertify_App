import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';

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

          const rawFee = Number(b.amount ?? b.fee ?? b.price ?? s?.price ?? 1500);
          const statusStr = String(b.status || '').toUpperCase();
          const paymentStatusStr = String(b.paymentStatus || '').toUpperCase();

          const isPaid = statusStr === 'CONFIRMED' || statusStr === 'COMPLETED' || paymentStatusStr === 'PAID';
          const isPending = (statusStr === 'PENDING' || paymentStatusStr === 'PENDING') && !isPaid;

          if (isPaid) {
            totalRevenue += rawFee;
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
            amount: rawFee,
            status: isPaid ? 'paid' : isPending ? 'pending' : 'refunded',
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
            if (monthlyDataMap[mName]) {
              const rawFee = Number(b.amount ?? b.fee ?? b.price ?? 1500);
              monthlyDataMap[mName].revenue += rawFee;
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
