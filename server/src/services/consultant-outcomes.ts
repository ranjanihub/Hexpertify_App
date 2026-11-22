import { getDatabase } from '../db/mongodb';
import { bookingStatusOf } from './booking-status';
import { idQuery } from './live-content';

/**
 * A therapist's outcome scores, calculated from real records (each is null when there is no data yet):
 *  - attendanceRate:       completed sessions ÷ (completed + no-show sessions)
 *  - homeworkAdherenceRate: completed activity assignments ÷ all assigned activities
 *  - goalAchievementRate:  achieved client goals ÷ all client goals
 *  - improvementScore:     average drop in assessment score (e.g. PHQ-9, GAD-7: lower is better) from each
 *                          client's first to latest result of the same assessment, as a % of the first score
 */
export interface ConsultantOutcomes {
  improvementScore: number | null;
  goalAchievementRate: number | null;
  homeworkAdherenceRate: number | null;
  attendanceRate: number | null;
  basis: {
    sessionsCompleted: number;
    sessionsMissed: number;
    activitiesAssigned: number;
    activitiesCompleted: number;
    goals: number;
    goalsAchieved: number;
    assessmentPairs: number;
  };
}

const percent = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null);

/** Documents from both the current and the legacy collection, without duplicates */
async function fromBoth(primary: string, legacy: string, query: any): Promise<any[]> {
  const db = getDatabase();
  const [a, b] = await Promise.all([
    db.collection(primary).find(query).toArray().catch(() => []),
    db.collection(legacy).find(query).toArray().catch(() => []),
  ]);
  const seen = new Set<string>();
  return [...a, ...b].filter((doc: any) => {
    const key = String(doc.id || doc._id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const timeOf = (doc: any): number => {
  const t = new Date(doc.completedAt || doc.createdAt || 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

export async function consultantOutcomes(consultantId: string): Promise<ConsultantOutcomes | null> {
  const db = getDatabase();
  const consultant: any = await db.collection('Consultant').findOne(idQuery(consultantId)).catch(() => null);
  if (!consultant) return null;
  const ids = [...new Set([consultantId, consultant.id, consultant._id].filter(Boolean).map(String))];
  const byConsultant = { consultantId: { $in: ids } };

  const [bookings, assignments, goals, scores] = await Promise.all([
    fromBoth('Booking', 'bookings', byConsultant),
    fromBoth('ActivityAssignment', 'activity_assignments', byConsultant),
    fromBoth('Goal', 'goals', { $or: [byConsultant, { therapistId: { $in: ids } }] }),
    fromBoth('AssessmentScore', 'assessment_scores', byConsultant),
  ]);

  // Attendance
  const statuses = bookings.map(bookingStatusOf);
  const sessionsCompleted = statuses.filter((s) => s === 'COMPLETED').length;
  const sessionsMissed = statuses.filter((s) => s === 'NO_SHOW_CLIENT' || s === 'NO_SHOW_CONSULTANT').length;

  // Homework (activity assignments)
  const activitiesCompleted = assignments.filter((a: any) => String(a.status || '').toLowerCase() === 'completed' || Boolean(a.completedAt)).length;

  // Goals
  const goalsAchieved = goals.filter((g: any) => {
    const status = String(g.status || '').toUpperCase();
    return status === 'COMPLETED' || status === 'ACHIEVED' || status === 'DONE' || Number(g.progress) >= 100;
  }).length;

  // Improvement: first vs latest score of the same assessment for the same client
  const series = new Map<string, any[]>();
  for (const s of scores) {
    const client = String(s.clientId || s.clientEmail || '').toLowerCase();
    const assessment = String(s.assessmentId || s.assessmentAcronym || s.assessmentTitle || '').toLowerCase();
    if (!client || !assessment) continue;
    const key = `${client}::${assessment}`;
    series.set(key, [...(series.get(key) || []), s]);
  }
  const changes: number[] = [];
  for (const list of series.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => timeOf(a) - timeOf(b));
    const first = Number(list[0].totalScore ?? list[0].score);
    const latest = Number(list[list.length - 1].totalScore ?? list[list.length - 1].score);
    if (Number.isFinite(first) && Number.isFinite(latest) && first > 0) changes.push((first - latest) / first);
  }
  const improvementScore = changes.length
    ? Math.max(0, Math.min(100, Math.round((changes.reduce((a, b) => a + b, 0) / changes.length) * 100)))
    : null;

  return {
    improvementScore,
    goalAchievementRate: percent(goalsAchieved, goals.length),
    homeworkAdherenceRate: percent(activitiesCompleted, assignments.length),
    attendanceRate: percent(sessionsCompleted, sessionsCompleted + sessionsMissed),
    basis: {
      sessionsCompleted,
      sessionsMissed,
      activitiesAssigned: assignments.length,
      activitiesCompleted,
      goals: goals.length,
      goalsAchieved,
      assessmentPairs: changes.length,
    },
  };
}
