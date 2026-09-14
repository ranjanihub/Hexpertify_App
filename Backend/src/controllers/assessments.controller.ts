import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';

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

      if (clientEmail) {
        scoreQuery.$or = [
          { clientEmail: String(clientEmail).toLowerCase() },
          { email: String(clientEmail).toLowerCase() }
        ];
        assignQuery.clientEmail = String(clientEmail).toLowerCase();
      }

      if (clientId) {
        scoreQuery.clientId = String(clientId);
        assignQuery.clientId = String(clientId);
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

        scoreQuery.$or = cConditions;
        assignQuery.$or = cConditions;
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
                  consultantId: String(consultantId || u.assignedTherapistId || 'doc-1'),
                  consultantName: String(consultantName || u.assignedTherapistName || 'Dr. Jayakumar'),
                  therapistName: String(consultantName || u.assignedTherapistName || 'Dr. Jayakumar'),
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

      res.json({
        success: true,
        count: submissions.length,
        submissionsCount: submissions.length,
        assignmentsCount: assignments.length,
        submissions,
        scores: submissions,
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
      let consultantId = String(body.consultantId || body.therapistId || '').trim();
      let consultantName = String(body.consultantName || body.therapistName || '').trim();

      // Auto-heal missing assigned consultant from User or Booking
      if (!consultantName || !consultantId) {
        const u = await db.collection('User').findOne({
          $or: [
            ...(clientEmail ? [{ email: clientEmail }] : []),
            ...(body.clientId ? [{ id: body.clientId }, { _id: body.clientId }] : [])
          ]
        }) || await db.collection('users').findOne({
          $or: [
            ...(clientEmail ? [{ email: clientEmail }] : []),
            ...(body.clientId ? [{ id: body.clientId }, { _id: body.clientId }] : [])
          ]
        });

        if (u) {
          consultantId = consultantId || u.assignedTherapistId || 'doc-1';
          consultantName = consultantName || u.assignedTherapistName || 'Dr. Jayakumar';
        } else {
          consultantId = consultantId || 'doc-1';
          consultantName = consultantName || 'Dr. Jayakumar';
        }
      }

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
        clientId: body.clientId || body.userId || '',
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

      // Sync into client's User document assessmentScores array
      if (clientEmail || body.clientId) {
        const userFilter: any = {
          $or: [
            ...(clientEmail ? [{ email: clientEmail }] : []),
            ...(body.clientId ? [{ id: body.clientId }, { _id: body.clientId }] : [])
          ]
        };
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

      // In-app notification for the therapist
      try {
        await db.collection('Notification').insertOne({
          id: `NOTIF-${Date.now().toString().slice(-6)}-ASC`,
          recipientId: consultantId,
          recipientRole: 'CONSULTANT',
          type: 'ASSESSMENT_COMPLETED',
          title: `New Assessment Completed: ${clientName} 📋`,
          message: `${clientName} completed the ${type} assessment. Score: ${totalScore}/${maxScore} (${severityLabel}).`,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch {}

      res.status(201).json({
        success: true,
        score: { ...newScoreDoc, _id: result.insertedId },
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

      const newAssignment = {
        id: `ASN-${Date.now().toString().slice(-6)}`,
        assessmentId: body.assessmentId || 'ASS-01',
        assessmentAcronym: body.assessmentAcronym || 'GAD-7',
        assessmentTitle: body.assessmentTitle || 'Clinical Screener',
        clientId: body.clientId || '',
        clientName: body.clientName || 'Client',
        clientEmail: (body.clientEmail || '').toLowerCase().trim(),
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

        await db.collection('Notification').insertOne(notifDoc);
        await db.collection('notifications').insertOne(notifDoc).catch(() => {});
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
