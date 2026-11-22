import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Undo2,
  XCircle,
  CreditCard,
  X,
  AlertTriangle,
  Eye,
  Copy,
  Check
} from 'lucide-react';
import { fetchPayments, refundPayment, type PaymentsListResponse } from '../lib/paymentsApi';
import type { GatewayPaymentStatus, Payment } from '../types';

const STATUS_LABELS: Record<GatewayPaymentStatus, string> = {
  CREATED: 'Awaiting Payment',
  PAID: 'Paid',
  FAILED: 'Failed',
  EXPIRED: 'Abandoned',
  REFUND_PENDING: 'Refund Pending',
  PARTIALLY_REFUNDED: 'Partially Refunded',
  REFUNDED: 'Refunded'
};

const STATUS_STYLES: Record<GatewayPaymentStatus, string> = {
  CREATED: 'bg-slate-100 text-slate-700',
  PAID: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-rose-100 text-rose-800',
  EXPIRED: 'bg-slate-100 text-slate-500',
  REFUND_PENDING: 'bg-amber-100 text-amber-800',
  PARTIALLY_REFUNDED: 'bg-amber-100 text-amber-800',
  REFUNDED: 'bg-rose-100 text-rose-800'
};

const REFUNDABLE: GatewayPaymentStatus[] = ['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING'];

const formatINR = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** Amount still refundable (successful and in-flight refunds are already committed) */
const refundableAmount = (p: Payment) =>
  Math.max(0, p.amount - (p.refunds || []).filter((r) => r.status !== 'FAILED').reduce((sum, r) => sum + r.amount, 0));

/** Bookings an admin marked paid without a gateway payment (listed by the Backend as provider 'manual') */
const isManualPayment = (p: Payment) => (p as { manual?: boolean }).manual === true || String(p.provider) === 'manual';

/** The transaction's running number (TXN-00001); manual entries have none, so they show their booking number */
const transactionNo = (p: Payment) => p.paymentNumber || p.bookingNumber || '—';

/** Only gateway payments with money left to return can be refunded */
const canRefund = (p: Payment) => !isManualPayment(p) && REFUNDABLE.includes(p.status) && refundableAmount(p) > 0;

const PROVIDER_LABELS: Record<string, string> = { razorpay: 'Razorpay', cashfree: 'Cashfree', manual: 'Recorded manually' };
const REFUND_STYLES: Record<string, string> = {
  SUCCESS: 'bg-emerald-100 text-emerald-800',
  PENDING: 'bg-amber-100 text-amber-800',
  FAILED: 'bg-rose-100 text-rose-800'
};

/** One label/value line in the details dialog; IDs get a copy button */
const DetailRow: React.FC<{ label: string; value?: React.ReactNode; copy?: string; mono?: boolean }> = ({ label, value, copy, mono }) => {
  const [copied, setCopied] = useState(false);
  const empty = value === undefined || value === null || value === '';
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 pt-0.5">{label}</span>
      <span className={`text-xs text-right text-slate-800 font-semibold break-all ${mono ? 'font-mono text-[11px]' : ''}`}>
        {empty ? <span className="text-slate-300">—</span> : value}
        {copy && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(copy).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }).catch(() => {});
            }}
            className="ml-1.5 inline-flex align-middle text-slate-400 hover:text-[#5e2be2] cursor-pointer"
            aria-label={`Copy ${label}`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </span>
    </div>
  );
};

export const TransactionsView: React.FC = () => {
  const [data, setData] = useState<PaymentsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [detailsTarget, setDetailsTarget] = useState<Payment | null>(null);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState<string | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPayments({ status: statusFilter, from: fromDate, to: toDate, q: debouncedSearch });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, fromDate, toDate, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const openRefund = (payment: Payment) => {
    setRefundTarget(payment);
    setRefundType('full');
    setRefundAmount('');
    setRefundReason('');
    setRefundError(null);
  };

  const maxRefund = refundTarget ? refundableAmount(refundTarget) : 0;

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget) return;

    const amount = refundType === 'partial' ? Number(refundAmount) : undefined;
    if (refundType === 'partial' && (!amount || amount <= 0 || amount > maxRefund)) {
      setRefundError(`Enter an amount between ₹1 and ${formatINR(maxRefund)}`);
      return;
    }
    if (refundReason.trim().length < 3) {
      setRefundError('Please give a reason for the refund');
      return;
    }

    setIsRefunding(true);
    setRefundError(null);
    try {
      await refundPayment(refundTarget.id, { amount, reason: refundReason.trim() });
      setToast(`Refund of ${formatINR(amount ?? maxRefund)} initiated for ${refundTarget.clientName || refundTarget.id}`);
      setRefundTarget(null);
      await load();
    } catch (err: any) {
      setRefundError(err?.message || 'Refund failed');
    } finally {
      setIsRefunding(false);
    }
  };

  const payments = data?.payments || [];
  const summary = data?.summary;

  const statCards = useMemo(
    () => [
      { label: 'Collected', value: formatINR(summary?.collected || 0), icon: Wallet, tone: 'bg-emerald-50 text-emerald-600' },
      { label: 'Refunded', value: formatINR(summary?.refunded || 0), icon: Undo2, tone: 'bg-rose-50 text-rose-600' },
      { label: 'Net Revenue', value: formatINR(summary?.net || 0), icon: ShieldCheck, tone: 'bg-purple-50 text-[#5e2be2]' },
      { label: 'Failed Payments', value: String(summary?.failedCount || 0), icon: XCircle, tone: 'bg-amber-50 text-amber-600' }
    ],
    [summary]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Customer payments collected through the payment gateway
            {data?.activeProvider && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-[#5e2be2] font-bold border border-purple-100 capitalize">
                <CreditCard className="w-3 h-3" /> {data.activeProvider}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:border-purple-300 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.tone}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-3">{card.label}</p>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">{card.value}</h3>
            </div>
          );
        })}
      </div>

      {/* Filters + table */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-4">
        {/* Search · status · date range; every field can shrink so nothing spills past the card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, therapist, booking or payment ID"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5e2be2]/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5e2be2]/20 lg:col-span-3"
          >
            <option value="">All statuses</option>
            {(Object.keys(STATUS_LABELS) as GatewayPaymentStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <div className="grid min-w-0 grid-cols-2 gap-2 lg:col-span-4">
            <label className="relative min-w-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-slate-400 pointer-events-none">From</span>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label="From date"
                className="w-full min-w-0 pl-12 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5e2be2]/20"
              />
            </label>
            <label className="relative min-w-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-slate-400 pointer-events-none">To</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                aria-label="To date"
                className="w-full min-w-0 pl-9 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#5e2be2]/20"
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-extrabold text-[10px] bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">No.</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-semibold">
                    No transactions found.
                  </td>
                </tr>
              )}
              {/* Basic details only; View opens everything about the transaction */}
              {payments.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setDetailsTarget(p)}
                  className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono font-bold text-[#5e2be2] whitespace-nowrap">{transactionNo(p)}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDateTime(p.paidAt || p.createdAt)}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{p.clientName || 'Client'}</td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono font-extrabold text-slate-900">{formatINR(p.amount)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${STATUS_STYLES[p.status] || 'bg-slate-100 text-slate-700'}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => setDetailsTarget(p)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#5e2be2]/10 text-[#5e2be2] border border-[#5e2be2]/15 font-bold hover:bg-[#5e2be2]/15 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      {/* Manual entries have no gateway payment to refund */}
                      {canRefund(p) && (
                        <button
                          onClick={() => openRefund(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 font-bold hover:bg-rose-100 cursor-pointer"
                        >
                          <Undo2 className="w-3.5 h-3.5" /> Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction details */}
      {detailsTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setDetailsTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Transaction details"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#5e2be2] to-[#804bee] p-5 text-white flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-purple-100">
                  Transaction {transactionNo(detailsTarget) !== '—' ? transactionNo(detailsTarget) : ''}
                </p>
                <p className="text-2xl font-extrabold font-mono mt-1">{formatINR(detailsTarget.amount)}</p>
                <p className="text-xs text-purple-100 mt-1">{formatDateTime(detailsTarget.paidAt || detailsTarget.createdAt)}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${STATUS_STYLES[detailsTarget.status] || 'bg-slate-100 text-slate-700'}`}>
                  {STATUS_LABELS[detailsTarget.status] || detailsTarget.status}
                </span>
                <button
                  type="button"
                  onClick={() => setDetailsTarget(null)}
                  className="p-1 text-purple-100 hover:text-white rounded-lg cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <section>
                <h3 className="text-xs font-extrabold text-slate-900 mb-1">Client</h3>
                <DetailRow label="Name" value={detailsTarget.clientName} />
                <DetailRow label="Email" value={detailsTarget.clientEmail} copy={detailsTarget.clientEmail || undefined} />
              </section>

              <section>
                <h3 className="text-xs font-extrabold text-slate-900 mb-1">Session</h3>
                <DetailRow label="Therapist" value={detailsTarget.consultantName} />
                <DetailRow label="Service" value={detailsTarget.serviceTitle} />
              </section>

              <section>
                <h3 className="text-xs font-extrabold text-slate-900 mb-1">Payment</h3>
                <DetailRow label="Amount" value={`${formatINR(detailsTarget.amount)} ${detailsTarget.currency || 'INR'}`} />
                {detailsTarget.refundedAmount > 0 && (
                  <DetailRow label="Refunded" value={<span className="text-rose-600">−{formatINR(detailsTarget.refundedAmount)}</span>} />
                )}
                <DetailRow label="Method" value={isManualPayment(detailsTarget) ? 'Manual' : detailsTarget.method ? <span className="capitalize">{detailsTarget.method}</span> : undefined} />
                <DetailRow label="Gateway" value={PROVIDER_LABELS[String(detailsTarget.provider)] || detailsTarget.provider} />
                <DetailRow label="Created" value={formatDateTime(detailsTarget.createdAt)} />
                <DetailRow label="Paid" value={detailsTarget.paidAt ? formatDateTime(detailsTarget.paidAt) : undefined} />
                {detailsTarget.failureReason && (
                  <DetailRow label="Failure" value={<span className="text-rose-600">{detailsTarget.failureReason}</span>} />
                )}
              </section>

              <section>
                <h3 className="text-xs font-extrabold text-slate-900 mb-1">References</h3>
                {!isManualPayment(detailsTarget) && (
                  <DetailRow label="Transaction No." value={detailsTarget.paymentNumber} copy={detailsTarget.paymentNumber} mono />
                )}
                <DetailRow label="Booking No." value={detailsTarget.bookingNumber} copy={detailsTarget.bookingNumber} mono />
              </section>

              {/* The gateway's own references, for looking the payment up in the Cashfree/Razorpay dashboard */}
              {!isManualPayment(detailsTarget) && (
                <section>
                  <h3 className="text-xs font-extrabold text-slate-900 mb-1">
                    {PROVIDER_LABELS[String(detailsTarget.provider)] || 'Gateway'} reference
                  </h3>
                  <DetailRow label="Payment ID" value={detailsTarget.providerPaymentId} copy={detailsTarget.providerPaymentId} mono />
                  <DetailRow label="Order ID" value={detailsTarget.providerOrderId} copy={detailsTarget.providerOrderId} mono />
                </section>
              )}

              {(detailsTarget.refunds || []).length > 0 && (
                <section>
                  <h3 className="text-xs font-extrabold text-slate-900 mb-2">Refunds</h3>
                  <div className="space-y-2">
                    {detailsTarget.refunds.map((r) => (
                      <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-extrabold text-slate-900">{formatINR(r.amount)}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${REFUND_STYLES[r.status] || 'bg-slate-100 text-slate-700'}`}>
                            {r.status === 'SUCCESS' ? 'Refunded' : r.status === 'PENDING' ? 'Pending' : 'Failed'}
                          </span>
                        </div>
                        {r.reason && <p className="text-slate-600">{r.reason}</p>}
                        <p className="text-[11px] text-slate-400">
                          {formatDateTime(r.createdAt)}
                          {r.requestedBy ? ` · by ${r.requestedBy}` : ''}
                        </p>
                        {r.providerRefundId && <p className="font-mono text-[10px] text-slate-400 break-all">{r.providerRefundId}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2">
              {canRefund(detailsTarget) && (
                <button
                  type="button"
                  onClick={() => {
                    const target = detailsTarget;
                    setDetailsTarget(null);
                    openRefund(target);
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-xs font-bold hover:bg-rose-100 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Refund
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailsTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund dialog */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <form onSubmit={submitRefund} className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Refund payment</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {refundTarget.clientName} · {refundTarget.consultantName} · paid {formatINR(refundTarget.amount)}
                </p>
              </div>
              <button type="button" onClick={() => setRefundTarget(null)} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer" aria-label="Close">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['full', 'partial'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRefundType(type)}
                  className={`py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    refundType === type ? 'bg-[#5e2be2] text-white border-[#5e2be2]' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {type === 'full' ? `Full (${formatINR(maxRefund)})` : 'Partial'}
                </button>
              ))}
            </div>

            {refundType === 'partial' && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700">Amount (₹)</label>
                <input
                  type="number"
                  min={1}
                  max={maxRefund}
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Up to ${maxRefund}`}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#5e2be2] focus:bg-white"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700">Reason</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={2}
                placeholder="e.g. Session cancelled by therapist"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#5e2be2] focus:bg-white resize-none"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              The refund goes back to the customer's original payment method. Banks usually take 5–7 working days to credit it.
            </p>

            {refundError && <p className="text-xs font-semibold text-rose-600">{refundError}</p>}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setRefundTarget(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRefunding}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {isRefunding ? 'Processing…' : 'Issue Refund'}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
};
