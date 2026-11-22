import { Request, Response } from 'express';
import { isAdminUser } from '../middlewares/auth.middleware';
import { resolveConsultant } from '../services/booking-refs';
import {
  cleanPlanDays,
  deleteMonthPlan,
  getMonthPlan,
  isMonthLabel,
  MonthPlanInputError,
  monthPlanStatus,
  planConflicts,
  saveMonthPlan
} from '../services/month-plan';
import { canEditConsultant } from './consultants.controller';

const NOT_ALLOWED = 'You are not allowed to change this therapist\'s hours. Please sign in again.';

async function consultantFrom(req: Request, source: any): Promise<any | null> {
  return resolveConsultant({ id: source?.consultantId || source?.therapistId, email: source?.consultantEmail });
}

export class MonthPlanController {
  /**
   * GET /api/availability/month-plan?consultantId=&month=YYYY-MM
   * The saved plan (or null) plus the weekly hours the editor starts from.
   */
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const month = String(req.query.month || '').trim();
      if (!isMonthLabel(month)) {
        res.status(400).json({ success: false, error: 'month must be YYYY-MM' });
        return;
      }
      const consultant = await consultantFrom(req, req.query);
      if (!consultant) {
        res.status(404).json({ success: false, error: 'Therapist not found' });
        return;
      }
      if (!(await canEditConsultant(req, consultant))) {
        res.status(401).json({ success: false, error: NOT_ALLOWED });
        return;
      }
      const plan = await getMonthPlan(consultant, month);
      res.json({
        success: true,
        consultantId: String(consultant._id),
        month,
        weekly: consultant.availability && typeof consultant.availability === 'object' ? consultant.availability : null,
        plan: plan ? { month: plan.month, days: plan.days, weeks: plan.weeks || [], updatedAt: plan.updatedAt, updatedBy: plan.updatedBy } : null
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to load the month plan' });
    }
  }

  /**
   * PUT /api/availability/month-plan  { consultantId, month, days, weeks, confirm }
   * Without confirm, a plan that leaves booked sessions outside the new hours is refused with 409 and the list,
   * so the editor can warn first. Booked sessions are never cancelled by a plan.
   */
  static async save(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || {};
      const month = String(body.month || '').trim();
      if (!isMonthLabel(month)) {
        res.status(400).json({ success: false, error: 'month must be YYYY-MM' });
        return;
      }
      const consultant = await consultantFrom(req, body);
      if (!consultant) {
        res.status(404).json({ success: false, error: 'Therapist not found' });
        return;
      }
      if (!(await canEditConsultant(req, consultant))) {
        res.status(401).json({ success: false, error: NOT_ALLOWED });
        return;
      }
      const days = cleanPlanDays(month, body.days);
      const conflicts = await planConflicts(consultant, days);
      if (conflicts.length && body.confirm !== true) {
        res.status(409).json({
          success: false,
          error: `${conflicts.length} booked session${conflicts.length === 1 ? '' : 's'} fall outside the new hours`,
          conflicts
        });
        return;
      }
      const plan = await saveMonthPlan(consultant, month, days, body.weeks, { email: req.user?.email, role: req.user?.role || (isAdminUser(req.user) ? 'admin' : '') });
      res.json({ success: true, plan: { month: plan.month, days: plan.days, weeks: plan.weeks, updatedAt: plan.updatedAt }, conflicts });
    } catch (error: any) {
      if (error instanceof MonthPlanInputError) {
        res.status(400).json({ success: false, error: error.message });
        return;
      }
      res.status(500).json({ success: false, error: error?.message || 'Failed to save the month plan' });
    }
  }

  /** DELETE /api/availability/month-plan?consultantId=&month=  — the month goes back to the weekly hours */
  static async remove(req: Request, res: Response): Promise<void> {
    try {
      const source = { ...(req.query || {}), ...(req.body || {}) };
      const month = String(source.month || '').trim();
      if (!isMonthLabel(month)) {
        res.status(400).json({ success: false, error: 'month must be YYYY-MM' });
        return;
      }
      const consultant = await consultantFrom(req, source);
      if (!consultant) {
        res.status(404).json({ success: false, error: 'Therapist not found' });
        return;
      }
      if (!(await canEditConsultant(req, consultant))) {
        res.status(401).json({ success: false, error: NOT_ALLOWED });
        return;
      }
      const removed = await deleteMonthPlan(consultant, month);
      res.json({ success: true, removed });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to reset the month plan' });
    }
  }

  /** GET /api/availability/month-plan/status?month=YYYY-MM  (admins) — who has planned the month */
  static async status(req: Request, res: Response): Promise<void> {
    try {
      if (!isAdminUser(req.user) && !req.isInternal) {
        res.status(401).json({ success: false, error: 'Administrator authentication required. Please sign in again.' });
        return;
      }
      const month = String(req.query.month || '').trim();
      if (!isMonthLabel(month)) {
        res.status(400).json({ success: false, error: 'month must be YYYY-MM' });
        return;
      }
      const therapists = await monthPlanStatus(month);
      res.json({ success: true, month, planned: therapists.filter((t) => t.planned).length, total: therapists.length, therapists });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to load plan status' });
    }
  }
}
