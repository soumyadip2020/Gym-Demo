import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarRange, Download, FileSpreadsheet, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminEmpty, AdminHeader, AdminKpiCard, AdminPanelCard, formatINR } from "@/components/admin/AdminUI";
import { adminExportCsvFn, adminReportsFn } from "@/lib/admin-fns";

export const Route = createFileRoute("/_admin/admin/reports")({ component: AdminReportsPage });

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function AdminReportsPage() {
  const fetchReports = useServerFn(adminReportsFn);
  const exportCsv = useServerFn(adminExportCsvFn);

  const [startDate, setStartDate] = useState(() => isoDaysAgo(90));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-reports", startDate, endDate],
    queryFn: () => fetchReports({ data: { startDate, endDate } }),
  });

  const exportMut = useMutation({
    mutationFn: (kind: "revenue" | "expenses" | "members" | "attendance") =>
      exportCsv({ data: { kind, startDate, endDate } }),
    onSuccess: (res) => {
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${res.filename}`);
    },
    onError: (e: any) => toast.error(e?.message || "CSV export failed"),
  });

  const applyPreset = (days: number) => {
    setStartDate(isoDaysAgo(days));
    setEndDate(new Date().toISOString().slice(0, 10));
  };

  if (isLoading || !data) {
    return <div className="py-20 text-center text-xs uppercase tracking-widest text-white/40">Generating Financial Reports...</div>;
  }

  const { metrics, byPlan, byMethod, byTrainer, dailySeries } = data;

  return (
    <div className="space-y-6 pb-12">
      <AdminHeader
        eyebrow="Analytics & Exports"
        title="Financial"
        accent="Reports"
        subtitle="Filter performance across date windows and export audited CSV statements."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {(["revenue", "expenses", "members", "attendance"] as const).map((kind) => (
              <button
                key={kind}
                disabled={exportMut.isPending}
                onClick={() => exportMut.mutate(kind)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 text-[11px] font-bold uppercase tracking-wider transition disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                {kind} CSV
              </button>
            ))}
          </div>
        }
      />

      {/* Date Range Filter Bar */}
      <div className="bg-zinc-950/90 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarRange className="w-4 h-4 text-primary mr-1" />
          {[
            { label: "7 Days", days: 7 },
            { label: "30 Days", days: 30 },
            { label: "90 Days", days: 90 },
            { label: "365 Days", days: 365 },
          ].map((preset) => (
            <button
              key={preset.days}
              type="button"
              onClick={() => applyPreset(preset.days)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-primary/40 text-[11px] font-bold uppercase tracking-wider text-white/80 transition"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2">
            <span className="text-white/45 font-bold uppercase text-[10px]">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-white/45 font-bold uppercase text-[10px]">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs"
            />
          </label>
          {isFetching && <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Refreshing...</span>}
        </div>
      </div>

      {/* Period Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpiCard label="Today's Revenue" value={formatINR(metrics.dailyRevenue)} sub="Collected today" icon={Wallet} tone="primary" />
        <AdminKpiCard label="7-Day Revenue" value={formatINR(metrics.weeklyRevenue)} sub="Trailing 7 days" icon={TrendingUp} tone="info" />
        <AdminKpiCard label="This Month" value={formatINR(metrics.monthlyRevenue)} sub={`Expenses: ${formatINR(metrics.monthlyExpenses)}`} icon={FileSpreadsheet} />
        <AdminKpiCard label="Year-to-Date" value={formatINR(metrics.yearlyRevenue)} sub="Verified paid ledger" icon={TrendingUp} tone="primary" />
      </div>

      {/* Selected Range Net Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpiCard label="Range Collected" value={formatINR(metrics.rangeCollected)} sub={`${startDate} to ${endDate}`} icon={TrendingUp} tone="primary" />
        <AdminKpiCard label="Range Pending / Overdue" value={formatINR(metrics.rangePending)} sub="Uncollected dues" icon={Wallet} tone="warning" />
        <AdminKpiCard label="Range Expenses" value={formatINR(metrics.rangeExpenses)} sub={`Refunded: ${formatINR(metrics.rangeRefunded)}`} icon={TrendingDown} tone="danger" />
        <AdminKpiCard
          label="Range Net Operating"
          value={formatINR(metrics.netOperatingIncome)}
          sub="Collected minus expenses"
          icon={FileSpreadsheet}
          tone={metrics.netOperatingIncome >= 0 ? "primary" : "danger"}
        />
      </div>

      {/* Revenue Timeline */}
      <AdminPanelCard title="Collections vs Pending Trend" subtitle={`Daily breakdown from ${startDate} to ${endDate}`}>
        <div className="h-72">
          {dailySeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries}>
                <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }}
                  formatter={(v: any) => formatINR(v)}
                />
                <Bar dataKey="collected" name="Collected" fill="#a8e10b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending/Overdue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <AdminEmpty message="No payment activity found in this date range." />
          )}
        </div>
      </AdminPanelCard>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AdminPanelCard title="Revenue by Plan / Purpose" subtitle="Settled collections in range">
          {byPlan.length === 0 ? (
            <AdminEmpty message="No settled transactions." />
          ) : (
            <div className="space-y-3">
              {byPlan.map((row: any) => (
                <div key={row.plan} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                  <div className="min-w-0 pr-3">
                    <div className="font-bold text-white truncate">{row.plan}</div>
                    <div className="text-[11px] text-white/45">{row.count} payments</div>
                  </div>
                  <div className="font-black text-primary shrink-0">{formatINR(row.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </AdminPanelCard>

        <AdminPanelCard title="Revenue by Payment Method" subtitle="Gateway vs desk channels">
          {byMethod.length === 0 ? (
            <AdminEmpty message="No payment method data." />
          ) : (
            <div className="space-y-3">
              {byMethod.map((row: any) => (
                <div key={row.method} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                  <div>
                    <div className="font-bold uppercase text-white">{row.method}</div>
                    <div className="text-[11px] text-white/45">{row.count} transactions</div>
                  </div>
                  <div className="font-black text-white shrink-0">{formatINR(row.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </AdminPanelCard>

        <AdminPanelCard title="Trainer Coaching Revenue" subtitle="Bookings in selected range">
          {byTrainer.length === 0 ? (
            <AdminEmpty message="No trainer bookings in range." />
          ) : (
            <div className="space-y-3">
              {byTrainer.map((row: any) => (
                <div key={row.trainer} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                  <div>
                    <div className="font-bold text-white">{row.trainer}</div>
                    <div className="text-[11px] text-white/45">{row.bookings} bookings</div>
                  </div>
                  <div className="font-black text-cyan-300 shrink-0">{formatINR(row.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </AdminPanelCard>
      </div>
    </div>
  );
}
