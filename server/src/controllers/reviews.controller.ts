import { Request, Response } from 'express';
import { getDatabase } from '../db/mongodb';
import { cacheService } from '../services/cache.service';
import { idQuery, isClientReview } from '../services/live-content';

export class ReviewsController {
  /**
   * GET /api/reviews
   * Fetch real reviews and calculated summary for the consultant from MongoDB Atlas
   */
  static async getReviews(req: Request, res: Response): Promise<void> {
    try {
      const { consultantId, consultantName } = req.query;
      const myId = String(consultantId || '').toLowerCase().trim();
      const myName = String(consultantName || '').toLowerCase().trim();
      const cacheKey = `reviews:${myId}:${myName}`;

      const responseData = await cacheService.wrap(cacheKey, ['reviews', 'consultants'], 30, async () => {
        const db = getDatabase();
        const rawId = String(consultantId || '').trim();
        const rawName = String(consultantName || '').trim();

        // Resolve the consultant by id/identifier, or by exact name (with or without "Dr.")
        let matchedConsultant: any = null;
        if (rawId) {
          matchedConsultant = await db.collection('Consultant').findOne({ $or: [...idQuery(rawId).$or, { identifier: rawId }] });
        }
        if (!matchedConsultant && rawName) {
          const clean = rawName.replace(/^dr\.?\s*/i, '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (clean) matchedConsultant = await db.collection('Consultant').findOne({ name: { $regex: `^(dr\\.?\\s*)?${clean}$`, $options: 'i' } });
        }

        // Reviews belong to a consultant by consultantId only; no consultant asked for = all reviews (admin list)
        let reviewQuery: any = {};
        if (rawId || rawName) {
          const ids = [...new Set([rawId, matchedConsultant && String(matchedConsultant._id), matchedConsultant?.id].filter(Boolean).map(String))];
          reviewQuery = ids.length ? { consultantId: { $in: ids } } : { _id: { $in: [] } };
        }

        const reviewsList = await db.collection('Review').find(reviewQuery).sort({ createdAt: -1 }).toArray();

        let totalRatingSum = 0;
        const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let recommendCount = 0;

        const formattedReviews = reviewsList.map((r: any, idx: number) => {
          const star = Math.min(5, Math.max(1, Number(r.rating || 5)));
          totalRatingSum += star;
          ratingCounts[star] = (ratingCounts[star] || 0) + 1;
          if (star >= 4) recommendCount += 1;

          const dateStr = r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '';

          return {
            id: r._id || r.id || idx + 1,
            consultantId: r.consultantId,
            clientName: r.clientName || 'Client',
            clientTitle: r.clientTitle || '',
            rating: star,
            reviewText: r.comment || r.reviewText || r.text || '',
            date: dateStr,
            isVerified: isClientReview(r)
          };
        });

        const totalReviews = formattedReviews.length;
        const averageRating = totalReviews > 0 ? Math.round((totalRatingSum / totalReviews) * 10) / 10 : 0;
        const recommendRate = totalReviews > 0 ? Math.round((recommendCount / totalReviews) * 100) : 0;

        return {
          success: true,
          summary: {
            averageRating,
            totalReviews,
            recommendRate,
            ratingBreakdown: ratingCounts
          },
          reviews: formattedReviews
        };
      });

      res.json(responseData);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Failed to fetch reviews' });
    }
  }
}
