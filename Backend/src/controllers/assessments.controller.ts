import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';
import { canViewFullClient, resolveClientViewer } from '../services/client-access';
import { idQuery } from '../services/live-content';
import { emailNotification } from '../services/notification.service';

/** Results (scores, severity, answers, notes) are clinical details: only the assigned therapist and the client see them */
const SUBMISSION_RESULT_FIELDS = ['score', 'totalScore', 'maxScore', 'severity', 'severityLabel', 'severityColor', 'flaggedRisk', 'answers', 'responses', 'notes', 'interpretation'];

async function protectSubmissions(req: Request, submissions: any[], isClientSelfQuery: boolean): Promise<any[]> {
  const viewer = await resolveClientViewer(req);
  if (viewer.kind === 'internal') return submissions;
  // The client panel still reads its own results by email without a token
  if (viewer.kind === 'anonymous' && isClientSelfQuery) return submissions;

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

export class AssessmentsController {
  /**
   * GET /api/assessments and GET /api/assessments/scores
   * Fetch assessment scores and submissions strictly from the AssessmentScore collection
   * and automatically link all submissions belonging to the consultant's assigned clients.
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const { consultantId, consultantName, clientEmail, clientId } = req.query;

      const scoreQuery: any = {};
      const assignQuery: any = {};

      // A client is matched by email OR id (older records carry only one of them)
      if (clientEmail || clientId) {
        const email = String(clientEmail || '').toLowerCase().trim();
        const id = String(clientId || '').trim();
        const clientOr = [
          ...(email ? [{ clientEmail: email }, { email }] : []),
          ...(id ? [{ clientId: id }, { userId: id }] : [])
        ];
        scoreQuery.$or = clientOr;
        assignQuery.$or = clientOr;
      }

      let assignedUsers: any[] = [];

      if (consultantId || consultantName) {
        const cleanName = String(consultantName || '').replace(/^dr\.?\s*/i, '').trim();
        const cid = String(consultantId || '').trim();

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
          cConditions.push({ consultantName: { $regex: new RegExp(cleanName, 'i') } });
          cConditions.push({ therapistName: { $regex: new RegExp(cleanName, 'i') } });
        }
        if (assignedEmails.size > 0) {
          cConditions.push({ clientEmail: { $in: Array.from(assignedEmails) } });
          cConditions.push({ email: { $in: Array.from(assignedEmails) } });
        }
        if (assignedIds.size > 0) {
          cConditions.push({ clientId: { $in: Array.from(assignedIds) } });
          cConditions.push({ userId: { $in: Array.from(assignedIds) } });
        }

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

      // If assigned clients have assessment scores stored in their User document, synthesize submission objects if missing
      if (assignedUsers.length > 0) {
        for (const u of assignedUsers) {
          if (Array.isArray(u.assessmentScores) && u.assessmentScores.length > 0) {
            u.assessmentScores.forEach((as: any, idx: number) => {
              const acronym = as.name || as.type || 'GAD-7';
              const totalScore = Number(as.score ?? 0);
              const maxScore = Number(as.maxScore || (acronym === 'PHQ-9' ? 27 : 21));
              const userEmail = String(u.email || '').toLowerCase();
              
              const alreadyPresent = submissions.some((s: any) => 
                (s.clientEmail && userEmail && s.clientEmail.toLowerCase() === userEmail) &&
                (s.assessmentAcronym === acronym || s.assessmentTitle?.includes(acronym))
              );

              if (!alreadyPresent) {
                const subObj = {
                  id: `SUB-USR-${u.id || u._id}-${idx}`,
                  assessmentId: `ASS-${acronym}`,
                  assessmentAcronym: acronym,
                  assessmentTitle: as.title || `${acronym} Clinical Assessment`,
                  clientId: String(u.id || u._id || ''),
                  clientName: u.name || 'Client User',
                  clientEmail: userEmail,
                  consultantId: String(u.assignedTherapistId || consultantId || ''),
                  consultantName: String(u.assignedTherapistName || consultantName || ''),
                  therapistName: String(u.assignedTherapistName || consultantName || ''),
                  totalScore,
                  score: totalScore,
                  maxScore,
                  severity: as.severity || (totalScore >= 15 ? 'Severe Elevation' : totalScore >= 10 ? 'Moderate' : 'Mild'),
                  severityLabel: as.severity || (totalScore >= 15 ? 'Severe Elevation' : totalScore >= 10 ? 'Moderate' : 'Mild'),
                  severityColor: totalScore >= 15 ? 'bg-rose-600 text-white' : totalScore >= 10 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white',
                  flaggedRisk: totalScore >= 15,
                  answers: Array.isArray(as.answers) ? as.answers : [],
                  notes: `Clinical assessment submitted by ${u.name || 'Client'}.`,
                  completedAt: as.date || new Date().toISOString().split('T')[0]
                };
                submissions.push(subObj);
              }
            });
          }
        }
      }

      const visibleSubmissions = await protectSubmissions(req, submissions, Boolean(clientEmail || clientId));

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
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch assessment scores' });
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
      const title = body.assessmentTitle || body.title || 'Clinical Assessment';
      const clientName = body.clientName || 'Client';
      const clientEmail = (body.clientEmail || '').toLowerCase().trim();
      const bodyClientId = String(body.clientId || body.userId || '').trim();

      // The therapist always comes from the client's own assignment; a client-sent consultant id is
      // used only when no assignment exists and it names a real Consultant
      const userOr: any[] = [
        ...(clientEmail ? [{ email: clientEmail }] : []),
        ...(bodyClientId ? idQuery(bodyClientId).$or : [])
      ];
      const u: any = userOr.length
        ? await db.collection('User').findOne({ $or: userOr }) || await db.collection('users').findOne({ $or: userOr })
        : null;
      const clientId = u ? String(u.id || u._id) : bodyClientId;

      const findConsultant = async (ref: string) =>
        ref ? await db.collection('Consultant').findOne(idQuery(ref)).catch(() => null) : null;
      const consultant: any =
        await findConsultant(String(u?.assignedTherapistId || '').trim()) ||
        await findConsultant(String(body.consultantId || body.therapistId || '').trim());
      const consultantId = consultant ? String(consultant.id || consultant._id) : '';
      const consultantName = consultant?.name || '';

      let severityLabel = body.severityLabel || body.severity || 'Mild';
      let severityColor = body.severityColor || 'bg-emerald-500 text-white';
      let flaggedRisk = Boolean(body.flaggedRisk || (totalScore >= 15));

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

      const newScoreDoc = {
        id: body.id || `ASC-${Date.now().toString().slice(-6)}`,
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
        ...[...new Set([clientId, bodyClientId].filter(Boolean))].map((id) => ({ clientId: id }))
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
      res.status(500).json({ success: false, error: error?.message || 'Failed to save assessment score' });
    }
  }

  /**
   * POST /api/assessments/assign
   */
  static async assign(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const body = req.body || {};

      // Store the client's real User id/email (panels may send only one of them)
      const rawClientEmail = String(body.clientEmail || '').toLowerCase().trim();
      const rawClientId = String(body.clientId || '').trim();
      const clientOr: any[] = [...(rawClientEmail ? [{ email: rawClientEmail }] : []), ...(rawClientId ? idQuery(rawClientId).$or : [])];
      const client: any = clientOr.length ? await db.collection('User').findOne({ $or: clientOr }).catch(() => null) : null;

      const newAssignment = {
        id: `ASN-${Date.now().toString().slice(-6)}`,
        assessmentId: body.assessmentId || 'ASS-01',
        assessmentAcronym: body.assessmentAcronym || 'GAD-7',
        assessmentTitle: body.assessmentTitle || 'Clinical Screener',
        clientId: client ? String(client.id || client._id) : rawClientId,
        clientName: client?.name || body.clientName || 'Client',
        clientEmail: String(client?.email || rawClientEmail).toLowerCase(),
        consultantId: body.consultantId || '',
        consultantName: body.consultantName || 'Therapist',
        therapistName: body.consultantName || 'Therapist',
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
          message: `Your consultant ${newAssignment.consultantName} assigned you "${newAssignment.assessmentTitle}". Tap to begin your clinical check-in.`,
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
      res.status(500).json({ success: false, error: error?.message || 'Failed to assign assessment' });
    }
  }
}
