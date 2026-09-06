import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';

export class AssessmentsController {
  /**
   * GET /api/assessments and GET /api/assessments/scores
   * Fetch assessment scores and submissions strictly from the AssessmentScore collection
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

      if (consultantId || consultantName) {
        const cConditions: any[] = [];
        if (consultantId) {
          cConditions.push({ consultantId: String(consultantId) });
        }
        if (consultantName) {
          cConditions.push({ consultantName: { $regex: new RegExp(String(consultantName), 'i') } });
          cConditions.push({ therapistName: { $regex: new RegExp(String(consultantName), 'i') } });
        }

        if (scoreQuery.$or) {
          scoreQuery.$and = [{ $or: scoreQuery.$or }, { $or: cConditions }];
          delete scoreQuery.$or;
        } else {
          scoreQuery.$or = cConditions;
        }

        assignQuery.$or = cConditions;
      }

      // Fetch ONLY real submissions from AssessmentScore collection
      const submissions = await db.collection('AssessmentScore')
        .find(scoreQuery)
        .sort({ createdAt: -1, completedAt: -1 })
        .toArray();

      // Fetch ONLY real assignments from AssessmentAssignment collection
      const assignments = await db.collection('AssessmentAssignment')
        .find(assignQuery)
        .sort({ assignedDate: -1, createdAt: -1 })
        .toArray();

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
      const clientEmail = (body.clientEmail || '').toLowerCase();
      const consultantName = body.consultantName || body.therapistName || '';

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
        consultantId: body.consultantId || body.therapistId || '',
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

      // In-app notification for the therapist
      try {
        await db.collection('Notification').insertOne({
          id: `NOTIF-${Date.now().toString().slice(-6)}-ASC`,
          recipientId: newScoreDoc.consultantId,
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
        clientEmail: (body.clientEmail || '').toLowerCase(),
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

      res.status(201).json({
        success: true,
        assignment: newAssignment,
        message: 'Assessment assigned successfully.'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to assign assessment' });
    }
  }
}
