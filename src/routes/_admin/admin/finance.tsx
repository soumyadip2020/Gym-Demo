import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Clock, DollarSign, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AdminEmpty,
  AdminHeader,
  AdminKpiCard,
  AdminModal,
  AdminPanelCard,
  formatDate,
  formatINR,
} from "@/components/admin/AdminUI";
import { adminAddExpenseFn, adminDeleteExpenseFn, adminFinanceFn, adminRecordPaymentFn } from "@/lib/admin-fns";

export const Route = createFileRoute("/_admin/admin/finance")({ component: AdminFinancePage });

const EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity",
  "Trainer salaries",
  "Staff salaries",
  "Equipment purchases",
  "Equipment maintenance",
  "Cleaning",
  "Marketing",
  "Supplements and inventory",
  "Miscellaneous",
];

function AdminFinancePage() {
  const fetchFinance = useServerFn(adminFinanceFn);
  const addExpense = useServerFn(adminAddExpenseFn);
  const deleteExpense = useServerFn(adminDeleteExpenseFn);
  const recordRev = useServerFn(adminRecordPaymentFn);
  const qc = useQueryClient();

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [revenueOpen, setRevenueOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["admin-finance"], queryFn: () => fetchFinance({}) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-finance"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
  };

  const addExpMut = useMutation({
    mutationFn: (payload: any) => addExpense({ data: payload }),
    onSuccess: () => {
      toast.success("Expense recorded");
      setExpenseOpen(false);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to record expense"),
  });

  const delExpMut = useMutation({
    mutationFn: (id: number) => deleteExpense({ data: { id } }),
    onSuccess: () => {
      toast.success("Expense removed");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Only gym owner can delete expenses"),
  });

  const addRevMut = useMutation({
    mutationFn: (payload: any) => recordRev({ data: payload }),
    onSuccess: () => {
      toast.success("Manual revenue entry recorded");
      setRevenueOpen(false);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to record revenue"),
  });

  if (isLoading || !data) {
    return <div className="py-20 text-center text-xs uppercase tracking-widest text-white/40">Loading Financial Command...</div>;
  }

  const { metrics, expenses, dailySeries } = data;

  return (
    <div className="space-y-6 pb-12">
      <AdminHeader
        eyebrow="Cashflow & Operating Costs"
        title="Revenue &"
        accent="Expenses"
        subtitle="Collected revenue is strictly separated from pending receivables and operating expenses."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setRevenueOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase hover:border-primary/50"
            >
              <Plus className="w-4 h-4 text-primary" /> Manual Revenue
            </button>
            <button
              onClick={() => setExpenseOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-black text-xs font-black uppercase"
            >
              <Plus className="w-4 h-4" /> Record Expense
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpiCard label="Collected (90d)" value={formatINR(metrics.rangeCollected)} sub="Verified cash/online received" icon={TrendingUp} tone="primary" />
        <AdminKpiCard label="Pending / Overdue" value={formatINR(metrics.rangePending)} sub="Uncollected receivables" icon={Clock} tone="warning" />
        <AdminKpiCard label="Expenses (90d)" value={formatINR(metrics.rangeExpenses)} sub={`Month: ${formatINR(metrics.monthlyExpenses)}`} icon={TrendingDown} tone="danger" />
        <AdminKpiCard
          label="Net Operating Income"
          value={formatINR(metrics.netOperatingIncome)}
          sub="Collected minus expenses"
          icon={DollarSign}
          tone={metrics.netOperatingIncome >= 0 ? "primary" : "danger"}
        />
      </div>

      <AdminPanelCard title="Daily Collected Revenue vs Pending Receivables (90d)" subtitle="Verified collections separated from pending amounts">
        <div className="h-72">
          {dailySeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries}>
                <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} formatter={(v: any) => formatINR(v)} />
                <Bar dataKey="collected" name="Collected" fill="#a8e10b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending/Overdue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <AdminEmpty message="No revenue transactions in the selected period." />
          )}
        </div>
      </AdminPanelCard>

      <AdminPanelCard title="Expense Ledger" subtitle="Rent, utilities, payroll, equipment, and facility costs">
        {expenses.length === 0 ? (
          <AdminEmpty message="No expenses recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[780px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase text-white/45">
                  <th className="py-3">Date</th>
                  <th className="py-3">Title</th>
                  <th className="py-3">Category</th>
                  <th className="py-3">Method</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Recorded By</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {expenses.map((ex: any) => (
                  <tr key={ex.id}>
                    <td className="py-3 text-white/70">{formatDate(ex.expense_date)}</td>
                    <td className="py-3">
                      <div className="font-bold text-white">{ex.title}</div>
                      {ex.description && <div className="text-[11px] text-white/45">{ex.description}</div>}
                    </td>
                    <td className="py-3"><span className="px-2.5 py-1 rounded bg-white/5 text-[11px] font-semibold">{ex.category}</span></td>
                    <td className="py-3 uppercase text-white/60">{ex.payment_method}</td>
                    <td className="py-3 font-black text-red-300">{formatINR(ex.amount_inr)}</td>
                    <td className="py-3 text-white/55">{ex.recorded_by || "Owner"}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => delExpMut.mutate(ex.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-red-400"
                        title="Delete Expense (Owner)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanelCard>

      {/* Record Expense Modal */}
      <AdminModal open={expenseOpen} onClose={() => setExpenseOpen(false)} title="Record Gym Expense">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            addExpMut.mutate({
              title: String(f.get("title")),
              category: String(f.get("category")),
              amount_inr: Number(f.get("amount_inr")),
              expense_date: String(f.get("expense_date")),
              payment_method: String(f.get("payment_method")),
              description: String(f.get("description") || "") || undefined,
              receipt_url: String(f.get("receipt_url") || "") || undefined,
            });
          }}
          className="space-y-4 text-xs"
        >
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Expense Title *</span>
            <input name="title" required placeholder="e.g. Monthly Facility Lease" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Category *</span>
              <select name="category" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Amount (INR) *</span>
              <input name="amount_inr" type="number" min={1} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Date *</span>
              <input name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Payment Method</span>
              <select name="payment_method" defaultValue="bank_transfer" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Receipt / Reference URL (optional)</span>
            <input name="receipt_url" placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Description</span>
            <textarea name="description" rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setExpenseOpen(false)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
            <button type="submit" disabled={addExpMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">Save Expense</button>
          </div>
        </form>
      </AdminModal>

      {/* Manual Revenue Modal */}
      <AdminModal open={revenueOpen} onClose={() => setRevenueOpen(false)} title="Record Authorized Offline Revenue">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            addRevMut.mutate({
              amount_inr: Number(f.get("amount_inr")),
              payment_method: String(f.get("payment_method")) as any,
              purpose: String(f.get("purpose")),
              status: "paid",
              notes: String(f.get("notes") || "") || undefined,
            });
          }}
          className="space-y-4 text-xs"
        >
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Service / Purpose *</span>
            <input name="purpose" required placeholder="e.g. Supplements / Locker Rental / Day Pass" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Amount (INR) *</span>
              <input name="amount_inr" type="number" min={1} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Method</span>
              <select name="payment_method" defaultValue="cash" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Notes</span>
            <input name="notes" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRevenueOpen(false)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
            <button type="submit" disabled={addRevMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">Record Revenue</button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
