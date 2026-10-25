import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';
import { MailService } from '../services/mail.service';
import { classifyBooking, platformCommissionRate, splitFee } from '../services/booking-finance';
import { consultantIds } from '../services/booking-refs';
import { bookingStatusOf } from '../services/booking-status';
import { bookingInstant, isDateLabel, istLabels } from '../services/booking-time';

export class PayoutsController {
  /**
   * GET /api/payouts and GET /api/admin/payouts
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const responseData = await cacheService.wrap('payouts:all', ['payouts', 'consultants', 'bookings'], 20, async () => {
        const db = getDatabase();
        const [consultants, bookings, storedPayouts, invoices] = await Promise.all([
          db.collection('Consultant').find({}).toArray().catch(() => []),
          db.collection('Booking').find({}).toArray().catch(() => []),
          db.collection('Payout').find({}).toArray().catch(() => []),
          db.collection('PayoutInvoice').find({}).sort({ payoutDate: -1, createdAt: -1 }).toArray().catch(() => [])
        ]);

        // Sessions already settled by a released payout invoice
        const settled = new Set<string>();
        invoices.forEach((inv: any) => (Array.isArray(inv.sessionIds) ? inv.sessionIds : []).forEach((sid: any) => settled.add(String(sid))));
        const commissionRate = platformCommissionRate();

        const payouts = consultants.map((c: any) => {
          const ids = consultantIds(c);
          const cId = String(c._id);
          const email = String(c.email || '').toLowerCase().trim();

          // Pending = completed sessions that were paid for, per consultant, not yet in a released invoice
          const unpaidSessions = bookings
            .filter((b: any) => ids.includes(String(b.consultantId || b.therapistId || '')))
            .filter((b: any) => bookingStatusOf(b) === 'COMPLETED')
            .map((b: any) => ({ b, financial: classifyBooking(b) }))
            .filter(({ b, financial }) => financial.kind === 'paid' && financial.net > 0 &&
              !settled.has(String(b.id || b._id)) && !settled.has(String(b._id)))
            .map(({ b, financial }) => {
              const sessionId = String(b.id || b._id);
              const when = bookingInstant(b);
              return {
                id: `SR-${sessionId}`,
                sessionId,
                sessionDate: (isDateLabel(b.date) ? b.date : null) || (when ? istLabels(when).date : null),
                clientName: b.clientName || 'Client',
                serviceTitle: b.serviceTitle || '',
                sessionFee: financial.net,
                therapistShare: splitFee(financial.net).therapist,
                status: 'Pending Review'
              };
            });

          const grossAmount = unpaidSessions.reduce((acc: number, s: any) => acc + s.sessionFee, 0);
          const pendingAmount = unpaidSessions.reduce((acc: number, s: any) => acc + s.therapistShare, 0);
          const lastInvoice: any = invoices.find((inv: any) =>
            (email && String(inv.therapistEmail || '').toLowerCase() === email) || ids.includes(String(inv.therapistId || '')));
          // A stored payout record only carries the review status and bank details
          const stored: any = storedPayouts.find((p: any) => ids.includes(String(p.therapistId || '')));
          const lastPayoutAmount = Number(lastInvoice?.netPayout);

          return {
            id: `PO-${cId}`,
            therapistId: cId,
            therapistName: c.name || 'Therapist',
            therapistEmail: c.email || '',
            therapistAvatar: c.photoUrl || c.photo || c.image || '',
            profession: c.profession || c.title || c.specialization || '',
            grossAmount,
            platformFee: grossAmount - pendingAmount,
            commissionRate,
            pendingAmount,
            pendingReportsCount: unpaidSessions.length,
            sessionsCount: unpaidSessions.length,
            lastPayoutDate: lastInvoice?.payoutDate || null,
            lastPayoutAmount: Number.isFinite(lastPayoutAmount) ? lastPayoutAmount : 0,
            bankDetails: stored?.bankDetails || c.bankDetails || null,
            payoutMethod: stored?.payoutMethod,
            status: stored?.status || (unpaidSessions.length ? 'Pending Review' : 'Paid'),
            unpaidSessions
          };
        });

        return {
          success: true,
          count: payouts.length,
          commissionRate,
          payouts
        };
      });

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch therapist payouts' });
    }
  }

  /**
   * PUT /api/payouts/:id and PUT /api/admin/payouts/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || req.body?.id || '');
      const updates = { ...req.body, updatedAt: new Date() };
      delete updates._id;

      if (!id) {
        res.status(400).json({ success: false, error: 'Payout ID is required' });
        return;
      }

      const db = getDatabase();
      const query = { $or: [{ id }, { therapistId: id }] };

      await db.collection('Payout').updateOne(query, { $set: updates }, { upsert: true });
      await db.collection('payouts').updateOne(query, { $set: updates }, { upsert: true }).catch(() => {});

      cacheService.invalidateTags(['payouts', 'stats']);

      res.json({
        success: true,
        message: 'Payout record updated successfully in MongoDB Atlas'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to update payout' });
    }
  }

  /**
   * POST /api/admin/payouts — records a released payout (by invoice) and emails the invoice to the therapist and admin.
   * { action: 'resend-invoice', ... } only re-sends the email. Bodies with a payout id update that payout record.
   */
  static async releasePayout(req: Request, res: Response): Promise<void> {
    const body = req.body || {};
    if (!body.invoiceNumber) return PayoutsController.update(req, res);
    try {
      const invoice = {
        invoiceNumber: String(body.invoiceNumber),
        payoutDate: String(body.payoutDate || new Date().toISOString().split('T')[0]),
        therapistName: String(body.therapistName || 'Therapist'),
        therapistEmail: String(body.therapistEmail || '').toLowerCase().trim(),
        profession: String(body.profession || ''),
        sessionsCount: Number(body.sessionsCount) || (Array.isArray(body.sessions) ? body.sessions.length : 0),
        grossAmount: Number(body.grossAmount) || 0,
        platformFee: Number(body.platformFee) || 0,
        netPayout: Number(body.netPayout) || 0,
        paymentMethod: String(body.paymentMethod || ''),
        accountNumber: String(body.accountNumber || ''),
        transactionRef: String(body.transactionRef || ''),
        sessions: Array.isArray(body.sessions) ? body.sessions : []
      };

      if (body.action !== 'resend-invoice') {
        const db = getDatabase();
        const now = new Date();
        // Invoices live apart from the per-therapist Payout records the list above is built from
        await db.collection('PayoutInvoice').updateOne(
          { invoiceNumber: invoice.invoiceNumber },
          { $set: { ...invoice, therapistId: String(body.therapistId || ''), sessionIds: (Array.isArray(body.sessionIds) ? body.sessionIds : []).map(String), releasedBy: req.user?.email || '', updatedAt: now }, $setOnInsert: { createdAt: now } },
          { upsert: true }
        );
        cacheService.invalidateTags(['payouts', 'stats']);
      }

      const mail = await MailService.sendPayoutInvoice(invoice);
      res.json({ success: true, emailed: mail.success, message: 'Payout invoice recorded and emailed' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to release payout' });
    }
  }
}
