import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Activity, CalendarCheck, Clock, Edit3, LogIn, LogOut, Search, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AdminBadge,
  AdminEmpty,
  AdminHeader,
  AdminKpiCard,
  AdminModal,
  AdminPanelCard,
  formatDate,
  formatDateTime,
} from "@/components/admin/AdminUI";
import {
  adminAttendanceFn,
  adminCheckInMemberFn,
  adminCheckOutMemberFn,
  adminCorrectAttendanceFn,
} from "@/lib/admin-fns";

export const Route = createFileRoute("/_admin/admin/attendance")({ component: AdminAttendancePage });

function AdminAttendancePage() {
  const fetchAtt = useServerFn(adminAttendanceFn);
  const checkIn = useServerFn(adminCheckInMemberFn);
  const checkOut = useServerFn(adminCheckOutMemberFn);
  const correct = useServerFn(adminCorrectAttendanceFn);
  const qc = useQueryClient();

  const [memberSearch, setMemberSearch] = useState("");
  const [correctModal, setCorrectModal] = useState<{ open: boolean; checkInId?: number; userId?: number; memberName?: string }>({
    open: false,
  });

  const { data, isLoading } = useQuery({ queryKey: ["admin-attendance"], queryFn: () => fetchAtt() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-attendance"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const checkInMut = useMutation({
    mutationFn: (userId: number) => checkIn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Member checked in");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Check-in failed"),
  });

  const checkOutMut = useMutation({
    mutationFn: (checkInId: number) => checkOut({ data: { checkInId } }),
    onSuccess: () => {
      toast.success("Member checked out");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Check-out failed"),
  });

  const correctMut = useMutation({
    mutationFn: (payload: any) => correct({ data: payload }),
    onSuccess: () => {
      toast.success("Attendance record corrected & logged to audit trail");
      setCorrectModal({ open: false });
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Correction failed"),
  });

  if (isLoading || !data) {
    return <div className="py-20 text-center text-xs uppercase tracking-widest text-white/40">Loading Attendance Engine...</div>;
  }

  const filteredMembers = data.members.filter((m: any) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return String(m.name).toLowerCase().includes(q) || String(m.email).toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      <AdminHeader
        eyebrow="Facility Access & Traffic"
        title="Attendance"
        accent="Management"
        subtitle="Track live floor occupancy, manual check-in/out, peak hours, and audited corrections."
        actions={
          <button
            onClick={() => setCorrectModal({ open: true })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider hover:border-primary/50 hover:text-primary transition"
          >
            <Edit3 className="w-4 h-4" /> Manual Correction
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpiCard label="Today's Check-Ins" value={data.todayCheckIns.length} sub="Total arrivals today" icon={CalendarCheck} tone="primary" />
        <AdminKpiCard label="Currently Inside" value={data.currentlyInsideCount} sub="Active on gym floor" icon={Activity} tone="info" />
        <AdminKpiCard label="Monthly Visits" value={data.monthVisits} sub="Current month total" icon={Users} />
        <AdminKpiCard label="Absent Recently" value={data.notVisitedRecently.length} sub="3+ days without check-in" icon={Clock} tone="warning" to="/admin/inactive" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminPanelCard title="Daily Attendance Trends (30 Days)" subtitle="Includes member self check-ins and admin desk check-ins">
          <div className="h-64">
            {data.dailyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyTrends}>
                  <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#a8e10b" fill="#a8e10b33" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmpty message="No attendance trends yet." />
            )}
          </div>
        </AdminPanelCard>

        <AdminPanelCard title="Peak Gym Hours" subtitle="Hourly arrival distribution over the last 30 days">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.peakHours}>
                <XAxis dataKey="hour" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
                <Bar dataKey="visits" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminPanelCard>
      </div>

      {/* Desk Check-in & Live Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminPanelCard title="Quick Member Check-In" subtitle="Search member and record arrival (duplicate check-ins prevented)">
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search member by name or email..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-primary"
            />
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredMembers.slice(0, 20).map((m: any) => (
              <div key={m.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <Link to="/admin/members/$memberId" params={{ memberId: String(m.id) }} className="font-bold text-white hover:text-primary">
                    {m.name}
                  </Link>
                  <div className="text-[11px] text-white/45">
                    Total visits: {m.total_visits} · Last: {m.last_visit ? formatDate(m.last_visit) : "Never"}
                  </div>
                </div>
                {m.checked_in_today ? (
                  <AdminBadge status="completed" label={m.today_checked_out_at ? "Visited Today" : "Inside Now"} />
                ) : (
                  <button
                    disabled={checkInMut.isPending}
                    onClick={() => checkInMut.mutate(m.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-black font-black uppercase hover:brightness-105"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Check In
                  </button>
                )}
              </div>
            ))}
          </div>
        </AdminPanelCard>

        <AdminPanelCard title="Today's Check-In Log" subtitle="Check out members leaving the facility or audit records">
          {data.todayCheckIns.length === 0 ? (
            <AdminEmpty message="No check-ins recorded today." />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.todayCheckIns.map((c: any) => (
                <div key={c.id} className="p-3 rounded-xl bg-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-white">{c.name}</div>
                    <div className="text-[11px] text-white/45">
                      In: {formatDateTime(c.checked_in_at)}
                      {c.checked_out_at ? ` · Out: ${formatDateTime(c.checked_out_at)}` : " · Active on floor"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AdminBadge status={c.source} />
                    {!c.checked_out_at && (
                      <button
                        disabled={checkOutMut.isPending}
                        onClick={() => checkOutMut.mutate(c.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold"
                      >
                        <LogOut className="w-3 h-3" /> Check Out
                      </button>
                    )}
                    <button
                      onClick={() => setCorrectModal({ open: true, checkInId: c.id, userId: c.user_id, memberName: c.name })}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                      title="Correct Record"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminPanelCard>
      </div>

      {/* Full History */}
      <AdminPanelCard title="Recent Attendance Audit History" subtitle="Last 100 visits with timestamps, sources, and correction notes">
        {data.history.length === 0 ? (
          <AdminEmpty message="No attendance records found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase text-white/45">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Member</th>
                  <th className="py-2.5">Check-In Time</th>
                  <th className="py-2.5">Check-Out Time</th>
                  <th className="py-2.5">Source</th>
                  <th className="py-2.5">Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.history.map((h: any) => (
                  <tr key={h.id}>
                    <td className="py-2.5 font-semibold">{formatDate(h.day)}</td>
                    <td className="py-2.5 font-bold text-white">{h.name}</td>
                    <td className="py-2.5 text-white/70">{formatDateTime(h.checked_in_at)}</td>
                    <td className="py-2.5 text-white/70">{h.checked_out_at ? formatDateTime(h.checked_out_at) : "—"}</td>
                    <td className="py-2.5"><AdminBadge status={h.source} /></td>
                    <td className="py-2.5 text-white/50">{h.correction_note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanelCard>

      {/* Correction Modal */}
      <AdminModal
        open={correctModal.open}
        onClose={() => setCorrectModal({ open: false })}
        title="Audit-Logged Attendance Correction"
        subtitle={correctModal.memberName ? `Record for ${correctModal.memberName}` : "Add, remove, or update a check-in with mandatory audit reason"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            correctMut.mutate({
              action: String(f.get("action")) as any,
              checkInId: correctModal.checkInId,
              userId: Number(f.get("userId") || correctModal.userId || 0) || undefined,
              day: String(f.get("day") || "") || undefined,
              reason: String(f.get("reason")),
            });
          }}
          className="space-y-4 text-xs"
        >
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Correction Type</span>
            <select
              name="action"
              defaultValue={correctModal.checkInId ? "set_checkout" : "add"}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white"
            >
              {correctModal.checkInId && <option value="set_checkout">Mark Checked Out Now</option>}
              {correctModal.checkInId && <option value="remove">Remove Erroneous Check-In</option>}
              <option value="add">Backfill / Add Check-In for Date</option>
            </select>
          </label>
          {!correctModal.checkInId && (
            <>
              <label className="block">
                <span className="text-white/60 font-bold uppercase block mb-1">Member</span>
                <select name="userId" required className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
                  {data.members.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-white/60 font-bold uppercase block mb-1">Date</span>
                <input name="day" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
            </>
          )}
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Audit Reason *</span>
            <textarea name="reason" required minLength={3} rows={2} placeholder="e.g. Member forgot to scan at reception desk" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCorrectModal({ open: false })} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
            <button type="submit" disabled={correctMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">
              Apply & Log
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
