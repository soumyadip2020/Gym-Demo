import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Mail, MessageSquare, Phone, Plus, Settings, UserX } from "lucide-react";
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
import { adminAddFollowupFn, adminInactiveMembersFn, adminUpdateFollowupFn } from "@/lib/admin-fns";

export const Route = createFileRoute("/_admin/admin/inactive")({ component: AdminInactivePage });

function AdminInactivePage() {
  const fetchInactive = useServerFn(adminInactiveMembersFn);
  const addFollowup = useServerFn(adminAddFollowupFn);
  const updateFollowup = useServerFn(adminUpdateFollowupFn);
  const qc = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [noteModal, setNoteModal] = useState<any | null>(null);
  const [waModal, setWaModal] = useState<any | null>(null);
  const [waConsentConfirmed, setWaConsentConfirmed] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["admin-inactive"], queryFn: () => fetchInactive() });

  const addMut = useMutation({
    mutationFn: (payload: any) => addFollowup({ data: payload }),
    onSuccess: () => {
      toast.success("Follow-up logged");
      setNoteModal(null);
      qc.invalidateQueries({ queryKey: ["admin-inactive"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to log follow-up"),
  });

  const updMut = useMutation({
    mutationFn: (payload: any) => updateFollowup({ data: payload }),
    onSuccess: () => {
      toast.success("Follow-up status updated");
      qc.invalidateQueries({ queryKey: ["admin-inactive"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update"),
  });

  if (isLoading || !data) {
    return <div className="py-20 text-center text-xs uppercase tracking-widest text-white/40">Scanning Attendance Gaps...</div>;
  }

  const { settings, members, followups } = data;
  const counts = {
    early_warning: members.filter((m: any) => m.category === "early_warning").length,
    inactive: members.filter((m: any) => m.category === "inactive").length,
    high_priority: members.filter((m: any) => m.category === "high_priority").length,
    critical: members.filter((m: any) => m.category === "critical").length,
  };

  const filtered = categoryFilter === "all" ? members : members.filter((m: any) => m.category === categoryFilter);

  const renderTemplate = (memberName: string) =>
    String(settings.whatsapp_template || "").replace(/\{name\}/gi, memberName.split(" ")[0] || memberName);

  return (
    <div className="space-y-6 pb-12">
      <AdminHeader
        eyebrow="Smart Retention Engine"
        title="Inactive"
        accent="Members"
        subtitle={`Automatic inactivity detection (${settings.early_warning_days}d / ${settings.inactive_days}d / ${settings.high_priority_days}d / ${settings.critical_days}d thresholds).`}
        actions={
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase hover:border-primary/50 hover:text-primary"
          >
            <Settings className="w-4 h-4" /> Edit Thresholds & Templates
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpiCard label={`Early Warning (${settings.early_warning_days}d+)`} value={counts.early_warning} sub="Check in gently" icon={AlertCircle} tone="warning" />
        <AdminKpiCard label={`Inactive (${settings.inactive_days}d+)`} value={counts.inactive} sub="Needs outreach" icon={UserX} tone="warning" />
        <AdminKpiCard label={`High Priority (${settings.high_priority_days}d+)`} value={counts.high_priority} sub="Call or WhatsApp" icon={Phone} tone="danger" />
        <AdminKpiCard label={`Critical Alert (${settings.critical_days}d+)`} value={counts.critical} sub="Churn risk" icon={AlertCircle} tone="danger" />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: `All (${members.length})` },
          { id: "early_warning", label: `Early Warning (${counts.early_warning})` },
          { id: "inactive", label: `Inactive (${counts.inactive})` },
          { id: "high_priority", label: `High Priority (${counts.high_priority})` },
          { id: "critical", label: `Critical (${counts.critical})` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setCategoryFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              categoryFilter === f.id ? "bg-primary text-black" : "bg-white/5 text-white/60 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Inactive Members Table */}
      <AdminPanelCard title="At-Risk Members Queue" subtitle="Click Call, WhatsApp Reminder, or Follow-Up to record outreach">
        {filtered.length === 0 ? (
          <AdminEmpty message="Zero members in this inactivity tier. Great retention!" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[920px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase text-white/45">
                  <th className="py-3">Member</th>
                  <th className="py-3">Last Visit</th>
                  <th className="py-3">Absent</th>
                  <th className="py-3">Frequency</th>
                  <th className="py-3">Expiry</th>
                  <th className="py-3">Payment</th>
                  <th className="py-3">Category</th>
                  <th className="py-3 text-right">Outreach Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((m: any) => (
                  <tr key={m.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5">
                      <Link to="/admin/members/$memberId" params={{ memberId: String(m.id) }} className="font-bold text-white hover:text-primary">
                        {m.name}
                      </Link>
                      <div className="text-[11px] text-white/45">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
                      {m.latest_note && <div className="text-[11px] text-primary/80 mt-0.5 truncate max-w-xs">Note: {m.latest_note}</div>}
                    </td>
                    <td className="py-3.5 text-white/70">{m.last_visit ? formatDate(m.last_visit) : "Never"}</td>
                    <td className="py-3.5 font-black text-amber-300">{m.days_since_visit} days</td>
                    <td className="py-3.5 text-white/70">{m.attendance_frequency}</td>
                    <td className="py-3.5 text-white/70">{m.membership_expiry ? formatDate(m.membership_expiry) : "None"}</td>
                    <td className="py-3.5"><AdminBadge status={m.payment_status || "none"} /></td>
                    <td className="py-3.5"><AdminBadge status={m.category} /></td>
                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {m.phone && (
                          <a
                            href={`tel:${m.phone}`}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80"
                            title="Call Member"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <a
                          href={`mailto:${m.email}?subject=${encodeURIComponent("We miss you at Fitness 365!")}&body=${encodeURIComponent(renderTemplate(m.name))}`}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80"
                          title="Email Member"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => {
                            setWaConsentConfirmed(false);
                            setWaModal(m);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold"
                          title="Prepare WhatsApp Reminder"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </button>
                        <button
                          onClick={() => setNoteModal(m)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-black font-black"
                        >
                          <Plus className="w-3.5 h-3.5" /> Note
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

      {/* Follow-ups History */}
      <AdminPanelCard title="Retention Follow-Up Log" subtitle="Pending & completed outreach tasks">
        {followups.length === 0 ? (
          <AdminEmpty message="No retention follow-ups recorded yet." />
        ) : (
          <div className="space-y-2.5">
            {followups.map((f: any) => (
              <div key={f.id} className="p-3.5 rounded-xl bg-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{f.member_name}</span>
                    <AdminBadge status={f.status} />
                    <span className="text-[10px] uppercase font-bold text-primary">{f.channel}</span>
                  </div>
                  <p className="text-white/75 mt-1">{f.note}</p>
                  <div className="text-[11px] text-white/40 mt-0.5">
                    By {f.created_by} · {formatDateTime(f.created_at)}
                    {f.scheduled_for ? ` · Next Follow-up: ${formatDate(f.scheduled_for)}` : ""}
                  </div>
                </div>
                <button
                  disabled={updMut.isPending}
                  onClick={() => updMut.mutate({ id: f.id, status: f.status === "pending" ? "completed" : "pending" })}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 hover:border-primary hover:text-primary font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {f.status === "pending" ? "Mark Completed" : "Reopen"}
                </button>
              </div>
            ))}
          </div>
        )}
      </AdminPanelCard>

      {/* Add Follow-up Note Modal */}
      <AdminModal open={Boolean(noteModal)} onClose={() => setNoteModal(null)} title={`Log Follow-Up — ${noteModal?.name || ""}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            addMut.mutate({
              userId: noteModal.id,
              channel: String(f.get("channel")) as any,
              inactivityTier: noteModal.category,
              note: String(f.get("note")),
              status: String(f.get("status")) as any,
              scheduledFor: String(f.get("scheduledFor") || "") || undefined,
            });
          }}
          className="space-y-4 text-xs"
        >
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Channel</span>
            <select name="channel" defaultValue="call" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
              <option value="call">Phone Call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="note">Internal Note</option>
            </select>
          </label>
          <label className="block">
            <span className="text-white/60 font-bold uppercase block mb-1">Follow-Up Note *</span>
            <textarea name="note" required rows={3} placeholder="Spoke with member, returning tomorrow at 7 AM..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-white/60 font-bold uppercase block mb-1">Status</span>
              <select name="status" defaultValue="pending" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-white">
                <option value="pending">Schedule Follow-Up</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="block">
              <span className="text-white/60 font-bold uppercase block mb-1">Next Follow-Up Date</span>
              <input name="scheduledFor" type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setNoteModal(null)} className="px-4 py-2 rounded-xl border border-white/10">Cancel</button>
            <button type="submit" disabled={addMut.isPending} className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase">Save Note</button>
          </div>
        </form>
      </AdminModal>

      {/* Manual WhatsApp Reminder Modal (explicit consent check; never automated) */}
      <AdminModal
        open={Boolean(waModal)}
        onClose={() => setWaModal(null)}
        title={`WhatsApp Reminder — ${waModal?.name || ""}`}
        subtitle="Manual outreach only — messages are never sent automatically without member consent & WhatsApp Business setup."
      >
        {waModal && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white/85 leading-relaxed">
              {renderTemplate(waModal.name)}
            </div>
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={waConsentConfirmed}
                onChange={(e) => setWaConsentConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>I confirm this member has opted into WhatsApp communications and I want to open this pre-filled reminder manually.</span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(renderTemplate(waModal.name));
                  toast.success("Template copied to clipboard");
                }}
                className="px-4 py-2 rounded-xl border border-white/10 font-bold"
              >
                Copy Text
              </button>
              <button
                type="button"
                disabled={!waConsentConfirmed}
                onClick={() => {
                  const phone = String(waModal.phone || "").replace(/\D/g, "");
                  const url = `https://wa.me/${phone}?text=${encodeURIComponent(renderTemplate(waModal.name))}`;
                  addMut.mutate({
                    userId: waModal.id,
                    channel: "whatsapp",
                    inactivityTier: waModal.category,
                    note: "Prepared manual WhatsApp retention reminder",
                    status: "completed",
                  });
                  window.open(url, "_blank", "noopener,noreferrer");
                  setWaModal(null);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-black uppercase disabled:opacity-40"
              >
                Open WhatsApp & Log
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
