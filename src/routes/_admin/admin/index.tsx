import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  Clock,
  CreditCard,
  DollarSign,
  Dumbbell,
  Mail,
  Settings,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminLoginView } from "@/components/admin/AdminLoginView";
import { AdminBadge, AdminEmpty, AdminHeader, AdminKpiCard, AdminPanelCard, formatDateTime, formatINR } from "@/components/admin/AdminUI";
import { adminOverviewFn, adminResolveEnquiryFn } from "@/lib/admin-fns";

export const Route = createFileRoute("/_admin/admin/")({ component: AdminEntryRoute });

const PIE_COLORS = ["#a8e10b", "#22d3ee", "#f59e0b", "#ec4899", "#71717a"];

function AdminEntryRoute() {
  const { admin } = Route.useRouteContext() as any;
  if (!admin) {
    return <AdminLoginView />;
  }
  return <AdminOverviewPage />;
}

function AdminOverviewPage() {
  const fetchOverview = useServerFn(adminOverviewFn);
  const resolveEnquiry = useServerFn(adminResolveEnquiryFn);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
  });

  const enquiryMut = useMutation({
    mutationFn: (vars: { id: number; status: "pending" | "resolved" }) => resolveEnquiry({ data: vars }),
    onSuccess: () => {
      toast.success("Enquiry status updated");
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-white/40">Loading Owner Command Centre...</p>
      </div>
    );
  }

  if (error || !data) {
    return <AdminEmpty message={(error as any)?.message || "Unable to load command centre overview."} />;
  }

  const { kpis, charts, todayActivity, actionCentre, enquiries, settings } = data;

  return (
    <div className="space-y-8 pb-12">
      <AdminHeader
        eyebrow="Owner Command Centre"
        title="Business"
        accent="Overview"
        subtitle="Real-time operational health, member retention alerts, attendance, and cashflow."
        actions={
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-white/80 hover:border-primary/50 hover:text-primary transition"
          >
            <Settings className="w-4 h-4" />
            Alert Thresholds ({settings.inactive_days}d / {settings.expiry_alert_days}d)
          </Link>
        }
      />

      {/* 13 Key Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <AdminKpiCard label="Registered Members" value={kpis.totalMembers} sub="All active profiles" icon={Users} to="/admin/members" />
        <AdminKpiCard label="Active Members" value={kpis.activeMembers} sub="Valid memberships" icon={UserCheck} tone="primary" to="/admin/members" />
        <AdminKpiCard label="Inactive Members" value={kpis.inactiveMembers} sub="No active plan" icon={UserX} tone="warning" to="/admin/inactive" />
        <AdminKpiCard label="New This Month" value={kpis.newThisMonth} sub="Current month signups" icon={UserPlus} tone="info" to="/admin/members" />
        <AdminKpiCard label="Today's Check-Ins" value={kpis.todayCheckIns} sub="Visits logged today" icon={CalendarCheck} tone="primary" to="/admin/attendance" />
        <AdminKpiCard label="Inside Gym Now" value={kpis.currentlyInside} sub="Not yet checked out" icon={Activity} tone="info" to="/admin/attendance" />
        <AdminKpiCard label="Expiring Soon" value={kpis.expiringSoon} sub={`Within ${settings.expiry_alert_days} days`} icon={Clock} tone={kpis.expiringSoon > 0 ? "warning" : "default"} to="/admin/memberships" />
        <AdminKpiCard label="Overdue Payments" value={kpis.overduePayments} sub={`${kpis.pendingPayments} pending`} icon={AlertTriangle} tone={kpis.overduePayments > 0 ? "danger" : "default"} to="/admin/payments" />
        <AdminKpiCard label="Active Trainers" value={kpis.activeTrainers} sub="Coaching roster" icon={Dumbbell} to="/admin/trainers" />
        <AdminKpiCard label="Pending Enquiries" value={kpis.pendingEnquiries} sub="Contact requests" icon={Mail} tone={kpis.pendingEnquiries > 0 ? "warning" : "default"} />
        {kpis.revenueThisMonth !== null && (
          <>
            <AdminKpiCard label="Revenue (Month)" value={formatINR(kpis.revenueThisMonth)} sub="Verified collected" icon={TrendingUp} tone="primary" to="/admin/finance" />
            <AdminKpiCard label="Expenses (Month)" value={formatINR(kpis.expensesThisMonth)} sub="Recorded operating costs" icon={TrendingDown} tone="warning" to="/admin/finance" />
            <AdminKpiCard
              label="Net Operating Income"
              value={formatINR(kpis.netOperatingIncome)}
              sub="Collected minus expenses"
              icon={DollarSign}
              tone={Number(kpis.netOperatingIncome) >= 0 ? "primary" : "danger"}
              to="/admin/finance"
            />
          </>
        )}
      </div>

      {/* C. Action Centre */}
      <AdminPanelCard
        title="Action Centre"
        subtitle="Automated alerts requiring owner or staff follow-up — click any item to manage"
        action={
          <Link to="/admin/settings" className="text-xs font-bold text-primary hover:underline">
            Configure thresholds →
          </Link>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ActionAlert
            to="/admin/inactive"
            icon={UserX}
            tone={actionCentre.absentCount > 0 ? "warning" : "ok"}
            title={`${actionCentre.absentCount} Members Absent (${settings.early_warning_days}+ Days)`}
            desc="Send WhatsApp reminders or log retention follow-up notes"
          />
          <ActionAlert
            to="/admin/memberships"
            icon={Clock}
            tone={actionCentre.expiringSoonCount > 0 ? "warning" : "ok"}
            title={`${actionCentre.expiringSoonCount} Memberships Expiring Soon`}
            desc={`${actionCentre.expiringTodayCount} expiring today — send renewal reminders`}
          />
          <ActionAlert
            to="/admin/payments"
            icon={Wallet}
            tone={actionCentre.overduePaymentsCount > 0 ? "danger" : "ok"}
            title={`${actionCentre.overduePaymentsCount} Overdue / ${actionCentre.pendingPaymentsCount} Pending Payments`}
            desc="Follow up or record offline cash/UPI settlements"
          />
          <ActionAlert
            to="/admin/members"
            icon={UserPlus}
            tone="info"
            title={`${actionCentre.newRegistrationsCount} New Registrations This Month`}
            desc="Onboard new athletes and assign starter workout/trainer plans"
          />
          <ActionAlert
            to="/admin/attendance"
            icon={CalendarCheck}
            tone="info"
            title={`${kpis.currentlyInside} Members Currently In Facility`}
            desc="Manage live check-ins and check-out logs"
          />
          <ActionAlert
            to="/admin/reports"
            icon={ShieldAlert}
            tone={actionCentre.pendingEnquiriesCount > 0 ? "warning" : "ok"}
            title={`${actionCentre.pendingEnquiriesCount} Open Contact Enquiries`}
            desc="Review incoming membership leads below"
          />
        </div>
      </AdminPanelCard>

      {/* A. Business Overview Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.financialSeries.length > 0 && (
          <AdminPanelCard title="Revenue vs Expenses & P&L" subtitle="6-month collected revenue, operating expenses, and net profit">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.financialSeries}>
                  <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 12 }}
                    formatter={(val: any) => formatINR(val)}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#a8e10b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AdminPanelCard>
        )}

        <AdminPanelCard title="Attendance Trends (Last 14 Days)" subtitle="Daily facility visits across members & admin check-ins">
          <div className="h-72">
            {charts.attendanceTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.attendanceTrends}>
                  <defs>
                    <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a8e10b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#a8e10b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="visits" stroke="#a8e10b" strokeWidth={2.5} fill="url(#attFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty message="No check-ins recorded in the past 14 days yet." />
            )}
          </div>
        </AdminPanelCard>

        <AdminPanelCard title="New Member Registrations" subtitle="Monthly athlete onboarding volume">
          <div className="h-64">
            {charts.registrations.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.registrations}>
                  <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="count" name="New Members" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty message="No registration trend data yet." />
            )}
          </div>
        </AdminPanelCard>

        <AdminPanelCard title="Membership Distribution" subtitle="Active member split by tier">
          <div className="h-64 flex flex-col sm:flex-row items-center gap-4">
            {charts.membershipDistribution.length > 0 ? (
              <>
                <div className="w-full sm:w-1/2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.membershipDistribution} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3}>
                        {charts.membershipDistribution.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 w-full">
                  {charts.membershipDistribution.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="font-bold uppercase tracking-wider">{item.name}</span>
                      </div>
                      <span className="font-black text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <AdminEmpty message="No members registered yet." />
            )}
          </div>
        </AdminPanelCard>
      </div>

      {/* B. Today's Activity & Enquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminPanelCard title="Today's Check-Ins" subtitle="Members visiting today" action={<Link to="/admin/attendance" className="text-xs font-bold text-primary hover:underline">Manage →</Link>}>
          {todayActivity.checkIns.length === 0 ? (
            <AdminEmpty message="No check-ins recorded today yet." />
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {todayActivity.checkIns.map((c: any) => (
                <Link
                  key={c.id}
                  to="/admin/members/$memberId"
                  params={{ memberId: String(c.user_id) }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                >
                  <div>
                    <div className="text-sm font-bold text-white">{c.name}</div>
                    <div className="text-xs text-white/45">{formatDateTime(c.checked_in_at)} · Source: {c.source}</div>
                  </div>
                  <AdminBadge status={c.checked_out_at ? "completed" : "active"} label={c.checked_out_at ? "Checked Out" : "Inside"} />
                </Link>
              ))}
            </div>
          )}
        </AdminPanelCard>

        <AdminPanelCard title="Recent Member Registrations" subtitle="Newest athletes added to the system" action={<Link to="/admin/members" className="text-xs font-bold text-primary hover:underline">All Members →</Link>}>
          {todayActivity.registrations.length === 0 ? (
            <AdminEmpty message="No members registered yet." />
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {todayActivity.registrations.map((u: any) => (
                <Link
                  key={u.id}
                  to="/admin/members/$memberId"
                  params={{ memberId: String(u.id) }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                >
                  <div>
                    <div className="text-sm font-bold text-white">{u.name}</div>
                    <div className="text-xs text-white/45">{u.email}</div>
                  </div>
                  <span className="text-xs text-white/50">{formatDateTime(u.created_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </AdminPanelCard>

        {todayActivity.payments.length > 0 && (
          <AdminPanelCard title="Recent Payments" subtitle="Latest membership & trainer transactions" action={<Link to="/admin/payments" className="text-xs font-bold text-primary hover:underline">Ledger →</Link>}>
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {todayActivity.payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div>
                    <div className="text-sm font-bold text-white">{p.member_name || "Member"} · {formatINR(p.amount_inr)}</div>
                    <div className="text-xs text-white/45">{p.purpose} · {p.payment_method}</div>
                  </div>
                  <AdminBadge status={p.status} />
                </div>
              ))}
            </div>
          </AdminPanelCard>
        )}

        <AdminPanelCard title="Recent Membership Purchases & Admin Logs" subtitle="Latest plan activations and audit activity">
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {todayActivity.purchases.map((m: any) => (
              <div key={`p-${m.id}`} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">{m.member_name} — {String(m.plan).toUpperCase()}</div>
                    <div className="text-[11px] text-white/45">{formatDateTime(m.created_at)}</div>
                  </div>
                </div>
                <AdminBadge status={m.payment_status || "paid"} />
              </div>
            ))}
            {todayActivity.logs.map((l: any) => (
              <div key={`l-${l.id}`} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div>
                  <div className="text-xs font-semibold text-white/80">{l.action.replace(/_/g, " ")}</div>
                  <div className="text-[11px] text-white/40">{l.actor_name} ({l.actor_role}) · {formatDateTime(l.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </AdminPanelCard>
      </div>

      {/* Contact Enquiries */}
      <AdminPanelCard title="Incoming Contact Enquiries" subtitle="Submissions from the public website contact page">
        {enquiries.length === 0 ? (
          <AdminEmpty message="No contact enquiries received yet." />
        ) : (
          <div className="space-y-3">
            {enquiries.map((q: any) => (
              <div key={q.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-sm text-white">{q.name}</span>
                    <span className="text-xs text-white/50">{q.email}</span>
                    <AdminBadge status={q.status} />
                  </div>
                  {q.subject && <div className="text-xs font-semibold text-primary mt-1">{q.subject}</div>}
                  <p className="text-xs text-white/65 mt-1">{q.message}</p>
                </div>
                <button
                  disabled={enquiryMut.isPending}
                  onClick={() => enquiryMut.mutate({ id: q.id, status: q.status === "pending" ? "resolved" : "pending" })}
                  className="shrink-0 px-3.5 py-2 rounded-lg border border-white/15 text-[11px] font-bold uppercase tracking-wider hover:border-primary hover:text-primary transition"
                >
                  {q.status === "pending" ? "Mark Resolved" : "Reopen"}
                </button>
              </div>
            ))}
          </div>
        )}
      </AdminPanelCard>
    </div>
  );
}

function ActionAlert({
  to,
  icon: Icon,
  tone,
  title,
  desc,
}: {
  to: string;
  icon: any;
  tone: "warning" | "danger" | "info" | "ok";
  title: string;
  desc: string;
}) {
  const styles = {
    danger: "border-red-500/30 bg-red-500/5 hover:border-red-500/60",
    warning: "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60",
    info: "border-cyan-500/25 bg-cyan-500/5 hover:border-cyan-500/50",
    ok: "border-white/10 bg-white/[0.02] hover:border-white/25",
  }[tone];
  const iconColor = {
    danger: "text-red-400",
    warning: "text-amber-400",
    info: "text-cyan-400",
    ok: "text-primary",
  }[tone];

  return (
    <Link to={to as any} className={`p-4 rounded-xl border transition flex items-start justify-between gap-3 group ${styles}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
        <div>
          <div className="text-xs font-bold text-white">{title}</div>
          <div className="text-[11px] text-white/50 mt-0.5">{desc}</div>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white shrink-0 mt-0.5 transition" />
    </Link>
  );
}
