import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArchiveRestore, Eye, Plus, Search, Trash2, UserPlus } from "lucide-react";
import {
  AdminBadge,
  AdminEmpty,
  AdminHeader,
  AdminModal,
  AdminPanelCard,
  ConfirmModal,
  formatDate,
} from "@/components/admin/AdminUI";
import { adminArchiveMemberFn, adminCreateMemberFn, adminMembersListFn } from "@/lib/admin-fns";

export const Route = createFileRoute("/_admin/admin/members/")({ component: AdminMembersPage });

function AdminMembersPage() {
  const listMembers = useServerFn(adminMembersListFn);
  const createMember = useServerFn(adminCreateMemberFn);
  const archiveMember = useServerFn(adminArchiveMemberFn);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [membershipStatus, setMembershipStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: number; name: string; mode: "archive" | "restore" } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-members", { search, membershipStatus, paymentStatus, dateFilter, activityFilter, page }],
    queryFn: () =>
      listMembers({
        data: { search, membershipStatus, paymentStatus, dateFilter, activityFilter, page, pageSize: 15 },
      }),
  });

  const createMut = useMutation({
    mutationFn: (payload: any) => createMember({ data: payload }),
    onSuccess: () => {
      toast.success("Member created successfully");
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-members"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to add member"),
  });

  const archiveMut = useMutation({
    mutationFn: (vars: { memberId: number; mode: "archive" | "restore" }) => archiveMember({ data: vars }),
    onSuccess: () => {
      toast.success("Member status updated");
      setConfirmTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-members"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e?.message || "Action failed"),
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => {
      const v = String(f.get(k) || "").trim();
      return v ? Number(v) : undefined;
    };
    createMut.mutate({
      name: String(f.get("name")),
      email: String(f.get("email")),
      phone: String(f.get("phone") || "") || undefined,
      password: String(f.get("password")),
      height_cm: num("height_cm"),
      weight_kg: num("weight_kg"),
      age: num("age"),
      gender: String(f.get("gender") || "") || undefined,
      initial_plan: String(f.get("initial_plan") || "none"),
      payment_status: String(f.get("payment_status") || "pending") as "paid" | "pending" | "free",
      payment_method: String(f.get("payment_method") || "cash"),
      notes: String(f.get("notes") || "") || undefined,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <AdminHeader
        eyebrow="Directory & Lifecycle"
        title="Member"
        accent="Management"
        subtitle="Search, filter, onboard, and manage every registered athlete and membership."
        actions={
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider hover:brightness-105 transition"
          >
            <UserPlus className="w-4 h-4" /> Add Member
          </button>
        }
      />

      {/* Search & Filters */}
      <AdminPanelCard title="Search & Filters" subtitle={data ? `${data.total} matching members` : "Loading..."}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-1">
            <Search className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, email or phone..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white outline-none focus:border-primary"
            />
          </div>
          <select
            value={membershipStatus}
            onChange={(e) => {
              setMembershipStatus(e.target.value);
              setPage(1);
            }}
            className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-primary"
          >
            <option value="all">Membership: All</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="paused">Paused / Frozen</option>
            <option value="inactive">Deactivated</option>
            <option value="none">No Plan</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-primary"
          >
            <option value="all">Payment: All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="free">Free / Trial</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-primary"
          >
            <option value="all">Registered: All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <select
            value={activityFilter}
            onChange={(e) => {
              setActivityFilter(e.target.value);
              setPage(1);
            }}
            className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-primary"
          >
            <option value="all">Activity: All</option>
            <option value="active_7d">Visited Last 7 Days</option>
            <option value="inactive">At-Risk / Inactive</option>
            <option value="never">Never Checked In</option>
          </select>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-white/40 uppercase tracking-widest">Loading members...</div>
          ) : !data || data.items.length === 0 ? (
            <AdminEmpty message="No members match the selected filters." />
          ) : (
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/45">
                  <th className="py-3 pr-4">Member</th>
                  <th className="py-3 px-3">Registered</th>
                  <th className="py-3 px-3">Plan</th>
                  <th className="py-3 px-3">Start / Expiry</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Last Visit</th>
                  <th className="py-3 px-3">Visits</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {data.items.map((m: any) => (
                  <tr key={m.id} className="hover:bg-white/[0.03] transition">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 text-primary font-black grid place-items-center shrink-0">
                          {(m.name || "M")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white">{m.name}</div>
                          <div className="text-[11px] text-white/45">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-white/70">{formatDate(m.created_at)}</td>
                    <td className="py-3.5 px-3 font-bold uppercase text-white/90">{m.membership_plan || "—"}</td>
                    <td className="py-3.5 px-3 text-white/65">
                      {m.membership_start ? `${formatDate(m.membership_start)} → ${formatDate(m.membership_expiry)}` : "—"}
                    </td>
                    <td className="py-3.5 px-3">
                      <AdminBadge status={m.paymentStatus} />
                    </td>
                    <td className="py-3.5 px-3 text-white/70">
                      {m.last_visit ? formatDate(m.last_visit) : "Never"}
                      <div className="text-[10px] text-white/40">{m.daysSinceVisit}d ago</div>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-white">{m.attendance_count}</td>
                    <td className="py-3.5 px-3">
                      <AdminBadge status={m.membershipStatus} />
                    </td>
                    <td className="py-3.5 pl-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to="/admin/members/$memberId"
                          params={{ memberId: String(m.id) }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-primary hover:text-black text-[11px] font-bold transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Profile
                        </Link>
                        {m.status === "archived" ? (
                          <button
                            onClick={() => setConfirmTarget({ id: m.id, name: m.name, mode: "restore" })}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-emerald-400 transition"
                            title="Restore Member"
                          >
                            <ArchiveRestore className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmTarget({ id: m.id, name: m.name, mode: "archive" })}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-red-400 transition"
                            title="Archive Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between pt-5 mt-5 border-t border-white/10 text-xs text-white/50">
            <span>
              Page {data.page} of {data.totalPages} ({data.total} total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-white/10 disabled:opacity-40 hover:bg-white/5"
              >
                Prev
              </button>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-white/10 disabled:opacity-40 hover:bg-white/5"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </AdminPanelCard>

      {/* Add Member Modal */}
      <AdminModal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Gym Member" subtitle="Create an account and optionally assign an initial membership plan" wide>
        <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <label className="block">
            <span className="font-bold uppercase tracking-wider text-white/60 block mb-1">Full Name *</span>
            <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="font-bold uppercase tracking-wider text-white/60 block mb-1">Email *</span>
            <input name="email" type="email" required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="font-bold uppercase tracking-wider text-white/60 block mb-1">Phone</span>
            <input name="phone" placeholder="+91 ..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="font-bold uppercase tracking-wider text-white/60 block mb-1">Temp Password *</span>
            <input name="password" type="password" minLength={6} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="font-bold uppercase tracking-wider text-white/60 block mb-1">Height (cm)</span>
            <input name="height_cm" type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="font-bold uppercase tracking-wider text-white/60 block mb-1">Weight (kg)</span>
            <input name="weight_kg" type="number" step="0.1" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="font-bold uppercase tracking-wider text-white/60 block mb-1">Initial Plan</span>
            <select name="initial_plan" defaultValue="monthly" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-primary">
              <option value="none">No Plan Yet</option>
              <option value="trial">Free Trial (7 days)</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </label>
          <label className="block">
            <span className="font-bold uppercase tracking-wider text-white/60 block mb-1">Payment Status</span>
            <select name="payment_status" defaultValue="paid" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-primary">
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="free">Free / Complimentary</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="font-bold uppercase tracking-wider text-white/60 block mb-1">Notes</span>
            <textarea name="notes" rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-primary" />
          </label>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2.5 rounded-xl border border-white/10 text-white/70 font-bold uppercase">
              Cancel
            </button>
            <button type="submit" disabled={createMut.isPending} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black font-black uppercase">
              <Plus className="w-4 h-4" /> {createMut.isPending ? "Creating..." : "Create Member"}
            </button>
          </div>
        </form>
      </AdminModal>

      <ConfirmModal
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && archiveMut.mutate({ memberId: confirmTarget.id, mode: confirmTarget.mode })}
        title={confirmTarget?.mode === "restore" ? "Restore Member" : "Archive Member"}
        description={
          confirmTarget?.mode === "restore"
            ? `Restore ${confirmTarget?.name} back to active directory?`
            : `Archive ${confirmTarget?.name}? This preserves all payment, attendance, and membership records while revoking member login access.`
        }
        confirmLabel={confirmTarget?.mode === "restore" ? "Restore" : "Archive"}
        danger={confirmTarget?.mode === "archive"}
        busy={archiveMut.isPending}
      />
    </div>
  );
}
