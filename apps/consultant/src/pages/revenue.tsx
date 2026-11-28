import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { IndianRupee, Download, ArrowUpRight, ArrowDownRight, Clock, Video, FileText, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getAuthUser } from "@/lib/auth";

const PERIOD_LABEL: Record<string, string> = { month: "This Month", quarter: "This Quarter", year: "This Year" };
const PERIOD_NOUN: Record<string, string> = { month: "month", quarter: "quarter", year: "year" };

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function Revenue() {
  const authUser = getAuthUser();
  const authEmail = (authUser?.email || '').toLowerCase().trim();

  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>({
    totalRevenue: 0,
    pendingPayments: 0,
    completedConsultations: 0,
    therapyHours: 0,
    revenueChange: 0,
    period: "month"
  });
  const [analytics, setAnalytics] = useState<any[]>([]);
  // Therapists are paid in bulk: one invoice per payout released by the admin, not one per session
  const [payoutInvoices, setPayoutInvoices] = useState<any[]>([]);
  const [awaitingPayout, setAwaitingPayout] = useState<{ sessions: number; amount: number }>({ sessions: 0, amount: 0 });
  // Why the numbers may be empty: no matching profile, or the earnings request failed (never shown as silent ₹0)
  const [loadProblem, setLoadProblem] = useState<"unlinked" | "failed" | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadRevenue() {
      try {
        setLoading(true);
        setLoadProblem(null);
        // Revenue is keyed by the signed-in therapist's Consultant id; older sessions may lack it, so the
        // profile is then looked up by the sign-in email
        let consultantId = String(authUser?.id || '').trim();
        if (!consultantId && authEmail) {
          const consultantsRes = await fetch('/api/consultants');
          const cData = consultantsRes.ok ? await consultantsRes.json() : null;
          const consultants: any[] = Array.isArray(cData?.consultants) ? cData.consultants : Array.isArray(cData) ? cData : [];
          const mine = consultants.find((c) => String(c.email || '').toLowerCase().trim() === authEmail);
          if (mine) consultantId = String(mine._id || mine.id);
        }
        if (!consultantId) {
          if (isMounted) {
            setAnalytics([]);
            setPayoutInvoices([]);
            setAwaitingPayout({ sessions: 0, amount: 0 });
            setLoadProblem("unlinked");
          }
          return;
        }
        // The revenue API answers ₹0 for an id it doesn't know, so first confirm the profile exists
        const profileRes = await fetch(`/api/consultants/${encodeURIComponent(consultantId)}`).catch(() => null);
        if (!isMounted) return;
        if (profileRes && profileRes.status === 404) {
          setAnalytics([]);
          setPayoutInvoices([]);
          setAwaitingPayout({ sessions: 0, amount: 0 });
          setLoadProblem("unlinked");
          return;
        }
        const res = await fetch(`/api/revenue?consultantId=${encodeURIComponent(consultantId)}&period=${period}`);
        if (!isMounted) return;
        const data = res.ok ? await res.json().catch(() => null) : null;
        if (!data?.success) {
          setLoadProblem(res.status === 404 ? "unlinked" : "failed");
          return;
        }
        setSummary(data.summary || {});
        // The Backend sends monthlyAnalytics: [{ month, revenue, consultations, hours }]
        const monthly = Array.isArray(data.monthlyAnalytics) ? data.monthlyAnalytics : [];
        setAnalytics(monthly.map((m: any) => ({ ...m, label: m.label || m.month })));
        setPayoutInvoices(Array.isArray(data.payoutInvoices) ? data.payoutInvoices : []);
        setAwaitingPayout({
          sessions: Number(data.awaitingPayout?.sessions) || 0,
          amount: Number(data.awaitingPayout?.amount) || 0
        });
      } catch (err) {
        console.error('Failed to load revenue data:', err);
        if (isMounted) setLoadProblem("failed");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRevenue();
    return () => { isMounted = false; };
  }, [authEmail, authUser?.id, period]);

  // Downloads the period summary and the payout invoices as a CSV file
  const handleExport = () => {
    const rows: unknown[][] = [
      ["Earnings report", authUser?.name || "Therapist"],
      ["Period", PERIOD_LABEL[period] || period],
      ["Generated", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })],
      [],
      ["Total Earnings (INR)", summary?.totalRevenue || 0],
      ["Pending Payments (INR)", awaitingPayout.amount],
      ["Completed Sessions", summary?.completedConsultations || 0],
      ["Therapy Hours", summary?.therapyHours || 0],
      ["Sessions Awaiting Payout", awaitingPayout.sessions],
      ["Amount Awaiting Payout (INR)", awaitingPayout.amount.toFixed(2)],
      [],
      ["Invoice No.", "Payout Date", "Sessions", "Session Fees (INR)", "Platform Fee (INR)", "Paid to You (INR)", "Payment Method", "Transaction Ref"],
      ...payoutInvoices.map((inv: any) => [
        inv.invoiceNumber, inv.payoutDate || "", inv.sessionsCount,
        (inv.grossAmount || 0).toFixed(2), (inv.platformFee || 0).toFixed(2), (inv.netPayout || 0).toFixed(2),
        inv.paymentMethod || "", inv.transactionRef || ""
      ])
    ];
    const csv = "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `hexpertify-earnings-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Earnings"
        description="Track consultation income, manage invoices, payout history, and financial growth analytics."
        badge="FINANCIAL OVERVIEW"
        icon={<IndianRupee className="w-4 h-4 text-purple-200" />}
      >
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] bg-white text-slate-900 border-none shadow-md h-9 text-xs font-semibold">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="disabled:opacity-60 inline-flex items-center justify-center gap-2 bg-white text-[#450bc8] hover:bg-white/90 font-extrabold text-xs px-4 py-2.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </PageHeader>

      {!loading && loadProblem && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {loadProblem === "unlinked"
            ? "We couldn't match your earnings to your profile — contact support. The figures below aren't your real earnings."
            : "We couldn't load your earnings right now. Please refresh the page; if it keeps happening, contact support."}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Card className="shadow-sm border-border bg-gradient-to-br from-primary/5 to-white border-primary/10">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary"><IndianRupee className="w-5 h-5" /></div>
              {!loading && typeof summary?.revenueChange === 'number' && (
                summary.revenueChange >= 0 ? (
                  <Badge variant="secondary" title={`vs previous ${PERIOD_NOUN[period] || 'period'}`} className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> {summary.revenueChange}%
                  </Badge>
                ) : (
                  <Badge variant="secondary" title={`vs previous ${PERIOD_NOUN[period] || 'period'}`} className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200">
                    <ArrowDownRight className="w-3 h-3 mr-1" /> {Math.abs(summary.revenueChange)}%
                  </Badge>
                )
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Earnings</p>
              {loading ? <Skeleton className="h-8 w-32" /> : <h4 className="text-2xl sm:text-3xl font-bold break-words">₹{(summary?.totalRevenue || 0).toLocaleString()}</h4>}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><FileText className="w-5 h-5" /></div>
            </div>
            <div>
              {/* What Hexpertify still owes this therapist: paid sessions not yet in a payout (all time, not per period) */}
              <p className="text-sm font-medium text-muted-foreground mb-1">Pending Payments</p>
              {loading ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <h4 className="text-2xl sm:text-3xl font-bold break-words">₹{awaitingPayout.amount.toLocaleString()}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {awaitingPayout.sessions > 0
                      ? `${awaitingPayout.sessions} session${awaitingPayout.sessions === 1 ? '' : 's'} awaiting payout`
                      : 'Nothing awaiting payout'}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Video className="w-5 h-5" /></div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Completed Sessions</p>
              {loading ? <Skeleton className="h-8 w-16" /> : <h4 className="text-2xl sm:text-3xl font-bold break-words">{summary?.completedConsultations || 0}</h4>}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Clock className="w-5 h-5" /></div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Therapy Hours</p>
              {loading ? <Skeleton className="h-8 w-16" /> : <h4 className="text-2xl sm:text-3xl font-bold break-words">{summary?.therapyHours || 0}h</h4>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-lg">Earnings Growth</CardTitle>
          <CardDescription>Earnings over time for {authUser?.name || 'Therapist'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : analytics.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                No earnings trends recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                  {/* Compact ₹ labels (₹14k) with a fixed width so they are never clipped */}
                  <YAxis
                    width={56}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(val: number) => (val >= 1000 ? `₹${Math.round((val / 1000) * 10) / 10}k` : `₹${val}`)}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(94, 43, 226, 0.06)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Earnings']}
                  />
                  <Bar dataKey="revenue" fill="#450bc8" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-lg">Payout Invoices</CardTitle>
          <CardDescription>
            Hexpertify pays your earnings in bulk. Each payout comes with one invoice covering all the sessions it includes.
          </CardDescription>
          {!loading && awaitingPayout.sessions > 0 && (
            <div className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              <Clock className="w-3.5 h-3.5" />
              {awaitingPayout.sessions} completed session{awaitingPayout.sessions === 1 ? '' : 's'} awaiting the next payout
              <span className="font-bold font-mono">(₹{awaitingPayout.amount.toLocaleString()})</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 sm:p-6 md:p-0">
          {loading ? (
            <div className="p-6">
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : payoutInvoices.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ReceiptText className="w-12 h-12 text-slate-300 mx-auto stroke-[1.5]" />
              <h4 className="font-extrabold text-sm text-slate-800">No Payouts Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When the admin releases a payout to {authUser?.name || 'you'}, its invoice will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View Card List */}
              <div className="space-y-3 md:hidden p-4">
                {payoutInvoices.map((inv: any) => (
                  <div key={inv.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900">{inv.invoiceNumber}</span>
                      <Badge variant="outline" className="uppercase text-[10px] tracking-wider font-bold bg-green-50 text-green-700 border-green-200">
                        Paid
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                      <div>
                        <span className="font-bold text-slate-800 block">
                          {inv.sessionsCount} session{inv.sessionsCount === 1 ? '' : 's'}
                        </span>
                        <span className="text-[11px] text-slate-500">{inv.payoutDate ? formatDate(inv.payoutDate) : '—'}</span>
                      </div>
                      <span className="font-extrabold text-sm text-slate-900 font-mono">₹{(inv.netPayout || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-secondary/50">
                    <TableRow>
                      <TableHead className="pl-6">Invoice No.</TableHead>
                      <TableHead>Payout Date</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead className="text-right">Session Fees</TableHead>
                      <TableHead className="text-right">Platform Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Paid to You</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutInvoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="pl-6 font-medium font-mono text-xs">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.payoutDate ? formatDate(inv.payoutDate) : '—'}</TableCell>
                        <TableCell className="font-bold text-slate-900">{inv.sessionsCount}</TableCell>
                        <TableCell className="text-right font-mono text-slate-600">₹{(inv.grossAmount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-slate-600">₹{(inv.platformFee || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase text-[10px] tracking-wider font-bold bg-green-50 text-green-700 border-green-200">
                            Paid
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6 font-bold font-mono">₹{(inv.netPayout || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
