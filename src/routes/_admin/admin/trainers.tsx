import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Dumbbell, Edit2, Plus, Power, Shield, UserPlus, Users } from "lucide-react";
import {
  AdminBadge,
  AdminEmpty,
  AdminHeader,
  AdminModal,
  AdminPanelCard,
  formatINR,
} from "@/components/admin/AdminUI";
import {
  adminAssignTrainerFn,
  adminSaveStaffFn,
  adminSaveTrainerFn,
  adminToggleStaffFn,
  adminToggleTrainerFn,
  adminTrainersStaffFn,
  adminUpdateSessionCountsFn,
} from "@/lib/admin-fns";

export const Route = createFileRoute("/_admin/admin/trainers")({ component: AdminTrainersPage });

const STAFF_PERMS = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "attendance", label: "Attendance" },
  { id: "inactive", label: "Inactive Retention" },
  { id: "memberships", label: "Memberships" },
  { id: "payments", label: "Payments" },
  { id: "trainers", label: "Trainers" },
  { id: "finance", label: "Finance" },
  { id: "reports", label: "Reports" },
] as const;

function AdminTrainersPage() {
  const fetchAll = useServerFn(adminTrainersStaffFn);
  const saveTrainer = useServerFn(adminSaveTrainerFn);
  const toggleTrainer = useServerFn(adminToggleTrainerFn);
  const assignTrainer = useServerFn(adminAssignTrainerFn);
  const updateSessions = useServerFn(adminUpdateSessionCountsFn);
  const saveStaff = useServerFn(adminSaveStaffFn);
  const toggleStaff = useServerFn(adminToggleStaffFn);
  const qc = useQueryClient();

  const [tab, setTab] = useState<"trainers" | "staff">("trainers");
  const [trainerModal, setTrainerModal] = useState<any | null>(null);
  const [assignModal, setAssignModal] = useState<any | null>(null);
  const [staffModal, setStaffModal] = useState<any | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["admin-trainers"], queryFn: () => fetchAll() });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-trainers"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const trainerMut = useMutation({
    mutationFn: (payload: any) => saveTrainer({ data: payload }),
    onSuccess: () => {
      toast.success("Trainer saved");
      setTrainerModal(null);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save trainer"),
  });

  const toggleTrainerMut = useMutation({
    mutationFn: (payload: { id: number; is_active: boolean }) => toggleTrainer({ data: payload }),
    onSuccess: () => {
      toast.success("Trainer status updated");
      refresh();
    },
  });

  const assignMut = useMutation({
    mutationFn: (payload: any) => assignTrainer({ data: payload }),
    onSuccess: () => {
      toast.success("Member assigned to trainer");
      setAssignModal(null);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Assignment failed"),
  });

  const sessionMut = useMutation({
    mutationFn: (payload: any) => updateSessions({ data: payload }),
    onSuccess: () => {
      toast.success("Session count updated");
      refresh();
    },
  });

  const staffMut = useMutation({
    mutationFn: (payload: any) => saveStaff({ data: payload }),
    onSuccess: () => {
      toast.success("Staff member saved");
      setStaffModal(null);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save staff"),
  });

  const toggleStaffMut = useMutation({
    mutationFn: (payload: { id: number; is_active: boolean }) => toggleStaff({ data: payload }),
    onSuccess: () => {
      toast.success("Staff status updated");
      refresh();
    },
  });

  if (isLoading || !data) {
    return <div className="py-20 text-center text-xs uppercase tracking-widest text-white/40">Loading Coaching & Staff Roster...</div>;
  }

  const { trainers, staff, members, canViewCompensation, roleDefaults } = data;

  return (
    <div className="space-y-6 pb-12">
      <AdminHeader
        eyebrow="Coaching & Operations Team"
        title="Trainers &"
        accent="Staff"
        subtitle="Manage coach profiles, member assignments, training sessions, and role-scoped gym staff."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setTrainerModal({})}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-black text-xs font-black uppercase"
            >
              <Plus className="w-4 h-4" /> Add Trainer
            </button>
            {canViewCompensation && (
              <button
                onClick={() => setStaffModal({ role: "receptionist", permissions: roleDefaults.receptionist })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase hover:border-primary/50"
              >
                <UserPlus className="w-4 h-4 text-primary" /> Add Staff
              </button>
            )}
          </div>
        }
      />

      <div className="flex gap-2">
        <button
          onClick={() => setTab("trainers")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${tab === "trainers" ? "bg-primary text-black" : "bg-white/5 text-white/60"}`}
        >
          Trainers ({trainers.length})
        </button>
        <button
          onClick={() => setTab("staff")}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${tab === "staff" ? "bg-primary text-black" : "bg-white/5 text-white/60"}`}
        >
          Gym Staff & Permissions ({staff.length})
        </button>
      </div>

      {tab === "trainers" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {trainers.map((t: any) => (
            <AdminPanelCard
              key={t.id}
              title={t.name}
              subtitle={`${t.specialization} · ${t.experience_years} yrs exp`}
              action={
                <div className="flex items-center gap-2">
                  <AdminBadge status={t.is_active ? "active" : "inactive"} />
                  <button onClick={() => setTrainerModal(t)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button
                    onClick={() => toggleTrainerMut.mutate({ id: t.id, is_active: !t.is_active })}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"
                    title={t.is_active ? "Deactivate" : "Activate"}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>
              }
            >
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white/5">
                    <div className="text-[10px] text-white/40 uppercase font-bold">Hours</div>
                    <div className="font-semibold mt-0.5">{t.working_hours}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <div className="text-[10px] text-white/40 uppercase font-bold">Assigned</div>
                    <div className="font-black text-primary mt-0.5">{t.assigned_members.length} members</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <div className="text-[10px] text-white/40 uppercase font-bold">Sessions</div>
                    <div className="font-semibold mt-0.5">{t.completed_sessions} done / {t.pending_sessions} left</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <div className="text-[10px] text-white/40 uppercase font-bold">
                      {canViewCompensation ? "Salary / Rev" : "Rate / mo"}
                    </div>
                    <div className="font-black mt-0.5">
                      {canViewCompensation
                        ? `${formatINR(t.salary_inr)} (${t.commission_pct}%)`
                        : formatINR(t.monthly_price)}
                    </div>
                  </div>
                </div>

                {t.trainer_revenue !== null && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-primary/5 border border-primary/15">
                    <span className="text-white/60">Tracked PT Booking Revenue ({t.bookings_count} bookings)</span>
                    <span className="font-black text-primary">{formatINR(t.trainer_revenue)}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/45 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Assigned Members
                    </span>
                    <button
                      onClick={() => setAssignModal(t)}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      + Assign Member
                    </button>
                  </div>
                  {t.assigned_members.length === 0 ? (
                    <div className="text-white/35 text-[11px]">No direct assignments yet.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {t.assigned_members.map((a: any) => (
                        <div key={a.id} className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-white">{a.member_name}</div>
                            <div className="text-[10px] text-white/45">{a.schedule_notes || "Standard PT schedule"}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white/70">{a.completed_sessions} done · {a.pending_sessions} pending</span>
                            {a.pending_sessions > 0 && (
                              <button
                                onClick={() =>
                                  sessionMut.mutate({
                                    assignmentId: a.id,
                                    completed: Number(a.completed_sessions) + 1,
                                    pending: Math.max(0, Number(a.pending_sessions) - 1),
                                  })
                                }
                                className="px-2 py-1 rounded bg-primary text-black text-[10px] font-black uppercase"
                              >
                                +1 Done
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </AdminPanelCard>
          ))}
        </div>
      ) : (
        <AdminPanelCard
          title="Staff Accounts & Role-Based Permissions"
          subtitle={canViewCompensation ? "Owner view: Manage roles, permissions, and staff compensation" : "Compensation figures hidden for non-owner accounts"}
        >
          {staff.length === 0 ? (
            <AdminEmpty message="No staff accounts created yet. Owners can add receptionists, managers, supervisors, and support staff." />
          ) : (
            <div className="space-y-3">
              {staff.map((s: any) => (
                <div key={s.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="font-bold text-sm text-white">{s.name}</span>
                      <AdminBadge status="active" label={s.role} />
                      <AdminBadge status={s.is_active ? "active" : "inactive"} label={s.is_active ? "Enabled" : "Disabled"} />
                    </div>
                    <div className="text-white/50 mt-1">{s.email} · {s.shift_hours}{canViewCompensation ? ` · Salary: ${formatINR(s.salary_inr)}` : ""}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(Array.isArray(s.permissions) ? s.permissions : []).map((p: string) => (
                        <span key={p} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] uppercase text-white/70">{p}</span>
                      ))}
                    </div>
                  </div>
                  {canViewCompensation && (
                    <div className="flex gap-2">
                      <button onClick={() => setStaffModal(s)} className="px-3 py-1.5 rounded-lg bg-white/10 font-bold">Edit</button>
                      <button
                        onClick={() => toggleStaffMut.mutate({ id: s.id, is_active: !s.is_active })}
                        className="px-3 py-1.5 rounded-lg border border-white/15 font-bold"
                      >
                        {s.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AdminPanelCard>
      )}

      {/* Trainer Modal */}
      <AdminModal open={Boolean(trainerModal)} onClose={() => setTrainerModal(null)} title={trainerModal?.id ? "Edit Trainer" : "Add Trainer"} wide>
        {trainerModal && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              trainerMut.mutate({
                id: trainerModal.id,
                name: String(f.get("name")),
                slug: String(f.get("slug")),
                email: String(f.get("email") || ""),
                phone: String(f.get("phone") || ""),
                specialization: String(f.get("specialization")),
                experience_years: Number(f.get("experience_years")),
                bio: String(f.get("bio") || ""),
                working_hours: String(f.get("working_hours") || "6:00 AM - 2:00 PM"),
                availability: String(f.get("availability") || "Mon - Sat"),
                monthly_price: Number(f.get("monthly_price")),
                quarterly_price: Number(f.get("quarterly_price")),
                annual_price: Number(f.get("annual_price")),
                compensation_type: String(f.get("compensation_type") || "salary") as any,
                salary_inr: Number(f.get("salary_inr") || 0),
                commission_pct: Number(f.get("commission_pct") || 0),
              });
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs"
          >
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Full Name *</span>
              <input name="name" defaultValue={trainerModal.name || ""} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Slug *</span>
              <input name="slug" defaultValue={trainerModal.slug || ""} required placeholder="e.g. rohit-sharma" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Specialization *</span>
              <input name="specialization" defaultValue={trainerModal.specialization || ""} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Experience (Years)</span>
              <input name="experience_years" type="number" defaultValue={trainerModal.experience_years ?? 3} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Email</span>
              <input name="email" type="email" defaultValue={trainerModal.email || ""} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Phone</span>
              <input name="phone" defaultValue={trainerModal.phone || ""} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Working Hours</span>
              <input name="working_hours" defaultValue={trainerModal.working_hours || "6:00 AM - 2:00 PM"} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Availability</span>
              <input name="availability" defaultValue={trainerModal.availability || "Mon - Sat"} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Monthly Rate (INR)</span>
              <input name="monthly_price" type="number" defaultValue={trainerModal.monthly_price ?? 2500} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Quarterly Rate (INR)</span>
              <input name="quarterly_price" type="number" defaultValue={trainerModal.quarterly_price ?? 6500} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Annual Rate (INR)</span>
              <input name="annual_price" type="number" defaultValue={trainerModal.annual_price ?? 22000} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
            </label>
            {canViewCompensation && (
              <>
                <label>
                  <span className="text-white/60 font-bold uppercase block mb-1">Base Salary (INR)</span>
                  <input name="salary_inr" type="number" defaultValue={trainerModal.salary_inr ?? 25000} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
                </label>
                <label>
                  <span className="text-white/60 font-bold uppercase block mb-1">Commission (%)</span>
                  <input name="commission_pct" type="number" defaultValue={trainerModal.commission_pct ?? 15} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
                </label>
              </>
            )}
            <label className="sm:col-span-2">
              <span className="text-white/60 font-bold uppercase block mb-1">Bio</span>
              <textarea name="bio" rows={2} defaultValue={trainerModal.bio || ""} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
            </label>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setTrainerModal(null)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
              <button type="submit" disabled={trainerMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">Save Trainer</button>
            </div>
          </form>
        )}
      </AdminModal>

      {/* Assign Member Modal */}
      <AdminModal open={Boolean(assignModal)} onClose={() => setAssignModal(null)} title={`Assign Member — ${assignModal?.name || ""}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            assignMut.mutate({
              trainerId: assignModal.id,
              userId: Number(f.get("userId")),
              scheduleNotes: String(f.get("scheduleNotes") || "") || undefined,
              pendingSessions: Number(f.get("pendingSessions") || 12),
            });
          }}
          className="space-y-4 text-xs"
        >
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Select Member</span>
            <select name="userId" required className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
              {members.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Sessions Package</span>
            <input name="pendingSessions" type="number" min={1} defaultValue={12} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Schedule Notes</span>
            <input name="scheduleNotes" placeholder="Mon/Wed/Fri 7:00 AM Strength" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAssignModal(null)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
            <button type="submit" disabled={assignMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">Assign</button>
          </div>
        </form>
      </AdminModal>

      {/* Staff Modal */}
      {canViewCompensation && (
        <AdminModal open={Boolean(staffModal)} onClose={() => setStaffModal(null)} title={staffModal?.id ? "Edit Staff Member" : "Add Staff Member"} wide>
          {staffModal && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const perms = STAFF_PERMS.filter((p) => f.get(`perm_${p.id}`) === "on").map((p) => p.id);
                staffMut.mutate({
                  id: staffModal.id,
                  name: String(f.get("name")),
                  email: String(f.get("email")),
                  phone: String(f.get("phone") || "") || undefined,
                  password: String(f.get("password") || "") || undefined,
                  role: String(f.get("role")) as any,
                  permissions: perms as any,
                  salary_inr: Number(f.get("salary_inr") || 0),
                  shift_hours: String(f.get("shift_hours") || "9:00 AM - 6:00 PM"),
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <label>
                  <span className="text-white/60 font-bold uppercase block mb-1">Name *</span>
                  <input name="name" defaultValue={staffModal.name || ""} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
                </label>
                <label>
                  <span className="text-white/60 font-bold uppercase block mb-1">Email *</span>
                  <input name="email" type="email" defaultValue={staffModal.email || ""} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
                </label>
                <label>
                  <span className="text-white/60 font-bold uppercase block mb-1">{staffModal.id ? "New Password (optional)" : "Password *"}</span>
                  <input name="password" type="password" minLength={6} required={!staffModal.id} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
                </label>
                <label>
                  <span className="text-white/60 font-bold uppercase block mb-1">Role *</span>
                  <select name="role" defaultValue={staffModal.role || "receptionist"} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white">
                    <option value="receptionist">Receptionist</option>
                    <option value="manager">Manager</option>
                    <option value="supervisor">Floor Supervisor</option>
                    <option value="support">Support Staff</option>
                    <option value="trainer">Trainer (Scoped)</option>
                  </select>
                </label>
                <label>
                  <span className="text-white/60 font-bold uppercase block mb-1">Monthly Salary (INR)</span>
                  <input name="salary_inr" type="number" defaultValue={staffModal.salary_inr ?? 18000} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
                </label>
                <label>
                  <span className="text-white/60 font-bold uppercase block mb-1">Shift Hours</span>
                  <input name="shift_hours" defaultValue={staffModal.shift_hours || "9:00 AM - 6:00 PM"} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white" />
                </label>
              </div>
              <div>
                <div className="text-white/60 font-bold uppercase mb-2">Role Permissions (Owner Settings Always Restricted)</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STAFF_PERMS.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/5 border border-white/10 cursor-pointer">
                      <input
                        type="checkbox"
                        name={`perm_${p.id}`}
                        defaultChecked={Array.isArray(staffModal.permissions) && staffModal.permissions.includes(p.id)}
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setStaffModal(null)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
                <button type="submit" disabled={staffMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">Save Staff</button>
              </div>
            </form>
          )}
        </AdminModal>
      )}
    </div>
  );
}
