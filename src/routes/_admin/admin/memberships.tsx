import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, Bell, CreditCard, Edit2, Pause, Play, Plus, Power } from "lucide-react";
import {
  AdminBadge,
  AdminEmpty,
  AdminHeader,
  AdminModal,
  AdminPanelCard,
  formatDate,
  formatDateTime,
  formatINR,
} from "@/components/admin/AdminUI";
import {
  adminAdjustMembershipFn,
  adminAssignMembershipFn,
  adminMembershipsFn,
  adminSavePlanFn,
  adminTogglePlanFn,
} from "@/lib/admin-fns";

export const Route = createFileRoute("/_admin/admin/memberships")({ component: AdminMembershipsPage });

function AdminMembershipsPage() {
  const fetchMem = useServerFn(adminMembershipsFn);
  const savePlan = useServerFn(adminSavePlanFn);
  const togglePlan = useServerFn(adminTogglePlanFn);
  const assignMem = useServerFn(adminAssignMembershipFn);
  const adjustMem = useServerFn(adminAdjustMembershipFn);
  const qc = useQueryClient();

  const [bucket, setBucket] = useState("all");
  const [planModal, setPlanModal] = useState<any | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [extendTarget, setExtendTarget] = useState<any | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["admin-memberships"], queryFn: () => fetchMem() });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-memberships"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const planMut = useMutation({
    mutationFn: (payload: any) => savePlan({ data: payload }),
    onSuccess: () => {
      toast.success("Membership plan saved");
      setPlanModal(null);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save plan"),
  });

  const toggleMut = useMutation({
    mutationFn: (payload: { id: number; action: "enable" | "disable" | "archive" }) => togglePlan({ data: payload }),
    onSuccess: () => {
      toast.success("Plan status updated");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Action failed"),
  });

  const assignMut = useMutation({
    mutationFn: (payload: any) => assignMem({ data: payload }),
    onSuccess: () => {
      toast.success("Plan assigned to member");
      setAssignOpen(false);
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to assign"),
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

  if (isLoading || !data) {
    return <div className="py-20 text-center text-xs uppercase tracking-widest text-white/40">Loading Memberships & Plans...</div>;
  }

  const { plans, memberships, users, renewalLogs } = data;
  const bucketCounts: Record<string, number> = {
    all: memberships.length,
    expiring_today: memberships.filter((m: any) => m.expiryBucket === "expiring_today").length,
    within_3_days: memberships.filter((m: any) => m.expiryBucket === "within_3_days").length,
    within_7_days: memberships.filter((m: any) => m.expiryBucket === "within_7_days").length,
    within_30_days: memberships.filter((m: any) => m.expiryBucket === "within_30_days").length,
    expired: memberships.filter((m: any) => m.expiryBucket === "expired").length,
    paused: memberships.filter((m: any) => m.expiryBucket === "paused").length,
  };

  const filteredSubs = bucket === "all" ? memberships : memberships.filter((m: any) => m.expiryBucket === bucket);

  return (
    <div className="space-y-6 pb-12">
      <AdminHeader
        eyebrow="Plans & Expiry Radar"
        title="Membership"
        accent="Management"
        subtitle="Create/edit gym plans, monitor upcoming expiries, freeze/extend memberships, and log renewals."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setAssignOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase hover:border-primary/50"
            >
              <CreditCard className="w-4 h-4 text-primary" /> Assign to Member
            </button>
            <button
              onClick={() => setPlanModal({ benefits: [] })}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-black text-xs font-black uppercase"
            >
              <Plus className="w-4 h-4" /> Create Plan
            </button>
          </div>
        }
      />

      {/* Plan Catalog */}
      <AdminPanelCard title="Membership Plan Catalog" subtitle="Manage pricing, durations, benefits, and active visibility">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((p: any) => (
            <div key={p.id} className={`p-5 rounded-2xl border ${p.is_active ? "bg-white/[0.03] border-white/10" : "bg-zinc-900/40 border-white/5 opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-lg font-black uppercase text-white">{p.name}</div>
                  <div className="text-xs text-white/45">{p.duration_days} days · slug: {p.slug}</div>
                </div>
                <AdminBadge status={p.is_active ? "active" : "inactive"} />
              </div>
              <div className="font-display text-2xl font-black text-primary mt-3">{formatINR(p.price_inr)}</div>
              <p className="text-xs text-white/60 mt-1 line-clamp-2">{p.description}</p>
              <ul className="mt-3 space-y-1 text-[11px] text-white/55">
                {(Array.isArray(p.benefits) ? p.benefits : []).map((b: string, i: number) => (
                  <li key={i}>• {b}</li>
                ))}
              </ul>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                <button
                  onClick={() => setPlanModal(p)}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-bold"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => toggleMut.mutate({ id: p.id, action: p.is_active ? "disable" : "enable" })}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70"
                  title={p.is_active ? "Disable Plan" : "Enable Plan"}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => toggleMut.mutate({ id: p.id, action: "archive" })}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-red-400"
                  title="Archive Plan"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </AdminPanelCard>

      {/* Expiry Monitoring */}
      <AdminPanelCard title="Expiry Monitoring & Member Subscriptions" subtitle="Extending validity preserves unpaid/pending payment status">
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { id: "all", label: `All (${bucketCounts.all})` },
            { id: "expiring_today", label: `Expiring Today (${bucketCounts.expiring_today})` },
            { id: "within_3_days", label: `Within 3 Days (${bucketCounts.within_3_days})` },
            { id: "within_7_days", label: `Within 7 Days (${bucketCounts.within_7_days})` },
            { id: "within_30_days", label: `Within 30 Days (${bucketCounts.within_30_days})` },
            { id: "expired", label: `Already Expired (${bucketCounts.expired})` },
            { id: "paused", label: `Paused/Frozen (${bucketCounts.paused})` },
          ].map((b) => (
            <button
              key={b.id}
              onClick={() => setBucket(b.id)}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition ${
                bucket === b.id ? "bg-primary text-black" : "bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {filteredSubs.length === 0 ? (
          <AdminEmpty message="No memberships in this expiry category." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[880px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase text-white/45">
                  <th className="py-3">Member</th>
                  <th className="py-3">Plan</th>
                  <th className="py-3">Expiry</th>
                  <th className="py-3">Payment</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSubs.map((m: any) => (
                  <tr key={m.id}>
                    <td className="py-3.5">
                      <Link to="/admin/members/$memberId" params={{ memberId: String(m.user_id) }} className="font-bold text-white hover:text-primary">
                        {m.member_name}
                      </Link>
                      <div className="text-[11px] text-white/45">{m.member_email}</div>
                    </td>
                    <td className="py-3.5 font-bold uppercase">{m.plan}</td>
                    <td className="py-3.5 text-white/75">
                      {formatDate(m.ends_at)}
                      <div className="text-[10px] text-white/40">{m.diffDays >= 0 ? `${m.diffDays}d left` : `${Math.abs(m.diffDays)}d overdue`}</div>
                    </td>
                    <td className="py-3.5"><AdminBadge status={m.payment_status || "paid"} /></td>
                    <td className="py-3.5"><AdminBadge status={m.expiryBucket} /></td>
                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setExtendTarget(m)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-primary hover:text-black font-bold"
                        >
                          Extend
                        </button>
                        {m.status === "paused" ? (
                          <button
                            onClick={() => adjustMut.mutate({ membershipId: m.id, action: "resume" })}
                            className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400"
                            title="Resume"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => adjustMut.mutate({ membershipId: m.id, action: "pause" })}
                            className="p-1.5 rounded-lg bg-purple-500/15 text-purple-300"
                            title="Freeze / Pause"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => adjustMut.mutate({ membershipId: m.id, action: "log_renewal_reminder" })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-primary hover:text-primary font-bold"
                          title="Log Renewal Reminder"
                        >
                          <Bell className="w-3 h-3" /> Remind
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanelCard>

      {/* Renewal History */}
      <AdminPanelCard title="Renewal & Membership Activity History">
        {renewalLogs.length === 0 ? (
          <AdminEmpty message="No renewal actions logged yet." />
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {renewalLogs.map((l: any) => (
              <div key={l.id} className="p-3 rounded-xl bg-white/5 flex justify-between text-xs">
                <div>
                  <span className="font-bold uppercase text-primary">{l.action.replace(/_/g, " ")}</span>
                  <span className="text-white/50 ml-2">by {l.actor_name}</span>
                </div>
                <span className="text-white/45">{formatDateTime(l.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </AdminPanelCard>

      {/* Plan Modal */}
      <AdminModal open={Boolean(planModal)} onClose={() => setPlanModal(null)} title={planModal?.id ? "Edit Membership Plan" : "Create Membership Plan"}>
        {planModal && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              planMut.mutate({
                id: planModal.id,
                name: String(f.get("name")),
                slug: String(f.get("slug")),
                price_inr: Number(f.get("price_inr")),
                duration_days: Number(f.get("duration_days")),
                description: String(f.get("description") || ""),
                benefits: String(f.get("benefits") || "")
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-white/60 font-bold uppercase block mb-1">Plan Name *</span>
                <input name="name" defaultValue={planModal.name || ""} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
              <label>
                <span className="text-white/60 font-bold uppercase block mb-1">Slug *</span>
                <input name="slug" defaultValue={planModal.slug || ""} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
              <label>
                <span className="text-white/60 font-bold uppercase block mb-1">Price (INR) *</span>
                <input name="price_inr" type="number" min={0} defaultValue={planModal.price_inr ?? 999} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
              <label>
                <span className="text-white/60 font-bold uppercase block mb-1">Duration (Days) *</span>
                <input name="duration_days" type="number" min={1} defaultValue={planModal.duration_days ?? 30} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
              </label>
            </div>
            <label className="block">
              <span className="text-white/60 font-bold uppercase block mb-1">Description</span>
              <input name="description" defaultValue={planModal.description || ""} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
            </label>
            <label className="block">
              <span className="text-white/60 font-bold uppercase block mb-1">Benefits (one per line)</span>
              <textarea
                name="benefits"
                rows={4}
                defaultValue={(Array.isArray(planModal.benefits) ? planModal.benefits : []).join("\n")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPlanModal(null)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
              <button type="submit" disabled={planMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">Save Plan</button>
            </div>
          </form>
        )}
      </AdminModal>

      {/* Assign Plan Modal */}
      <AdminModal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Membership to Member">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            assignMut.mutate({
              user_id: Number(f.get("user_id")),
              plan_slug: String(f.get("plan_slug")),
              payment_status: String(f.get("payment_status")) as any,
              payment_method: String(f.get("payment_method")),
            });
          }}
          className="space-y-4 text-xs"
        >
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Member</span>
            <select name="user_id" required className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Plan</span>
            <select name="plan_slug" required className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
              {plans.filter((p: any) => p.is_active).map((p: any) => (
                <option key={p.id} value={p.slug}>
                  {p.name} ({formatINR(p.price_inr)} / {p.duration_days}d)
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Payment Status</span>
              <select name="payment_status" defaultValue="paid" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="free">Free</option>
              </select>
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1">Method</span>
              <select name="payment_method" defaultValue="upi" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAssignOpen(false)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
            <button type="submit" disabled={assignMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">Assign</button>
          </div>
        </form>
      </AdminModal>

      {/* Extend Modal */}
      <AdminModal open={Boolean(extendTarget)} onClose={() => setExtendTarget(null)} title={`Extend Membership — ${extendTarget?.member_name || ""}`} subtitle="Payment status will NOT be auto-marked paid">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            adjustMut.mutate({
              membershipId: extendTarget.id,
              action: "extend",
              extendDays: Number(f.get("days")),
              markPaymentStatus: String(f.get("markPaymentStatus")) as any,
            });
          }}
          className="space-y-4 text-xs"
        >
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Add Days</span>
            <input name="days" type="number" min={1} max={730} defaultValue={15} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Payment Status</span>
            <select name="markPaymentStatus" defaultValue="unchanged" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
              <option value="unchanged">Keep Current ({extendTarget?.payment_status})</option>
              <option value="pending">Set Pending</option>
              <option value="overdue">Set Overdue</option>
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setExtendTarget(null)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
            <button type="submit" disabled={adjustMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">Extend</button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
