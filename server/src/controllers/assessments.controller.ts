import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';
import { canViewFullClient, ClientViewer, resolveClientViewer } from '../services/client-access';
import { idQuery } from '../services/live-content';
import { emailNotification } from '../services/notification.service';
import {
  clientAccessRefusal, escapeRegex, findClientUser, namesOtherClient, ownClientUser, ownConsultant, refuse, serverError
} from '../services/clinical-access';

/** Results (scores, severity, answers, notes) are clinical details: only the assigned therapist and the client see them */
const SUBMISSION_RESULT_FIELDS = ['score', 'totalScore', 'maxScore', 'severity', 'severityLabel', 'severityColor', 'flaggedRisk', 'answers', 'responses', 'notes', 'interpretation'];

async function protectSubmissions(viewer: ClientViewer, submissions: any[]): Promise<any[]> {
  if (viewer.kind === 'internal') return submissions;

  const db = getDatabase();
  const emails = [...new Set(submissions.map((s) => String(s.clientEmail || s.email || '').toLowerCase()).filter(Boolean))];
  const ids = [...new Set(submissions.map((s) => String(s.clientId || s.userId || '')).filter(Boolean))];
  const clients: any[] = emails.length || ids.length
    ? await db.collection('User').find({ $or: [{ email: { $in: emails } }, { id: { $in: ids } }, { _id: { $in: ids as any[] } }] }).toArray().catch(() => [])
    : [];

  const findClient = (s: any) => {
    const email = String(s.clientEmail || s.email || '').toLowerCase();
    const id = String(s.clientId || s.userId || '');
    return clients.find((c) => (email && String(c.email || '').toLowerCase() === email) || (id && (String(c.id) === id || String(c._id) === id)));
  };

  return submissions.map((s) => {
    const client = findClient(s) || { id: s.clientId, email: s.clientEmail || s.email };
    if (canViewFullClient(viewer, client)) return s;
    const basic: any = { ...s, detailsRestricted: true };
    SUBMISSION_RESULT_FIELDS.forEach((f) => delete basic[f]);
    return basic;
  });
}

/** One spelling per scale, so "WHO-5", "WHO5 Well-Being" and "who-5" are the same assessment */
function normalizeAcronym(raw: unknown): string {
  const upper = String(raw || '').trim().toUpperCase();
  if (upper.includes('WHO')) return 'WHO-5';
  if (upper.includes('PSS') || upper.includes('STRESS')) return 'PSS-10';
  if (upper.includes('WSAS') || upper.includes('FUNCTION')) return 'WSAS';
  if (upper.includes('GAD') || upper.includes('ANXIETY')) return 'GAD-7';
  if (upper.includes('PHQ') || upper.includes('DEPRESSION')) return 'PHQ-9';
  if (upper.includes('PCL') || upper.includes('PTSD') || upper.includes('TRAUMA')) return 'PCL-5';
  if (upper.includes('OCI') || upper.includes('OCD')) return 'OCI-R';
  if (upper.includes('ASRS') || upper.includes('ADHD')) return 'ASRS';
  return upper.replace(/[^A-Z0-9-]/g, '');
}

/** Each scale's own cutoffs (the same ranges the client app scores with); WHO-5 is higher-is-better */
const SCALES: Record<string, { title: string; max: number; ranges: Array<[number, string, string, boolean]> }> = {
  'WHO-5': { title: 'WHO-5 Well-Being Index', max: 25, ranges: [[6, 'Poor Well-Being (<25%)', 'bg-rose-600', true], [12, 'Reduced Well-Being (28-48%)', 'bg-amber-500', false], [25, 'Good Well-Being (50-100%)', 'bg-emerald-500', false]] },
  'PSS-10': { title: 'Perceived Stress Scale-10', max: 40, ranges: [[13, 'Low Perceived Stress', 'bg-emerald-500', false], [26, 'Moderate Stress', 'bg-amber-500', false], [40, 'High Perceived Stress', 'bg-rose-600', true]] },
  'WSAS': { title: 'Work and Social Adjustment Scale', max: 40, ranges: [[9, 'Subthreshold Population', 'bg-emerald-500', false], [20, 'Significant Impairment', 'bg-amber-500', false], [40, 'Severe Impairment', 'bg-rose-600', true]] },
  'PHQ-9': { title: 'Patient Health Questionnaire-9', max: 27, ranges: [[4, 'Minimal / None', 'bg-emerald-500', false], [9, 'Mild Depression', 'bg-amber-500', false], [14, 'Moderate Depression', 'bg-orange-500', false], [19, 'Moderately Severe', 'bg-rose-600', true], [27, 'Severe Depression', 'bg-purple-600', true]] },
  'GAD-7': { title: 'Generalized Anxiety Disorder 7 (GAD-7)', max: 21, ranges: [[4, 'Minimal Anxiety', 'bg-emerald-500', false], [9, 'Mild Anxiety', 'bg-amber-500', false], [14, 'Moderate Anxiety', 'bg-orange-500', false], [21, 'Severe Anxiety', 'bg-rose-600', true]] },
  'PCL-5': { title: 'PTSD Checklist (PCL-5)', max: 80, ranges: [[32, 'Subthreshold Symptoms', 'bg-emerald-500', false], [45, 'Moderate PTSD (Probable)', 'bg-amber-500', true], [80, 'Severe PTSD Symptoms', 'bg-rose-600', true]] },
  'OCI-R': { title: 'Obsessive-Compulsive Inventory-Revised', max: 72, ranges: [[20, 'Subthreshold OCD Symptoms', 'bg-emerald-500', false], [40, 'OCD Elevation', 'bg-amber-500', false], [72, 'Severe OCD Impairment', 'bg-rose-600', true]] },
};

/** Calendar day (UTC) a submission or profile score belongs to */
function dayOf(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) return isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/**
 * Attempts saved only on the client's profile (User.assessmentScores) with no AssessmentScore record,
 * e.g. results whose record was lost in a reseed. Only entries with recorded answers count as real
 * attempts (seeded profile scores have none); an entry already stored as a submission (same scale,
 * day and score) is skipped. Severity is recomputed from the scale's cutoffs, since older entries
 * carry a generic label (WHO-5 25/25 was saved as "Severe Elevation").
 */
function profileOnlySubmissions(user: any, stored: any[]): any[] {
  const scores: any[] = Array.isArray(user?.assessmentScores) ? user.assessmentScores : [];
  const userId = String(user?.id || user?._id || '');
  const userEmail = String(user?.email || '').toLowerCase().trim();
  const mine = stored.filter((s) =>
    (userEmail && String(s.clientEmail || s.email || '').toLowerCase().trim() === userEmail) ||
    (userId && String(s.clientId || s.userId || '') === userId)
  );

  const out: any[] = [];
  scores.forEach((entry: any, idx: number) => {
    if (!Array.isArray(entry?.answers) || entry.answers.length === 0) return;
    const acronym = normalizeAcronym(entry.name || entry.type);
    const totalScore = Number(entry.score);
    const day = dayOf(entry.date);
    if (!acronym || !Number.isFinite(totalScore) || !day) return;

    const alreadyStored = mine.some((s) =>
      normalizeAcronym(s.assessmentAcronym || s.assessmentTitle) === acronym &&
      Number(s.totalScore ?? s.score) === totalScore &&
      (dayOf(s.createdAt) === day || dayOf(s.completedAt) === day)
    );
    if (alreadyStored) return;

    const scale = SCALES[acronym];
    const maxScore = Number(entry.maxScore) || scale?.max || 21;
    const range = scale?.ranges.find(([upTo]) => totalScore <= upTo);
    const severityLabel = range ? range[1] : String(entry.severity || 'Completed');
    const at = new Date(new Date(`${day}T00:00:00.000Z`).getTime() + idx * 1000);

    out.push({
      id: `SUB-PROFILE-${userId}-${idx}`,
      assessmentId: `ASS-${acronym}`,
      assessmentAcronym: acronym,
      assessmentTitle: scale?.title || `${acronym} Assessment`,
      clientId: userId,
      clientName: user?.name || 'Client',
      clientEmail: userEmail,
      consultantId: String(user?.assignedTherapistId || ''),
      consultantName: String(user?.assignedTherapistName || ''),
      therapistName: String(user?.assignedTherapistName || ''),
      totalScore,
      score: totalScore,
      maxScore,
      severity: severityLabel,
      severityLabel,
      severityColor: range ? `${range[2]} text-white` : 'bg-emerald-500 text-white',
      flaggedRisk: range ? range[3] : false,
      answers: entry.answers,
      notes: `${acronym} completed by ${user?.name || 'the client'}.`,
      completedAt: day,
      createdAt: at,
      source: 'profile'
    });
  });
  return out;
}

export class AssessmentsController {
  /**
   * GET /api/assessments and GET /api/assessments/scores
   * Fetch assessment scores and submissions strictly from the AssessmentScore collection
   * and automatically link all submissions belonging to the consultant's assigned clients.
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      let clientEmail = String(req.query.clientEmail || '').toLowerCase().trim();
      let clientId = String(req.query.clientId || '').trim();
      let consultantName = String(req.query.consultantName || '');
      // A therapist is matched by every id their Consultant record is known by
      let consultantIds = [String(req.query.consultantId || '').trim()].filter(Boolean);
      // Every id a resolved client account is known by (records store its custom id or its _id)
      let resolvedClientIds: string[] = [];

      // Who may read: the client (own results), their assigned therapist, an admin, the website (internal)
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        refuse(res, { status: 401, error: 'Please sign in to see assessment results.' });
        return;
      }
      if (viewer.kind === 'client') {
        const me = await ownClientUser(db, viewer);
        if (!me || namesOtherClient(me, { email: clientEmail, id: clientId })) {
          refuse(res, { status: 403, error: 'You can only view your own assessments.' });
          return;
        }
        // A client always gets exactly their own results
        clientEmail = String(me.email || '').toLowerCase().trim();
        clientId = String(me.id || me._id);
        resolvedClientIds = [me.id, me._id].filter(Boolean).map(String);
        consultantIds = [];
        consultantName = '';
      } else if (viewer.kind === 'therapist') {
        const me = await ownConsultant(db, viewer);
        if (!me || consultantIds.some((id) => !viewer.ids.has(id.toLowerCase()))) {
          refuse(res, { status: 403, error: 'You can only view your own clients\' assessments.' });
          return;
        }
        if (clientEmail || clientId) {
          // One client: only an assigned therapist sees their record
          const client = await findClientUser(db, { email: clientEmail, id: clientId });
          if (!client) {
            refuse(res, { status: 404, error: 'Client not found' });
            return;
          }
          if (namesOtherClient(client, { email: clientEmail, id: clientId }) || clientAccessRefusal(viewer, client)) {
            refuse(res, { status: 403, error: 'This client is not assigned to you.' });
            return;
          }
          clientEmail = String(client.email || '').toLowerCase().trim();
          clientId = String(client.id || client._id);
          resolvedClientIds = [client.id, client._id].filter(Boolean).map(String);
          consultantIds = [];
          consultantName = '';
        } else {
          // The therapist's own clients, by id only (no name matching)
          consultantIds = [...new Set([me.id, me._id].filter(Boolean).map(String))];
          consultantName = '';
        }
      }

      const scoreQuery: any = {};
      const assignQuery: any = {};

      // A client is matched by email OR id (older records carry only one of them)
      if (clientEmail || clientId) {
        const email = String(clientEmail || '').toLowerCase().trim();
        const ids = [...new Set([clientId, ...resolvedClientIds].filter(Boolean))];
        const clientOr = [
          ...(email ? [{ clientEmail: email }, { email }] : []),
          ...(ids.length ? [{ clientId: { $in: ids } }, { userId: { $in: ids } }] : [])
        ];
        scoreQuery.$or = clientOr;
        assignQuery.$or = clientOr;
      }

      let assignedUsers: any[] = [];

      if (consultantIds.length || consultantName) {
        const cleanName = escapeRegex(String(consultantName || '').replace(/^dr\.?\s*/i, '').trim());
        const cid = consultantIds.length ? { $in: consultantIds } : null;

        // 1. Discover all clients assigned to this consultant in User & Booking collections
        const userConditions: any[] = [];
        if (cid) userConditions.push({ assignedTherapistId: cid }, { therapistId: cid });
        if (cleanName) {
          userConditions.push(
            { assignedTherapistName: { $regex: cleanName, $options: 'i' } },
            { therapist: { $regex: cleanName, $options: 'i' } }
          );
        }

        const [primaryUsers, fallbackUsers, assignedBookings] = await Promise.all([
          userConditions.length > 0 ? db.collection('User').find({ $or: userConditions }).toArray() : [],
          userConditions.length > 0 ? db.collection('users').find({ $or: userConditions }).toArray() : [],
          db.collection('Booking').find({
            $or: [
              ...(cid ? [{ consultantId: cid }, { therapistId: cid }] : []),
              ...(cleanName ? [{ consultantName: { $regex: cleanName, $options: 'i' } }, { therapistName: { $regex: cleanName, $options: 'i' } }] : [])
            ]
          }).toArray().catch(() => [])
        ]);

        assignedUsers = [...primaryUsers, ...fallbackUsers];

        const assignedEmails = new Set<string>();
        const assignedIds = new Set<string>();

        assignedUsers.forEach((u: any) => {
          if (u.email) assignedEmails.add(String(u.email).toLowerCase().trim());
          if (u.id) assignedIds.add(String(u.id).trim());
          if (u._id) assignedIds.add(String(u._id).trim());
        });

        assignedBookings.forEach((b: any) => {
          if (b.clientEmail) assignedEmails.add(String(b.clientEmail).toLowerCase().trim());
          if (b.clientId) assignedIds.add(String(b.clientId).trim());
          if (b.userId) assignedIds.add(String(b.userId).trim());
        });

        const cConditions: any[] = [];
        if (cid) {
          cConditions.push({ consultantId: cid });
        }
        if (cleanName) {
          cConditions.push({ consultantName: { $regex: cleanName, $options: 'i' } });
          cConditions.push({ therapistName: { $regex: cleanName, $options: 'i' } });
        }
        if (assignedEmails.size > 0) {
          cConditions.push({ clientEmail: { $in: Array.from(assignedEmails) } });
          cConditions.push({ email: { $in: Array.from(assignedEmails) } });
        }
        if (assignedIds.size > 0) {
          cConditions.push({ clientId: { $in: Array.from(assignedIds) } });
          cConditions.push({ userId: { $in: Array.from(assignedIds) } });
        }

        // A consultant filter that names no one matches nothing (never everything)
        if (cConditions.length === 0) cConditions.push({ _id: '__no-consultant-match__' });

        // Combined with a client filter, both must hold
        for (const q of [scoreQuery, assignQuery]) {
          if (q.$or) {
            q.$and = [{ $or: q.$or }, { $or: cConditions }];
            delete q.$or;
          } else {
            q.$or = cConditions;
          }
        }
      }

      // Fetch submissions from AssessmentScore / assessment_scores collection
      const [primarySubmissions, fallbackSubmissions, assignments] = await Promise.all([
        db.collection('AssessmentScore')
          .find(scoreQuery)
          .sort({ createdAt: -1, completedAt: -1 })
          .toArray(),
        db.collection('assessment_scores')
          .find(scoreQuery)
          .sort({ createdAt: -1, completedAt: -1 })
          .toArray().catch(() => []),
        db.collection('AssessmentAssignment')
          .find(assignQuery)
          .sort({ assignedDate: -1, createdAt: -1 })
          .toArray().catch(() => [])
      ]);

      // Deduplicate submissions
      const seenSubIds = new Set<string>();
      const submissions: any[] = [];

      [...primarySubmissions, ...fallbackSubmissions].forEach((sub: any) => {
        const key = String(sub.id || sub._id);
        if (!seenSubIds.has(key)) {
          seenSubIds.add(key);
          submissions.push(sub);
        }
      });

      // Attempts saved only on a client profile (no AssessmentScore record) are returned too, so the
      // client panel and the therapist panel show the same results from this one endpoint
      const profileUsers: any[] = [...assignedUsers];
      const filterEmail = String(clientEmail || '').toLowerCase().trim();
      const filterId = String(clientId || '').trim();
      if (filterEmail || filterId) {
        const userOr: any[] = [
          ...(filterEmail ? [{ email: filterEmail }] : []),
          ...(filterId ? idQuery(filterId).$or : [])
        ];
        const self = await db.collection('User').findOne({ $or: userOr }).catch(() => null)
          || await db.collection('users').findOne({ $or: userOr }).catch(() => null);
        if (self) profileUsers.push(self);
      }
      const seenUsers = new Set<string>();
      for (const u of profileUsers) {
        const uid = String(u.id || u._id || '');
        const uemail = String(u.email || '').toLowerCase().trim();
        // With a client filter, only that client; never other clients of the same therapist
        if ((filterEmail || filterId) && !((filterEmail && uemail === filterEmail) || (filterId && (uid === filterId || String(u._id) === filterId)))) continue;
        const key = uid || uemail;
        if (!key || seenUsers.has(key)) continue;
        seenUsers.add(key);
        submissions.push(...profileOnlySubmissions(u, submissions));
      }

      const visibleSubmissions = await protectSubmissions(viewer, submissions);

      res.json({
        success: true,
        count: visibleSubmissions.length,
        submissionsCount: visibleSubmissions.length,
        assignmentsCount: assignments.length,
        submissions: visibleSubmissions,
        scores: visibleSubmissions,
        assignments
      });
    } catch (error: any) {
      serverError(res, 'AssessmentsController.getAll', error, 'Failed to fetch assessment scores');
    }
  }

  /**
   * POST /api/assessments/score and POST /api/assessments/submit
   * Save client assessment details and score directly to AssessmentScore collection
   */
  static async saveScore(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      const totalScore = Number(body.totalScore ?? body.score ?? 0);
      const maxScore = Number(body.maxScore ?? (body.type === 'PHQ-9' ? 27 : body.type === 'GAD-7' ? 21 : 25));
      const type = body.assessmentAcronym || body.type || 'GAD-7';
      const title = body.assessmentTitle || body.title || 'Assessment';
      const askedEmail = String(body.clientEmail || '').toLowerCase().trim();
      const bodyClientId = String(body.clientId || body.userId || '').trim();

      // A score is the signed-in client's own result; admins and the website (internal) may record one
      // for a named, existing client. Therapists and anonymous callers cannot.
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        refuse(res, { status: 401, error: 'Please sign in to submit an assessment.' });
        return;
      }
      if (viewer.kind === 'therapist') {
        refuse(res, { status: 403, error: 'Only the client can submit their own assessment.' });
        return;
      }
      let u: any;
      if (viewer.kind === 'client') {
        u = await ownClientUser(db, viewer);
        if (!u || namesOtherClient(u, { email: askedEmail, id: bodyClientId })) {
          refuse(res, { status: 403, error: 'You can only submit your own assessment.' });
          return;
        }
      } else {
        u = await findClientUser(db, { email: askedEmail, id: bodyClientId });
        if (!u || namesOtherClient(u, { email: askedEmail, id: bodyClientId })) {
          refuse(res, { status: 404, error: 'Client not found' });
          return;
        }
      }
      const clientEmail = String(u.email || '').toLowerCase().trim();
      const clientId = String(u.id || u._id);
      const clientName = u.name || body.clientName || 'Client';

      // The client's account, by every key it is known by
      const userOr: any[] = [
        ...(clientEmail ? [{ email: clientEmail }] : []),
        ...idQuery(clientId).$or
      ];

      // The therapist always comes from the client's own assignment; a client-sent consultant id is
      // used only when no assignment exists and it names a real Consultant

      const findConsultant = async (ref: string) =>
        ref ? await db.collection('Consultant').findOne(idQuery(ref)).catch(() => null) : null;
      const consultant: any =
        await findConsultant(String(u?.assignedTherapistId || '').trim()) ||
        await findConsultant(String(body.consultantId || body.therapistId || '').trim());
      const consultantId = consultant ? String(consultant.id || consultant._id) : '';
      const consultantName = consultant?.name || '';

      // The client app scores each scale with its own ranges (WHO-5: higher is better, PCL-5 is out of 80, ...),
      // so its severity is kept. The generic thresholds below only fill in when none was sent.
      let severityLabel = String(body.severityLabel || body.severity || '').trim();
      let severityColor = String(body.severityColor || '').trim();
      let flaggedRisk = Boolean(body.flaggedRisk);

      if (!severityLabel) {
        if (totalScore >= 15) {
          severityLabel = 'Severe Elevation';
          severityColor = 'bg-rose-600 text-white';
          flaggedRisk = true;
        } else if (totalScore >= 10) {
          severityLabel = 'Moderate';
          severityColor = 'bg-amber-500 text-white';
        } else {
          severityLabel = 'Mild / Minimal';
          severityColor = 'bg-emerald-500 text-white';
        }
      }
      if (!severityColor) severityColor = flaggedRisk ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-white';

      // The client panel sends its own submission id; it is kept only when it is a plain, unused id
      const sentId = /^[A-Za-z0-9_.:-]{1,80}$/.test(String(body.id ?? '')) ? String(body.id) : '';
      const idTaken = sentId
        ? await db.collection('AssessmentScore').findOne({ id: { $in: [sentId, Number(sentId)] } }, { projection: { _id: 1 } }).catch(() => null)
        : null;

      const newScoreDoc = {
        id: sentId && !idTaken ? body.id : `ASC-${Date.now().toString().slice(-6)}`,
        assessmentId: body.assessmentId || `ASS-${type}`,
        assessmentAcronym: type,
        assessmentTitle: title,
        clientId,
        clientName,
        clientEmail,
        consultantId,
        consultantName,
        therapistName: consultantName,
        totalScore,
        score: totalScore,
        maxScore,
        severity: severityLabel,
        severityLabel,
        severityColor,
        flaggedRisk,
        answers: Array.isArray(body.answers) ? body.answers : [],
        notes: body.notes || `Completed ${type} assessment with score ${totalScore}/${maxScore}.`,
        completedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('AssessmentScore').insertOne(newScoreDoc);
      await db.collection('assessment_scores').insertOne(newScoreDoc).catch(() => {});

      // The matching pending assignment (this client, this assessment) is now completed
      let completedAssignment: any = null;
      const assignmentClientOr: any[] = [
        ...(clientEmail ? [{ clientEmail }] : []),
        ...[...new Set([clientId, u.id, u._id].filter(Boolean).map(String))].map((id) => ({ clientId: id }))
      ];
      if (assignmentClientOr.length) {
        const assessmentOr: any[] = [{ assessmentAcronym: type }];
        if (body.assessmentId) assessmentOr.push({ assessmentId: String(body.assessmentId) });
        const assignmentFilter: any = body.assignmentId
          ? { $and: [idQuery(String(body.assignmentId)), { $or: assignmentClientOr }] }
          : { $and: [{ $or: assignmentClientOr }, { $or: assessmentOr }, { status: { $regex: '^pending$', $options: 'i' } }] };
        const completion = { status: 'Completed', scoreId: newScoreDoc.id, completedAt: new Date(), updatedAt: new Date() };
        completedAssignment = await db.collection('AssessmentAssignment').findOneAndUpdate(
          assignmentFilter,
          { $set: completion },
          { sort: { assignedDate: 1, createdAt: 1 }, returnDocument: 'after' }
        ).catch(() => null);
        if (completedAssignment) {
          await db.collection('assessment_assignments').updateOne(idQuery(String(completedAssignment.id || completedAssignment._id)), { $set: completion }).catch(() => {});
        }
      }

      // Sync into client's User document assessmentScores array
      if (userOr.length) {
        const userFilter: any = { $or: userOr };
        const scoreItem = {
          name: type,
          score: totalScore,
          maxScore,
          date: new Date().toISOString().split('T')[0],
          severity: severityLabel,
          answers: newScoreDoc.answers
        };
        await db.collection('User').updateOne(userFilter, { $push: { assessmentScores: scoreItem } } as any).catch(() => {});
        await db.collection('users').updateOne(userFilter, { $push: { assessmentScores: scoreItem } } as any).catch(() => {});
      }

      // In-app notification and email for the therapist
      if (consultantId) try {
        const alert = {
          id: `NOTIF-${Date.now().toString().slice(-6)}-ASC`,
          recipientId: consultantId,
          recipientEmail: String(consultant?.email || '').toLowerCase(),
          recipientRole: 'CONSULTANT' as const,
          type: 'ASSESSMENT_COMPLETED',
          title: `New Assessment Completed: ${clientName} 📋`,
          message: `${clientName} completed the ${type} assessment. Score: ${totalScore}/${maxScore} (${severityLabel}).`,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await db.collection('Notification').insertOne({ ...alert });
        await emailNotification(alert);
      } catch {}

      res.status(201).json({
        success: true,
        score: { ...newScoreDoc, _id: result.insertedId },
        assignment: completedAssignment,
        message: 'Assessment score saved in AssessmentScore collection.'
      });
    } catch (error: any) {
      serverError(res, 'AssessmentsController.saveScore', error, 'Failed to save assessment score');
    }
  }

  /**
   * POST /api/assessments/assign
   */
  static async assign(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      // Who may assign: a therapist to their own (assigned) clients, an admin, the website (internal)
      const viewer = await resolveClientViewer(req);
      if (viewer.kind === 'anonymous') {
        refuse(res, { status: 401, error: 'Please sign in to assign an assessment.' });
        return;
      }
      if (viewer.kind === 'client') {
        refuse(res, { status: 403, error: 'Only therapists and the admin team can assign assessments.' });
        return;
      }

      // Store the client's real User id/email (panels may send only one of them); the client must exist
      const rawClientEmail = String(body.clientEmail || '').toLowerCase().trim();
      const rawClientId = String(body.clientId || '').trim();
      const client: any = await findClientUser(db, { email: rawClientEmail, id: rawClientId });
      if (!client || namesOtherClient(client, { email: rawClientEmail, id: rawClientId })) {
        refuse(res, { status: 404, error: 'Client not found' });
        return;
      }
      if (refuse(res, clientAccessRefusal(viewer, client))) return;

      // A therapist assigns as themself; admins may name the therapist
      const consultant: any = viewer.kind === 'therapist' ? await ownConsultant(db, viewer) : null;
      const consultantId = consultant ? String(consultant.id || consultant._id) : String(body.consultantId || '');
      const consultantName = consultant?.name || body.consultantName || 'Therapist';

      const newAssignment = {
        id: `ASN-${Date.now().toString().slice(-6)}`,
        assessmentId: body.assessmentId || 'ASS-01',
        assessmentAcronym: body.assessmentAcronym || 'GAD-7',
        assessmentTitle: body.assessmentTitle || 'Screener',
        clientId: String(client.id || client._id),
        clientName: client.name || body.clientName || 'Client',
        clientEmail: String(client.email || '').toLowerCase(),
        consultantId,
        consultantName,
        therapistName: consultantName,
        assignedDate: new Date().toISOString().split('T')[0],
        dueDate: body.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        frequency: body.frequency || 'Weekly Check-in',
        status: 'Pending',
        createdAt: new Date()
      };

      await db.collection('AssessmentAssignment').insertOne(newAssignment);

      // In-app notification for the assigned client
      try {
        const notifDoc = {
          id: `NOTIF-${Date.now().toString().slice(-6)}-ASN`,
          recipientId: newAssignment.clientId,
          recipientEmail: newAssignment.clientEmail,
          clientEmail: newAssignment.clientEmail,
          clientName: newAssignment.clientName,
          recipientRole: 'CLIENT',
          type: 'ASSESSMENT_ASSIGNED',
          title: `New Assessment Assigned: ${newAssignment.assessmentAcronym || newAssignment.assessmentTitle} 📋`,
          message: `Your consultant ${newAssignment.consultantName} assigned you "${newAssignment.assessmentTitle}". Tap to begin your check-in.`,
          link: '/assessments',
          assessmentId: newAssignment.assessmentId,
          assessmentTitle: newAssignment.assessmentTitle,
          consultantId: newAssignment.consultantId,
          consultantName: newAssignment.consultantName,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.collection('Notification').insertOne({ ...notifDoc });
        await db.collection('notifications').insertOne({ ...notifDoc }).catch(() => {});
        await emailNotification({ ...notifDoc, recipientRole: 'CLIENT' });
      } catch (err) {
        console.error('Failed to create assessment assignment notification:', err);
      }

      res.status(201).json({
        success: true,
        assignment: newAssignment,
        message: 'Assessment assigned and client notified successfully.'
      });
    } catch (error: any) {
      serverError(res, 'AssessmentsController.assign', error, 'Failed to assign assessment');
    }
  }
}
