import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';

export class DashboardController {
  /**
   * GET /api/dashboard/stats and GET /api/admin/dashboard/stats
   * Computes live clinical & business stats dynamically from MongoDB Atlas collections
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const consultantId = String(req.query.consultantId || req.query.therapistId || req.query.id || '').trim();
      const consultantName = String(req.query.consultantName || req.query.therapistName || req.query.name || '').trim();
      const cacheKey = `stats:${consultantId}:${consultantName}`;

      const responseData = await cacheService.wrap(cacheKey, ['stats', 'bookings', 'users'], 15, async () => {
        const db = getDatabase();

        // Fetch all collections in parallel
        const [users, bookings, activities, reviews, messages, consultants] = await Promise.all([
          db.collection<any>('User').find({}).toArray().catch(() => db.collection<any>('users').find({}).toArray().catch(() => [])),
          db.collection<any>('Booking').find({}).toArray().catch(() => db.collection<any>('bookings').find({}).toArray().catch(() => [])),
          db.collection<any>('Activity').find({}).toArray().catch(() => db.collection<any>('activities').find({}).toArray().catch(() => [])),
          db.collection<any>('Review').find({}).toArray().catch(() => db.collection<any>('reviews').find({}).toArray().catch(() => [])),
          db.collection<any>('Message').find({}).toArray().catch(() => db.collection<any>('messages').find({}).toArray().catch(() => [])),
          db.collection<any>('Consultant').find({}).toArray().catch(() => db.collection<any>('consultants').find({}).toArray().catch(() => []))
        ]);

        const myConsultant = consultants.find((c: any) => {
          const cId = String(c._id || c.id || '');
          const cName = String(c.name || '').toLowerCase().trim();
          return (consultantId && cId === consultantId) ||
                 (consultantName && cName.includes(consultantName.toLowerCase())) ||
                 (consultantName && consultantName.toLowerCase().includes(cName) && cName.length > 3);
        });

        // Filter bookings for this consultant if consultant is specified
        const filteredBookings = bookings.filter((b: any) => {
          if (!consultantId && !consultantName) return true;
          const bCid = String(b.consultantId || b.therapistId || '').trim();
          const bCname = String(b.consultantName || b.therapistName || '').toLowerCase().trim();
          return (consultantId && bCid === consultantId) ||
                 (consultantName && bCname.includes(consultantName.toLowerCase())) ||
                 (consultantName && consultantName.toLowerCase().includes(bCname) && bCname.length > 3);
        });

        // Filter clients for this consultant
        const clientSet = new Set<string>();
        const clientObjects: any[] = [];

        // Add from user direct assignments
        users.forEach((u: any) => {
          const role = String(u.role || '').toLowerCase();
          if (role && role !== 'client' && role !== 'user') return;

          const uTId = String(u.assignedTherapistId || '').trim();
          const uTName = String(u.assignedTherapistName || u.therapist || '').toLowerCase().trim();

          const isAssigned = !consultantId && !consultantName
            ? true
            : (consultantId && uTId === consultantId) ||
              (consultantName && uTName.includes(consultantName.toLowerCase())) ||
              (consultantName && consultantName.toLowerCase().includes(uTName) && uTName.length > 3);

          if (isAssigned) {
            const key = String(u.email || u._id || u.id || u.name).toLowerCase().trim();
            if (key && !clientSet.has(key)) {
              clientSet.add(key);
              clientObjects.push(u);
            }
          }
        });

        // Add from bookings if not already added
        filteredBookings.forEach((b: any) => {
          const key = String(b.clientEmail || b.clientId || b.clientName).toLowerCase().trim();
          if (key && !clientSet.has(key)) {
            clientSet.add(key);
            clientObjects.push({
              id: b.clientId || b._id,
              name: b.clientName,
              email: b.clientEmail,
              role: 'client'
            });
          }
        });

        const totalClientsCount = clientSet.size;

        // Calculate sessions today
        const todayIso = new Date().toISOString().split('T')[0];
        const sessionsToday = filteredBookings.filter((b: any) => {
          const d = String(b.sessionDate || b.date || b.scheduledAt || '');
          const cleanDate = d.includes('T') ? d.split('T')[0] : d;
          const status = String(b.status || '').toLowerCase();
          return cleanDate === todayIso && status !== 'cancelled';
        }).length;

        const upcomingSessionsCount = filteredBookings.filter((b: any) => {
          const status = String(b.status || '').toLowerCase();
          return status !== 'cancelled' && status !== 'completed';
        }).length;

        // Filter activities assigned to this consultant's clients
        const clientNames = clientObjects.map((c: any) => String(c.name || '').toLowerCase().trim()).filter(Boolean);
        const clientEmails = clientObjects.map((c: any) => String(c.email || '').toLowerCase().trim()).filter(Boolean);
        const clientIds = clientObjects.map((c: any) => String(c._id || c.id || '').trim()).filter(Boolean);

        const assignedActivities = activities.filter((a: any) => {
          if (!consultantId && !consultantName) return true;
          // Check if assigned to therapist
          const aTId = String(a.assignedTherapistId || '').trim();
          const aTName = String(a.assignedTherapistName || '').toLowerCase().trim();
          if ((consultantId && aTId === consultantId) || (consultantName && aTName.includes(consultantName.toLowerCase()))) {
            return true;
          }
          // Check client assignments
          if (Array.isArray(a.clientAssignments)) {
            return a.clientAssignments.some((ca: any) => {
              const caEmail = String(ca.clientEmail || ca.email || '').toLowerCase().trim();
              const caId = String(ca.clientId || ca.id || '').trim();
              const caName = String(ca.clientName || ca.name || '').toLowerCase().trim();
              return clientEmails.includes(caEmail) || clientIds.includes(caId) || clientNames.includes(caName);
            });
          }
          if (Array.isArray(a.assignedTo)) {
            return a.assignedTo.some((name: string) => clientNames.includes(String(name).toLowerCase().trim()));
          }
          return false;
        });

        const totalActivitiesCount = assignedActivities.length;
        const homeworkDueToday = assignedActivities.filter((a: any) => {
          const repeat = String(a.repeat || a.frequency || '').toLowerCase();
          return repeat.includes('daily') || repeat.includes('today');
        }).length;

        // Unread messages for this consultant
        const unreadMessagesCount = messages.filter((m: any) => {
          const isUnread = m.read === false || m.unread === true || m.status === 'unread';
          if (!isUnread) return false;
          if (!consultantId && !consultantName) return true;
          const toRole = String(m.recipientRole || m.toRole || '').toLowerCase();
          const toName = String(m.recipientName || m.therapistName || '').toLowerCase().trim();
          const toId = String(m.recipientId || m.therapistId || m.consultantId || '').trim();
          return (toRole === 'therapist' || toRole === 'consultant') &&
            ((consultantId && toId === consultantId) || (consultantName && toName.includes(consultantName.toLowerCase())));
        }).length;

        // Reviews & Rating
        const filteredReviews = reviews.filter((r: any) => {
          if (!consultantId && !consultantName) return true;
          const rCid = String(r.consultantId || r.therapistId || '').trim();
          const rCname = String(r.consultantName || r.therapistName || '').toLowerCase().trim();
          return (consultantId && rCid === consultantId) ||
                 (consultantName && rCname.includes(consultantName.toLowerCase()));
        });

        const totalReviews = filteredReviews.length;
        let averageRating = myConsultant?.rating || 5.0;
        if (totalReviews > 0) {
          const sum = filteredReviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0);
          averageRating = Math.round((sum / totalReviews) * 10) / 10;
        }

        // Total Revenue
        const totalRevenue = filteredBookings.reduce((sum: number, b: any) => {
          const price = Number(b.price || b.amount || b.fee || 0);
          return sum + price;
        }, 0);

        return {
          success: true,
          stats: {
            totalClientsCount,
            activeClientsCount: totalClientsCount,
            sessionsToday,
            upcomingSessionsCount,
            homeworkDueToday,
            totalActivitiesCount,
            unreadMessagesCount,
            averageRating,
            totalReviews,
            totalRevenue
          },
          totalClientsCount,
          activeClients: totalClientsCount,
          sessionsToday,
          upcomingSessionsCount,
          homeworkDueToday,
          totalActivitiesCount,
          unreadMessagesCount,
          averageRating,
          totalReviews,
          totalRevenue
        };
      });

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to compute dashboard stats' });
    }
  }
}
