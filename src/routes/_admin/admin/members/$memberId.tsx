import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarCheck, Check, CreditCard, Pause, Play, Save, Trash2 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import {
  AdminBadge,
  AdminEmpty,
  AdminHeader,
  AdminModal,
  AdminPanelCard,
  ConfirmModal,
  formatDate,
  formatDateTime,
  formatINR,
} from "@/components/admin/AdminUI";
import {
  adminAdjustMembershipFn,
  adminArchiveMemberFn,
  adminAssignMembershipFn,
  adminCheckInMemberFn,
  adminMemberDetailFn,
  adminRecordPaymentFn,
  adminUpdateMemberFn,
} from "@/lib/admin-fns";

export const Route = createFileRoute("/_admin/admin/members/$memberId")({ component: AdminMemberDetailPage });

type TabId = "overview" | "membership" | "attendance" | "payments" | "progress" | "activity";

function AdminMemberDetailPage() {
  const { memberId } = Route.useParams();
  const idNum = Number(memberId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchDetail = useServerFn(adminMemberDetailFn);
  const updateMember = useServerFn(adminUpdateMemberFn);
  const assignMem = useServerFn(adminAssignMembershipFn);
  const adjustMem = useServerFn(adminAdjustMembershipFn);
  const checkIn = useServerFn(adminCheckInMemberFn);
  const recordPay = useServerFn(adminRecordPaymentFn);
  const archiveMember = useServerFn(adminArchiveMemberFn);

  const [tab, setTab] = useState<TabId>("overview");
  const [assignOpen, setAssignOpen] = useState(false);
  const [extendTarget, setExtendTarget] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<"archive" | "delete_permanent" | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-member", idNum],
    queryFn: () => fetchDetail({ data: { memberId: idNum } }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-member", idNum] });
    qc.invalidateQueries({ queryKey: ["admin-members"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const updateMut = useMutation({
    mutationFn: (payload: any) => updateMember({ data: payload }),
    onSuccess: () => {
      toast.success("Member profile updated");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });

  const assignMut = useMutation({
    mutationFn: (payload: any) => assignMem({ data: payload }),
    onSuccess: () => {
      toast.success("Membership assigned");
      setAssignOpen(false);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to assign plan"),
  });

  const adjustMut = useMutation({
    mutationFn: (payload: any) => adjustMem({ data: payload }),
    onSuccess: () => {
      toast.success("Membership updated");
      setExtendTarget(null);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Adjustment failed"),
  });

  const checkInMut = useMutation({
    mutationFn: () => checkIn({ data: { userId: idNum } }),
    onSuccess: () => {
      toast.success("Member checked in for today");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Check-in failed"),
  });

  const markPaidMut = useMutation({
    mutationFn: (paymentId: number) =>
      recordPay({ data: { paymentId, amount_inr: 1, payment_method: "cash", purpose: "Settled", status: "paid" } }),
    onSuccess: () => {
      toast.success("Payment marked as paid");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (mode: "archive" | "delete_permanent") => archiveMember({ data: { memberId: idNum, mode } }),
    onSuccess: (_, mode) => {
      toast.success(mode === "archive" ? "Member archived" : "Member permanently deleted");
      setDeleteConfirm(null);
      qc.invalidateQueries({ queryKey: ["admin-members"] });
      navigate({ to: "/admin/members" });
    },
    onError: (e: any) => toast.error(e?.message || "Action failed"),
  });

  if (isLoading) return <div className="py-20 text-center text-xs uppercase tracking-widest text-white/40">Loading Member Profile...</div>;
  if (error || !data) return <AdminEmpty message={(error as any)?.message || "Member not found."} />;

  const { member, memberships, attendance, payments, progress, workouts, diets, followups, logs, assignments, plans } = data;

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "1. Overview" },
    { id: "membership", label: "2. Membership" },
    { id: "attendance", label: "3. Attendance" },
    { id: "payments", label: "4. Payments" },
    { id: "progress", label: "5. Fitness Progress" },
    { id: "activity", label: "6. Activity History" },
  ];

  return (
    <div className="space-y-6 pb-14">
      <div className="flex items-center justify-between">
        <Link to="/admin/members" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to Members
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => checkInMut.mutate()}
            disabled={checkInMut.isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-bold uppercase hover:bg-primary hover:text-black transition"
          >
            <CalendarCheck className="w-3.5 h-3.5" /> Check-In Today
          </button>
          <button
            onClick={() => setAssignOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-black text-xs font-black uppercase hover:brightness-105 transition"
          >
            <CreditCard className="w-3.5 h-3.5" /> Assign Plan
          </button>
        </div>
      </div>

      <AdminHeader
        eyebrow={`Member #${member.id}`}
        title={member.name}
        subtitle={`${member.email}${member.phone ? ` · ${member.phone}` : ""} · Registered ${formatDate(member.created_at)}`}
        actions={<AdminBadge status={member.status} />}
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              tab === t.id ? "bg-primary text-black" : "bg-white/5 text-white/60 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. Overview */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AdminPanelCard title="Profile & Biometrics" className="lg:col-span-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const num = (k: string) => {
                  const v = String(f.get(k) || "").trim();
                  return v ? Number(v) : null;
                };
                updateMut.mutate({
                  memberId: member.id,
                  name: String(f.get("name")),
                  email: String(f.get("email")),
                  phone: String(f.get("phone") || "") || null,
                  height_cm: num("height_cm"),
                  weight_kg: num("weight_kg"),
                  age: num("age"),
                  gender: String(f.get("gender") || "") || null,
                  notes: String(f.get("notes") || "") || null,
                });
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs"
            >
              <label>
                <span className="text-white/50 font-bold uppercase block mb-1">Full Name</span>
                <input name="name" defaultValue={member.name} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
              <label>
                <span className="text-white/50 font-bold uppercase block mb-1">Email</span>
                <input name="email" type="email" defaultValue={member.email} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
              <label>
                <span className="text-white/50 font-bold uppercase block mb-1">Phone</span>
                <input name="phone" defaultValue={member.phone || ""} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
              <label>
                <span className="text-white/50 font-bold uppercase block mb-1">Gender</span>
                <input name="gender" defaultValue={member.gender || ""} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
              <label>
                <span className="text-white/50 font-bold uppercase block mb-1">Height (cm)</span>
                <input name="height_cm" type="number" defaultValue={member.height_cm ?? ""} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
              <label>
                <span className="text-white/50 font-bold uppercase block mb-1">Weight (kg)</span>
                <input name="weight_kg" type="number" step="0.1" defaultValue={member.weight_kg ?? ""} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
              <label>
                <span className="text-white/50 font-bold uppercase block mb-1">Age</span>
                <input name="age" type="number" defaultValue={member.age ?? ""} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
              <label className="sm:col-span-2">
                <span className="text-white/50 font-bold uppercase block mb-1">Owner / Coach Notes</span>
                <textarea name="notes" rows={3} defaultValue={member.notes || ""} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
              <div className="sm:col-span-2 flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm("archive")}
                    className="px-3 py-2 rounded-xl border border-amber-500/30 text-amber-300 font-bold uppercase hover:bg-amber-500/10"
                  >
                    Archive Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm("delete_permanent")}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-red-500/30 text-red-400 font-bold uppercase hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
                <button type="submit" disabled={updateMut.isPending} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black font-black uppercase">
                  <Save className="w-3.5 h-3.5" /> {updateMut.isPending ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </AdminPanelCard>

          <div className="space-y-6">
            <AdminPanelCard title="Assigned Trainers">
              {assignments.length === 0 ? (
                <AdminEmpty message="No trainer assigned." />
              ) : (
                <div className="space-y-2.5">
                  {assignments.map((a: any) => (
                    <div key={a.id} className="p-3 rounded-xl bg-white/5 text-xs">
                      <div className="font-bold text-white">{a.trainer_name}</div>
                      <div className="text-white/45">{a.specialization}</div>
                      <div className="mt-1 text-primary font-semibold">
                        Sessions: {a.completed_sessions} done / {a.pending_sessions} pending
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanelCard>

            <AdminPanelCard title="AI Workout & Diet Plans">
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase text-white/40 mb-1">Latest Workouts ({workouts.length})</div>
                  {workouts.length === 0 ? (
                    <div className="text-white/35">None generated</div>
                  ) : (
                    workouts.map((w: any) => (
                      <div key={w.id} className="p-2.5 rounded-lg bg-white/5 mb-1.5">
                        <span className="font-bold uppercase text-primary">{w.goal.replace("_", " ")}</span> · {formatDate(w.created_at)}
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-white/40 mb-1">Latest Diets ({diets.length})</div>
                  {diets.length === 0 ? (
                    <div className="text-white/35">None generated</div>
                  ) : (
                    diets.map((d: any) => (
                      <div key={d.id} className="p-2.5 rounded-lg bg-white/5 mb-1.5">
                        <span className="font-bold uppercase text-cyan-400">{d.goal.replace("_", " ")}</span> · {d.data?.calories || "—"} kcal · {formatDate(d.created_at)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </AdminPanelCard>
          </div>
        </div>
      )}

      {/* 2. Membership */}
      {tab === "membership" && (
        <AdminPanelCard
          title="Membership History & Controls"
          subtitle="Extending validity never auto-marks an unpaid record as paid"
          action={
            <button onClick={() => setAssignOpen(true)} className="px-4 py-2 rounded-xl bg-primary text-black text-xs font-black uppercase">
              + Assign Plan
            </button>
          }
        >
          {memberships.length === 0 ? (
            <AdminEmpty message="No memberships assigned yet." />
          ) : (
            <div className="space-y-3">
              {memberships.map((m: any) => (
                <div key={m.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold uppercase text-base text-white">{m.plan}</span>
                      <AdminBadge status={m.status === "paused" ? "paused" : new Date(m.ends_at).getTime() > Date.now() ? m.status : "expired"} />
                      <AdminBadge status={m.payment_status || "paid"} />
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      {formatDate(m.starts_at)} → {formatDate(m.ends_at)} · Amount: {formatINR(m.amount_inr)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setExtendTarget(m.id)}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-primary hover:text-black text-xs font-bold transition"
                    >
                      Extend Validity
                    </button>
                    {m.status === "paused" ? (
                      <button
                        onClick={() => adjustMut.mutate({ membershipId: m.id, action: "resume" })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold"
                      >
                        <Play className="w-3 h-3" /> Resume
                      </button>
                    ) : (
                      <button
                        onClick={() => adjustMut.mutate({ membershipId: m.id, action: "pause" })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-300 text-xs font-bold"
                      >
                        <Pause className="w-3 h-3" /> Freeze
                      </button>
                    )}
                    <button
                      onClick={() => adjustMut.mutate({ membershipId: m.id, action: m.status === "inactive" ? "activate" : "deactivate" })}
                      className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-white/70 hover:text-white"
                    >
                      {m.status === "inactive" ? "Activate" : "Deactivate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminPanelCard>
      )}

      {/* 3. Attendance */}
      {tab === "attendance" && (
        <AdminPanelCard title={`Attendance History (${attendance.length} visits)`}>
          {attendance.length === 0 ? (
            <AdminEmpty message="No check-ins logged for this member." />
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {attendance.map((a: any) => (
                <div key={a.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{formatDate(a.day)}</div>
                    <div className="text-white/45">
                      In: {formatDateTime(a.checked_in_at)} {a.checked_out_at ? `· Out: ${formatDateTime(a.checked_out_at)}` : ""}
                    </div>
                    {a.correction_note && <div className="text-amber-300 mt-0.5">Note: {a.correction_note}</div>}
                  </div>
                  <AdminBadge status={a.source || "member"} />
                </div>
              ))}
            </div>
          )}
        </AdminPanelCard>
      )}

      {/* 4. Payments */}
      {tab === "payments" && (
        <AdminPanelCard title="Payment History">
          {payments.length === 0 ? (
            <AdminEmpty message="No payment records found (or restricted by role permissions)." />
          ) : (
            <div className="space-y-2.5">
              {payments.map((p: any) => (
                <div key={p.id} className="p-4 rounded-xl bg-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-white">{p.purpose} · {formatINR(p.amount_inr)}</div>
                    <div className="text-white/45">
                      TXN: {p.transaction_id} · {p.payment_method} · {formatDateTime(p.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AdminBadge status={p.status} />
                    {(p.status === "pending" || p.status === "overdue") && (
                      <button
                        onClick={() => markPaidMut.mutate(p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-black font-bold"
                      >
                        <Check className="w-3 h-3" /> Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminPanelCard>
      )}

      {/* 5. Fitness Progress */}
      {tab === "progress" && (
        <AdminPanelCard title="Biometric Progress">
          {progress.length === 0 ? (
            <AdminEmpty message="No progress entries logged yet." />
          ) : (
            <div className="space-y-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progress.map((p: any) => ({ day: formatDate(p.day), weight: Number(p.weight_kg || 0) }))}>
                    <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
                    <Area type="monotone" dataKey="weight" stroke="#a8e10b" fill="#a8e10b33" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {progress.map((p: any) => (
                  <div key={p.id} className="p-3 rounded-xl bg-white/5 flex justify-between text-xs">
                    <span className="font-bold">{formatDate(p.day)}</span>
                    <span className="text-white/70">
                      Weight: {p.weight_kg ?? "—"}kg · BF: {p.body_fat ?? "—"}% · Muscle: {p.muscle_mass ?? "—"}kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AdminPanelCard>
      )}

      {/* 6. Activity History */}
      {tab === "activity" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminPanelCard title="Retention Follow-Ups">
            {followups.length === 0 ? (
              <AdminEmpty message="No follow-ups recorded." />
            ) : (
              <div className="space-y-2.5">
                {followups.map((f: any) => (
                  <div key={f.id} className="p-3 rounded-xl bg-white/5 text-xs">
                    <div className="flex justify-between">
                      <span className="font-bold uppercase text-primary">{f.channel}</span>
                      <AdminBadge status={f.status} />
                    </div>
                    <p className="text-white/80 mt-1">{f.note}</p>
                    <div className="text-[11px] text-white/40 mt-1">{f.created_by} · {formatDateTime(f.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanelCard>

          <AdminPanelCard title="Admin Audit Log">
            {logs.length === 0 ? (
              <AdminEmpty message="No admin logs for this member." />
            ) : (
              <div className="space-y-2.5">
                {logs.map((l: any) => (
                  <div key={l.id} className="p-3 rounded-xl bg-white/5 text-xs">
                    <div className="font-bold text-white uppercase">{l.action.replace(/_/g, " ")}</div>
                    <div className="text-white/45 mt-0.5">{l.actor_name} ({l.actor_role}) · {formatDateTime(l.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanelCard>
        </div>
      )}

      {/* Assign Membership Modal */}
      <AdminModal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Membership Plan">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            assignMut.mutate({
              user_id: idNum,
              plan_slug: String(f.get("plan_slug")),
              payment_status: String(f.get("payment_status")) as any,
              payment_method: String(f.get("payment_method")),
              notes: String(f.get("notes") || "") || undefined,
            });
          }}
          className="space-y-4 text-xs"
        >
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Select Plan</span>
            <select name="plan_slug" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
              {plans.map((p: any) => (
                <option key={p.id} value={p.slug}>
                  {p.name} ({formatINR(p.price_inr)} / {p.duration_days} days)
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Payment Status</span>
            <select name="payment_status" defaultValue="paid" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="free">Free</option>
            </select>
          </label>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Payment Method</span>
            <select name="payment_method" defaultValue="upi" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </label>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Notes</span>
            <input name="notes" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAssignOpen(false)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
            <button type="submit" disabled={assignMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">
              Assign
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Extend Modal */}
      <AdminModal open={extendTarget !== null} onClose={() => setExtendTarget(null)} title="Extend Membership Validity" subtitle="Payment status is NOT automatically marked paid when extending">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            adjustMut.mutate({
              membershipId: extendTarget!,
              action: "extend",
              extendDays: Number(f.get("days")),
              markPaymentStatus: String(f.get("markPaymentStatus")) as any,
            });
          }}
          className="space-y-4 text-xs"
        >
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Extend by Days</span>
            <input name="days" type="number" min={1} max={730} defaultValue={15} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Payment Status Handling</span>
            <select name="markPaymentStatus" defaultValue="unchanged" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
              <option value="unchanged">Keep Existing Payment Status</option>
              <option value="pending">Set Payment Status to Pending</option>
              <option value="overdue">Set Payment Status to Overdue</option>
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setExtendTarget(null)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
            <button type="submit" disabled={adjustMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">
              Extend
            </button>
          </div>
        </form>
      </AdminModal>

      <ConfirmModal
        open={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && deleteMut.mutate(deleteConfirm)}
        title={deleteConfirm === "delete_permanent" ? "Permanently Delete Member" : "Archive Member"}
        description={
          deleteConfirm === "delete_permanent"
            ? "Owner action: Permanently delete this member and cascade-remove associated records? This cannot be undone."
            : "Archive this member while preserving historical attendance and financial records?"
        }
        confirmLabel={deleteConfirm === "delete_permanent" ? "Delete Forever" : "Archive"}
        danger
        busy={deleteMut.isPending}
      />
    </div>
  );
}
