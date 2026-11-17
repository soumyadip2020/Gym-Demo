import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Check, DollarSign, FileText, Plus, Printer, RotateCcw, Search, ShieldCheck, Wallet, XCircle } from "lucide-react";
import {
  AdminBadge,
  AdminEmpty,
  AdminHeader,
  AdminKpiCard,
  AdminModal,
  AdminPanelCard,
  formatDateTime,
  formatINR,
} from "@/components/admin/AdminUI";
import { adminPaymentsFn, adminRecordPaymentFn, adminRefundPaymentFn } from "@/lib/admin-fns";

export const Route = createFileRoute("/_admin/admin/payments")({ component: AdminPaymentsPage });

function AdminPaymentsPage() {
  const fetchPayments = useServerFn(adminPaymentsFn);
  const recordPayment = useServerFn(adminRecordPaymentFn);
  const refundPayment = useServerFn(adminRefundPaymentFn);
  const qc = useQueryClient();

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<any | null>(null);
  const [refundTarget, setRefundTarget] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments", { status, search }],
    queryFn: () => fetchPayments({ data: { status, search } }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-finance"] });
  };

  const recordMut = useMutation({
    mutationFn: (payload: any) => recordPayment({ data: payload }),
    onSuccess: () => {
      toast.success("Payment recorded & ledger updated");
      setRecordOpen(false);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to record payment"),
  });

  const refundMut = useMutation({
    mutationFn: (payload: { paymentId: number; reason: string }) => refundPayment({ data: payload }),
    onSuccess: (res) => {
      toast.success(res.gatewayProcessed ? `Razorpay refund initiated (${res.refundId})` : `Refund recorded (${res.refundId})`);
      setRefundTarget(null);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Refund failed"),
  });

  if (isLoading || !data) {
    return <div className="py-20 text-center text-xs uppercase tracking-widest text-white/40">Loading Payment Ledger...</div>;
  }

  const { summary, payments, users, razorpayConfigured } = data;

  return (
    <div className="space-y-6 pb-12">
      <AdminHeader
        eyebrow="Razorpay & Offline Ledger"
        title="Payment"
        accent="Management"
        subtitle="Cryptographically verified Razorpay collections, offline settlements, receipts, and refunds."
        actions={
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold uppercase ${razorpayConfigured ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
              {razorpayConfigured ? "Razorpay HMAC Active" : "Razorpay Keys Not Set"}
            </span>
            <button
              onClick={() => setRecordOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-black text-xs font-black uppercase"
            >
              <Plus className="w-4 h-4" /> Record Offline Payment
            </button>
          </div>
        }
      />

      {/* 9 Payment KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <AdminKpiCard label="Total Collected" value={formatINR(summary.total_collected)} sub="All-time settled" icon={DollarSign} tone="primary" />
        <AdminKpiCard label="This Month" value={formatINR(summary.month_revenue)} sub="Collected current month" icon={Wallet} tone="primary" />
        <AdminKpiCard label="Today" value={formatINR(summary.today_revenue)} sub="Collected today" icon={ShieldCheck} tone="info" />
        <AdminKpiCard label="Pending" value={formatINR(summary.pending_amount)} sub={`${summary.pending_count} awaiting`} icon={AlertCircle} tone="warning" />
        <AdminKpiCard label="Overdue" value={formatINR(summary.overdue_amount)} sub={`${summary.overdue_count} overdue`} icon={AlertCircle} tone="danger" />
        <AdminKpiCard label="Failed Txns" value={summary.failed_count} sub="Gateway errors" icon={XCircle} tone={summary.failed_count > 0 ? "danger" : "default"} />
        <AdminKpiCard label="Refunds" value={formatINR(summary.refunded_amount)} sub="Issued refunds" icon={RotateCcw} />
        <AdminKpiCard label="Membership Rev" value={formatINR(summary.membership_revenue)} sub="Plan purchases" icon={FileText} />
        <AdminKpiCard label="PT Revenue" value={formatINR(summary.trainer_revenue)} sub="Trainer packages" icon={FileText} tone="info" />
      </div>

      <AdminPanelCard title="Transactions & Invoices" subtitle="Search transactions, filter status, settle pending invoices, print receipts, or issue refunds">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transaction ID, member, email, or purpose..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["all", "paid", "pending", "overdue", "failed", "refunded"].map((st) => (
              <button
                key={st}
                onClick={() => setStatus(st)}
                className={`px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition ${
                  status === st ? "bg-primary text-black" : "bg-white/5 text-white/60 hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {payments.length === 0 ? (
          <AdminEmpty message="No transactions match your criteria." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[920px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase text-white/45">
                  <th className="py-3">TXN ID</th>
                  <th className="py-3">Member</th>
                  <th className="py-3">Purpose</th>
                  <th className="py-3">Method</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-mono text-[11px] text-white/80">{p.transaction_id}</td>
                    <td className="py-3">
                      <div className="font-bold text-white">{p.member_name || "Guest / Direct"}</div>
                      <div className="text-[11px] text-white/45">{p.member_email || "—"}</div>
                    </td>
                    <td className="py-3 text-white/80">{p.purpose}</td>
                    <td className="py-3 uppercase font-semibold text-white/60">{p.payment_method}</td>
                    <td className="py-3 font-black text-white">{formatINR(p.amount_inr)}</td>
                    <td className="py-3 text-white/60">{formatDateTime(p.created_at)}</td>
                    <td className="py-3"><AdminBadge status={p.status} /></td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {(p.status === "pending" || p.status === "overdue") && (
                          <button
                            onClick={() => recordMut.mutate({ paymentId: p.id, amount_inr: Number(p.amount_inr), payment_method: "cash", purpose: p.purpose, status: "paid" })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-black font-black"
                          >
                            <Check className="w-3 h-3" /> Settle
                          </button>
                        )}
                        <button
                          onClick={() => setReceiptTarget(p)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80"
                          title="View Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {p.status === "paid" && (
                          <button
                            onClick={() => setRefundTarget(p)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 font-bold hover:bg-red-500/20"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanelCard>

      {/* Record Offline Payment Modal */}
      <AdminModal open={recordOpen} onClose={() => setRecordOpen(false)} title="Record Authorized Offline Payment">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            recordMut.mutate({
              userId: Number(f.get("userId") || 0) || undefined,
              amount_inr: Number(f.get("amount_inr")),
              payment_method: String(f.get("payment_method")) as any,
              purpose: String(f.get("purpose")),
              status: String(f.get("status")) as any,
              notes: String(f.get("notes") || "") || undefined,
            });
          }}
          className="space-y-4 text-xs"
        >
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Member</span>
            <select name="userId" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
              <option value="">Walk-in / General Service</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Amount (INR) *</span>
              <input name="amount_inr" type="number" min={1} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Method *</span>
              <select name="payment_method" defaultValue="cash" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">POS Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Purpose *</span>
            <input name="purpose" required placeholder="e.g. Monthly Membership / Personal Training / Supplements" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Status</span>
            <select name="status" defaultValue="paid" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
              <option value="paid">Paid (Collected)</option>
              <option value="pending">Pending Invoice</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Notes</span>
            <input name="notes" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRecordOpen(false)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
            <button type="submit" disabled={recordMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">Record</button>
          </div>
        </form>
      </AdminModal>

      {/* Receipt Modal */}
      <AdminModal open={Boolean(receiptTarget)} onClose={() => setReceiptTarget(null)} title="Payment Receipt">
        {receiptTarget && (
          <div className="space-y-4 text-xs">
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="font-display font-black uppercase text-base text-primary">Fitness 365</span>
                <AdminBadge status={receiptTarget.status} />
              </div>
              <div className="border-t border-white/10 pt-3 space-y-1.5">
                <div className="flex justify-between"><span className="text-white/50">Receipt / TXN ID</span><span className="font-mono">{receiptTarget.transaction_id}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Member</span><span className="font-bold">{receiptTarget.member_name || "Walk-in"}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Email</span><span>{receiptTarget.member_email || "—"}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Purpose</span><span>{receiptTarget.purpose}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Method</span><span className="uppercase">{receiptTarget.payment_method}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Date</span><span>{formatDateTime(receiptTarget.created_at)}</span></div>
                <div className="flex justify-between pt-2 border-t border-white/10 text-base font-black text-white">
                  <span>Total Amount</span>
                  <span className="text-primary">{formatINR(receiptTarget.amount_inr)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-black font-black uppercase">
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
            </div>
          </div>
        )}
      </AdminModal>

      {/* Refund Modal */}
      <AdminModal
        open={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        title={`Initiate Refund — ${refundTarget ? formatINR(refundTarget.amount_inr) : ""}`}
        subtitle={refundTarget?.razorpay_payment_id && razorpayConfigured ? "Will process refund via Razorpay API & update ledger" : "Will record authorized refund in ledger"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            refundMut.mutate({ paymentId: refundTarget.id, reason: String(f.get("reason")) });
          }}
          className="space-y-4 text-xs"
        >
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Refund Reason *</span>
            <textarea name="reason" required minLength={3} rows={2} placeholder="Member requested cancellation within policy window" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRefundTarget(null)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
            <button type="submit" disabled={refundMut.isPending} className="px-5 py-2 rounded-xl bg-red-600 text-white font-black uppercase">
              {refundMut.isPending ? "Refunding..." : "Confirm Refund"}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
