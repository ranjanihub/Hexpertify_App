import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Star, MessageSquare, CheckCircle2 } from "lucide-react";
import { formatDate, getInitials } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/page-header";
import { getAuthUser } from "@/lib/auth";

export default function Reviews() {
  const authUser = getAuthUser();
  // Reviews are looked up by the signed-in therapist's own id only, never by a name or a stand-in person
  const consultantId = String(authUser?.id || '').trim();
  const [loadProblem, setLoadProblem] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  // No placeholder rating: until real reviews arrive there is nothing to show
  const [summary, setSummary] = useState<any>({ averageRating: 0, totalReviews: 0, ratingBreakdown: {} });
  const [reviewsList, setReviewsList] = useState<any[]>([]);

  const totalReviews = Number(summary?.totalReviews ?? reviewsList.length) || 0;
  const averageRating = totalReviews > 0 ? Number(summary?.averageRating) || 0 : 0;

  // The Backend sends ratingBreakdown as { "5": n, "4": n, ... }
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: Number(summary?.ratingBreakdown?.[stars] ?? summary?.ratingBreakdown?.[String(stars)] ?? 0) || 0
  }));

  // Average rating per month, from the reviews themselves (last six months that have reviews)
  const ratingTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const byMonth = new Map<string, { sum: number; count: number }>();
    reviewsList.forEach((r: any) => {
      const key = String(r?.date || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(key)) return;
      const entry = byMonth.get(key) || { sum: 0, count: 0 };
      entry.sum += Number(r.rating) || 0;
      entry.count += 1;
      byMonth.set(key, entry);
    });
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, { sum, count }]) => ({
        month: months[Number(key.slice(5, 7)) - 1],
        rating: Math.round((sum / count) * 10) / 10,
        reviews: count
      }));
  }, [reviewsList]);

  useEffect(() => {
    let isMounted = true;
    async function loadReviews() {
      // Without an id the API would return every therapist's reviews, so nothing is requested
      if (!consultantId) {
        setLoadProblem("We couldn't find your therapist profile. Please sign out and sign in again.");
        setLoading(false);
        return;
      }
      try {
        setLoadProblem(null);
        const res = await fetch(`/api/reviews?consultantId=${encodeURIComponent(consultantId)}`);
        if (!isMounted) return;
        const data = res.ok ? await res.json().catch(() => null) : null;
        if (data?.success) {
          setSummary(data.summary || {});
          setReviewsList(Array.isArray(data.reviews) ? data.reviews : []);
        } else {
          setLoadProblem("We couldn't load your reviews right now. Please try again later.");
        }
      } catch (err) {
        console.error('Failed to load reviews:', err);
        if (isMounted) setLoadProblem("We couldn't load your reviews right now. Please try again later.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadReviews();
    return () => { isMounted = false; };
  }, [consultantId]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Client Reviews & Ratings"
        description="Monitor client feedback, satisfaction ratings, and overall reputation."
        badge="CLIENT FEEDBACK"
        icon={<Star className="w-4 h-4 text-purple-200" />}
      />

      {!loading && loadProblem && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {loadProblem}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="shadow-sm border-border bg-gradient-to-b from-amber-50/50 to-white">
          <CardContent className="p-5 sm:p-8 flex flex-col items-center justify-center text-center">
            {loading ? (
              <Skeleton className="h-32 w-32 rounded-full" />
            ) : (
              <>
                <div className={`text-5xl font-black mb-2 ${totalReviews > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                  {totalReviews > 0 ? averageRating.toFixed(1) : '—'}
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`w-6 h-6 ${star <= Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`} />
                  ))}
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {totalReviews > 0 ? `Based on ${totalReviews} review${totalReviews === 1 ? '' : 's'}` : 'No ratings yet'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rating Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {loading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              ratingDistribution.map((item) => {
                const percentage = totalReviews > 0 ? Math.round((item.count / totalReviews) * 100) : 0;
                return (
                  <div key={item.stars} className="flex items-center gap-3 text-xs font-semibold">
                    <span className="w-12 text-slate-600">{item.stars} Stars</span>
                    <Progress value={percentage} className="h-2 flex-1 bg-slate-100" />
                    <span className="w-8 text-right text-slate-400 font-mono">{item.count}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Rating Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[120px] w-full">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : ratingTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-medium text-slate-400">
                  No ratings yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, _name: string, item: any) => [`${value} ★ (${item?.payload?.reviews || 0} review${item?.payload?.reviews === 1 ? '' : 's'})`, 'Avg rating']}
                    />
                    <Bar dataKey="rating" name="Avg Rating" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-lg">Recent Verified Client Reviews</CardTitle>
          <CardDescription>Real testimonials and consultation feedback from clients</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : reviewsList.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No reviews yet.</div>
            ) : (
              reviewsList.map((review: any, idx: number) => {
                const name = review.clientName || 'Verified Client';
                const initials = getInitials(name);

                return (
                  <div key={review.id || idx} className="p-6 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-200">
                          <AvatarFallback className="bg-amber-100 text-amber-900 font-semibold text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            {name}
                            {review.clientTitle && (
                              <span className="text-[11px] font-normal text-slate-400">({review.clientTitle})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{formatDate(review.date)}</span>
                    </div>

                    <p className="text-slate-700 leading-relaxed text-sm pl-13">{review.reviewText}</p>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
