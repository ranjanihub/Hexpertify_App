import { Request, Response } from 'express';
import { Db } from 'mongodb';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';
import { MailService } from '../services/mail.service';
import { classifyBooking, platformCommissionRate, therapistShareOf } from '../services/booking-finance';
import { consultantIds } from '../services/booking-refs';
import { bookingStatusOf } from '../services/booking-status';
import { bookingInstant, isDateLabel, istLabels } from '../services/booking-time';
import { nextSequenceNumber } from '../services/sequence';

const PAYOUT_METHODS = ['Bank Transfer', 'UPI'];

/** A therapist's saved payout details (flat fields on the Consultant, as the Therapists page saves them) */
function bankDetailsOf(c: any, stored?: any) {
  const legacy = stored?.bankDetails || c?.bankDetails || {};
  const pick = (key: string) => String(c?.[key] || legacy?.[key] || '').trim();
  return {
    bankName: pick('bankName'),
    bankAccountNumber: pick('bankAccountNumber'),
    bankIfsc: pick('bankIfsc'),
    accountHolderName: pick('accountHolderName'),
    upiId: pick('upiId')
  };
}

/** A stored payout invoice as the admin history lists it */
function invoiceToHistory(inv: any) {
  return {
    id: String(inv.invoiceNumber || inv._id),
    invoiceNumber: String(inv.invoiceNumber || ''),
    payoutDate: inv.payoutDate || '',
    therapistId: String(inv.therapistId || ''),
    therapistName: inv.therapistName || '',
    therapistEmail: inv.therapistEmail || '',
    profession: inv.profession || '',
    sessionsCount: Number(inv.sessionsCount) || (Array.isArray(inv.sessionIds) ? inv.sessionIds.length : 0),
    grossAmount: Number(inv.grossAmount) || 0,
    platformFee: Number(inv.platformFee) || 0,
    netPayout: Number(inv.netPayout) || 0,
    paymentMethod: inv.paymentMethod || '',
    accountNumber: inv.accountNumber || '',
    transactionRef: inv.transactionRef || '',
    sessions: Array.isArray(inv.sessions) ? inv.sessions : [],
    emailed: typeof inv.emailed === 'boolean' ? inv.emailed : null,
    releasedBy: inv.releasedBy || '',
    createdAt: inv.createdAt || null,
    status: 'Completed'
  };
}

/**
 * Every therapist's unpaid sessions (completed, paid, not yet in a released invoice), the summary cards and
 * the stored invoice history. Fees use each therapist's plans, the same rule as revenue and the therapist panel.
 */
async function buildPayouts(db: Db) {
  const [consultants, bookings, storedPayouts, invoices, plans] = await Promise.all([
    db.collection('Consultant').find({}).toArray().catch(() => []),
    db.collection('Booking').find({}).toArray().catch(() => []),
    db.collection('Payout').find({}).toArray().catch(() => []),
    db.collection('PayoutInvoice').find({}).sort({ createdAt: -1, payoutDate: -1 }).toArray().catch(() => []),
    db.collection('Service').find({}).toArray().catch(() => [])
  ]);

  // Sessions already settled by a released payout invoice (older invoices stored the admin row id "SR-<bookingId>")
  const settled = new Set<string>();
  invoices.forEach((inv: any) => (Array.isArray(inv.sessionIds) ? inv.sessionIds : []).forEach((sid: any) => settled.add(String(sid).replace(/^SR-/, ''))));
  const commissionRate = platformCommissionRate();

  const payouts = consultants.map((c: any) => {
    const ids = consultantIds(c);
    const cId = String(c._id);
    const email = String(c.email || '').toLowerCase().trim();
    const myPlans = plans.filter((p: any) => ids.includes(String(p.consultantId || '')));

    const unpaidSessions = bookings
      .filter((b: any) => ids.includes(String(b.consultantId || b.therapistId || '')))
      .filter((b: any) => bookingStatusOf(b) === 'COMPLETED')
      .map((b: any) => ({ b, financial: classifyBooking(b) }))
      .filter(({ b, financial }) => financial.kind === 'paid' && financial.net > 0 &&
        !settled.has(String(b.id || b._id)) && !settled.has(String(b._id)))
      .map(({ b, financial }) => {
        const sessionId = String(b.id || b._id);
        const when = bookingInstant(b);
        const therapistShare = therapistShareOf(financial.net, myPlans, c.platformFeeType);
        return {
          id: `SR-${sessionId}`,
          sessionId,
          bookingNumber: b.bookingNumber || '',
          sessionDate: (isDateLabel(b.date) ? b.date : null) || (when ? istLabels(when).date : null),
          clientName: b.clientName || 'Client',
          serviceTitle: b.serviceTitle || '',
          sessionFee: financial.net,
          platformFee: financial.net - therapistShare,
          therapistShare,
          status: 'Pending Review'
        };
      });

    const grossAmount = unpaidSessions.reduce((acc: number, s: any) => acc + s.sessionFee, 0);
    const pendingAmount = unpaidSessions.reduce((acc: number, s: any) => acc + s.therapistShare, 0);
    const lastInvoice: any = invoices.find((inv: any) =>
      (email && String(inv.therapistEmail || '').toLowerCase() === email) || ids.includes(String(inv.therapistId || '')));
    const stored: any = storedPayouts.find((p: any) => ids.includes(String(p.therapistId || '')));
    const lastPayoutAmount = Number(lastInvoice?.netPayout);

    return {
      id: `PO-${cId}`,
      therapistId: cId,
      therapistName: c.name || 'Therapist',
      therapistEmail: c.email || '',
      therapistAvatar: c.photoUrl || c.photo || c.image || '',
      profession: c.profession || c.title || c.specialization || '',
      platformFeeType: c.platformFeeType || '',
      hasPlans: myPlans.some((p: any) => !p?.retired && Number(p?.price) > 0 && Number.isFinite(Number(p?.platformFee))),
      grossAmount,
      platformFee: grossAmount - pendingAmount,
      commissionRate,
      pendingAmount,
      pendingReportsCount: unpaidSessions.length,
      sessionsCount: unpaidSessions.length,
      lastPayoutDate: lastInvoice?.payoutDate || null,
      lastPayoutAmount: Number.isFinite(lastPayoutAmount) ? lastPayoutAmount : 0,
      ...bankDetailsOf(c, stored),
      payoutMethod: stored?.payoutMethod,
      status: stored?.status || (unpaidSessions.length ? 'Pending Review' : 'Paid'),
      unpaidSessions
    };
  });

  const awaiting = payouts.filter((p) => p.unpaidSessions.length > 0);
  const summary = {
    pendingSessionsCount: awaiting.reduce((acc, p) => acc + p.unpaidSessions.length, 0),
    therapistsAwaitingCount: awaiting.length,
    pendingPayoutPool: awaiting.reduce((acc, p) => acc + p.pendingAmount, 0),
    // The platform's fee on the sessions still to be paid out
    platformCommission: awaiting.reduce((acc, p) => acc + p.platformFee, 0),
    // Everything already released
    releasedCount: invoices.length,
    releasedTotal: (invoices as any[]).reduce((acc: number, inv: any) => acc + (Number(inv.netPayout) || 0), 0)
  };

  return { commissionRate, payouts, summary, history: invoices.map(invoiceToHistory), consultants };
}

export class PayoutsController {
  /**
   * GET /api/payouts and GET /api/admin/payouts (admins only: carries bank details)
   * { payouts: per-therapist unpaid sessions, summary: the page's cards, history: stored payout invoices }
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const responseData = await cacheService.wrap('payouts:all', ['payouts', 'consultants', 'bookings', 'services'], 20, async () => {
        const { commissionRate, payouts, summary, history } = await buildPayouts(getDatabase());
        return { success: true, count: payouts.length, commissionRate, summary, history, payouts };
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
   * POST /api/admin/payouts (admins) — records a payout the admin has already sent, as a new invoice.
   *   { therapistId, sessionIds, paymentMethod: 'Bank Transfer'|'UPI', accountNumber, transactionRef }
   * The server works out the amounts from the sessions still unpaid, numbers the invoice (INV-00001…) and
   * emails it to the therapist's email on file. Each release is its own record; a session can be paid once.
   * { action: 'resend-invoice', invoiceNumber } re-sends a stored invoice. Bodies without these update a payout record.
   */
  static async releasePayout(req: Request, res: Response): Promise<void> {
    const body = req.body || {};
    if (body.action === 'resend-invoice') return PayoutsController.resendInvoice(req, res);
    if (!body.sessionIds && !body.therapistId) return PayoutsController.update(req, res);
    const reject = (status: number, error: string) => { res.status(status).json({ success: false, error }); };
    try {
      const therapistId = String(body.therapistId || '').trim();
      const sessionIds: string[] = Array.from(new Set<string>((Array.isArray(body.sessionIds) ? body.sessionIds : [])
        .map((sid: any) => String(sid).replace(/^SR-/, '').trim()).filter(Boolean)));
      const paymentMethod = String(body.paymentMethod || '').trim();
      const accountNumber = String(body.accountNumber || '').trim();
      const transactionRef = String(body.transactionRef || '').trim();

      if (!therapistId) return reject(400, 'Choose the therapist being paid.');
      if (!sessionIds.length) return reject(400, 'Select at least one session to pay.');
      if (!PAYOUT_METHODS.includes(paymentMethod)) return reject(400, 'Payment method must be Bank Transfer or UPI.');
      if (!accountNumber) return reject(400, paymentMethod === 'UPI' ? 'Enter the UPI ID the payout was sent to.' : 'Enter the bank account the payout was sent to.');
      if (transactionRef.length < 4) return reject(400, `Enter the ${paymentMethod === 'UPI' ? 'UPI' : 'bank (UTR)'} reference of the transfer you made.`);

      const db = getDatabase();
      // Fresh figures (not the cached list), so a session paid a moment ago is never paid twice
      const { payouts, consultants } = await buildPayouts(db);
      const payout = payouts.find((p) => p.therapistId === therapistId);
      const consultant: any = consultants.find((c: any) => String(c._id) === therapistId);
      if (!payout || !consultant) return reject(404, 'Therapist not found.');

      const byId = new Map(payout.unpaidSessions.map((s) => [s.sessionId, s]));
      const notPayable = sessionIds.filter((sid) => !byId.has(sid));
      if (notPayable.length) {
        return reject(409, `${notPayable.length} of the selected session(s) are already paid out or not payable any more. Reload the page and try again.`);
      }
      const sessions = sessionIds.map((sid) => byId.get(sid)!);
      const grossAmount = sessions.reduce((acc, s) => acc + s.sessionFee, 0);
      const netPayout = sessions.reduce((acc, s) => acc + s.therapistShare, 0);
      const therapistEmail = String(consultant.email || '').toLowerCase().trim();
      const now = new Date();

      const invoice = {
        invoiceNumber: await nextSequenceNumber('payoutInvoice'),
        payoutDate: istLabels(now).date,
        therapistId,
        therapistName: payout.therapistName,
        therapistEmail,
        profession: payout.profession,
        sessionsCount: sessions.length,
        sessionIds,
        grossAmount,
        platformFee: grossAmount - netPayout,
        netPayout,
        paymentMethod,
        accountNumber,
        transactionRef,
        sessions: sessions.map((s) => ({
          id: s.bookingNumber || s.sessionId,
          bookingId: s.sessionId,
          clientName: s.clientName,
          date: s.sessionDate || '',
          fee: s.sessionFee,
          commission: s.platformFee,
          net: s.therapistShare
        })),
        releasedBy: req.user?.email || '',
        createdAt: now,
        updatedAt: now
      };

      // A new record every time: an earlier invoice is never replaced
      const inserted = await db.collection('PayoutInvoice').insertOne({ ...invoice });
      // Two releases of the same session at the same moment: the earlier invoice stands, the later one is withdrawn
      const clash = await db.collection('PayoutInvoice').findOne({
        _id: { $lt: inserted.insertedId },
        sessionIds: { $in: [...sessionIds, ...sessionIds.map((sid) => `SR-${sid}`)] }
      });
      if (clash) {
        await db.collection('PayoutInvoice').deleteOne({ _id: inserted.insertedId });
        return reject(409, `These sessions were just paid out in invoice ${clash.invoiceNumber}. Reload the page.`);
      }
      cacheService.invalidateTags(['payouts', 'stats', 'revenue']);

      const mail = therapistEmail
        ? await MailService.sendPayoutInvoice(invoice)
        : { success: false, error: 'The therapist has no email address on file, so no invoice email was sent.' };
      await db.collection('PayoutInvoice').updateOne({ _id: inserted.insertedId }, { $set: { emailed: mail.success, emailError: mail.success ? null : mail.error || null } }).catch(() => {});
      // The server-wide admin audit trail records this release (admin, route, status)

      res.status(201).json({
        success: true,
        invoice: invoiceToHistory({ ...invoice, emailed: mail.success }),
        emailed: mail.success,
        emailError: mail.success ? undefined : mail.error,
        message: mail.success ? 'Payout recorded and invoice emailed' : 'Payout recorded; the invoice email was not sent'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to release payout' });
    }
  }

  /** { action: 'resend-invoice', invoiceNumber } — emails a stored invoice again, as it was recorded */
  static async resendInvoice(req: Request, res: Response): Promise<void> {
    try {
      const invoiceNumber = String(req.body?.invoiceNumber || '').trim();
      if (!invoiceNumber) {
        res.status(400).json({ success: false, error: 'invoiceNumber is required' });
        return;
      }
      const db = getDatabase();
      const inv: any = await db.collection('PayoutInvoice').findOne({ invoiceNumber });
      if (!inv) {
        res.status(404).json({ success: false, error: 'Invoice not found' });
        return;
      }
      if (!inv.therapistEmail) {
        res.json({ success: true, emailed: false, emailError: 'The therapist has no email address on file.' });
        return;
      }
      const h = invoiceToHistory(inv);
      const mail = await MailService.sendPayoutInvoice({ ...h, sessions: h.sessions });
      res.json({ success: true, emailed: mail.success, emailError: mail.success ? undefined : mail.error, to: inv.therapistEmail });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to resend the invoice' });
    }
  }
}
