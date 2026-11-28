import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';
import { escapeRegex, serverError } from '../services/clinical-access';
import { adminActor, AuditSeverity, recordAudit } from '../services/admin-audit';

export interface AuditLogDocument {
  id: string;
  user: string;
  userId?: string;
  role: string;
  action: string;
  module: string;
  severity: AuditSeverity;
  timestamp: string;
  createdAt: Date;
  ipAddress: string;
  details?: Record<string, any> | string;
  userAgent?: string;
  status?: string;
}

const SEVERITIES = new Set<AuditSeverity>(['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL']);

/**
 * The admin audit trail (all routes behind requireAdmin, see routes/logs.routes.ts). Entries are written by the
 * server: automatically for every admin change (services/admin-audit.ts) and through POST for a description the
 * panel adds. Nothing can edit or delete them through the API.
 */
export class LogsController {
  /**
   * GET /api/admin/logs?page=&limit=&module=&severity=&search=
   * Newest first, paged on the server so the whole history is reachable.
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { module, severity, search, limit = '100', page = '1' } = req.query;
      const db = getDatabase();

      const query: any = {};
      if (module && module !== 'All') {
        query.module = { $regex: `^${escapeRegex(module)}$`, $options: 'i' };
      }
      const sev = String(severity || '').toUpperCase();
      if (sev && sev !== 'ALL') query.severity = sev;
      const s = String(search || '').trim().slice(0, 100);
      if (s) {
        const rx = { $regex: escapeRegex(s), $options: 'i' };
        query.$or = [{ action: rx }, { user: rx }, { role: rx }, { module: rx }, { id: rx }, { ipAddress: rx }, { 'details.targetId': rx }];
      }

      const pageSize = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 500);
      const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
      const skip = (pageNum - 1) * pageSize;

      const collection = db.collection('AuditLog');
      const [logs, totalCount, modules] = await Promise.all([
        collection.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(pageSize).toArray(),
        collection.countDocuments(query),
        collection.distinct('module')
      ]);

      const formattedLogs = logs.map((log: any) => ({
        id: log.id || String(log._id),
        user: log.user || 'Unknown',
        userId: log.userId || null,
        role: log.role || '',
        action: log.action || '',
        module: log.module || 'System',
        severity: String(log.severity || 'INFO').toUpperCase(),
        timestamp: log.timestamp || (log.createdAt ? new Date(log.createdAt).toISOString() : ''),
        ipAddress: log.ipAddress || '',
        details: log.details || null,
        userAgent: log.userAgent || '',
        createdAt: log.createdAt || null
      }));

      res.json({
        success: true,
        count: formattedLogs.length,
        total: totalCount,
        page: pageNum,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        modules: modules.filter(Boolean).map(String).sort(),
        logs: formattedLogs
      });
    } catch (error: any) {
      serverError(res, 'logs.getAll', error, 'Failed to fetch audit logs');
    }
  }

  /**
   * POST /api/admin/logs { action, module, severity?, details? }
   * Adds a description from the panel. Who did it, the IP and the time come from the signed token and the
   * request, never from the body.
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const actor = adminActor(req);
      if (!actor) {
        res.status(401).json({ success: false, error: 'Administrator authentication required. Please sign in again.' });
        return;
      }
      const body = req.body || {};
      const action = String(body.action || '').trim();
      if (!action) {
        res.status(400).json({ success: false, error: 'action is required' });
        return;
      }
      const requested = String(body.severity || 'INFO').toUpperCase() as AuditSeverity;
      // Only plain short values from details (no nested objects that could carry form data)
      const details: Record<string, unknown> = { source: 'panel' };
      if (body.details && typeof body.details === 'object') {
        for (const [k, v] of Object.entries(body.details).slice(0, 10)) {
          if (/pass|secret|token|bank|account|ifsc|upi|card/i.test(k)) continue;
          if (['string', 'number', 'boolean'].includes(typeof v)) details[k] = typeof v === 'string' ? v.slice(0, 200) : v;
        }
      }

      await recordAudit(req, actor, {
        action,
        module: String(body.module || 'System').trim() || 'System',
        severity: SEVERITIES.has(requested) ? requested : 'INFO',
        details
      });
      res.status(201).json({ success: true, message: 'Audit entry recorded.' });
    } catch (error: any) {
      serverError(res, 'logs.create', error, 'Failed to record audit entry');
    }
  }

  /**
   * GET /api/admin/logs/stats
   */
  static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const collection = getDatabase().collection('AuditLog');
      const [total, securityCount, paymentsCount, warningsCount] = await Promise.all([
        collection.countDocuments(),
        collection.countDocuments({ module: /Auth|Security/i }),
        collection.countDocuments({ module: /Payments|Payouts|Revenue/i }),
        collection.countDocuments({ severity: { $in: ['WARNING', 'ERROR', 'CRITICAL'] } })
      ]);
      res.json({
        success: true,
        stats: { totalEvents: total, securityEvents: securityCount, financialEvents: paymentsCount, warningEvents: warningsCount }
      });
    } catch (error: any) {
      serverError(res, 'logs.getStats', error, 'Failed to fetch audit log stats');
    }
  }

  /** Anything that would edit or delete the audit trail (e.g. the old DELETE /clear) */
  static async refuseChange(_req: Request, res: Response): Promise<void> {
    res.status(405).json({ success: false, error: 'Audit log entries cannot be changed or deleted.' });
  }
}
