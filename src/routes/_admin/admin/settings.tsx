import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, Lock, Save, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { AdminBadge, AdminEmpty, AdminHeader, AdminPanelCard, formatDateTime } from "@/components/admin/AdminUI";
import { adminRevokeSessionFn, adminSettingsFn, adminUpdateSettingsFn } from "@/lib/admin-fns";

export const Route = createFileRoute("/_admin/admin/settings")({ component: AdminSettingsPage });

function AdminSettingsPage() {
  const fetchSettings = useServerFn(adminSettingsFn);
  const updateSettings = useServerFn(adminUpdateSettingsFn);
  const revokeSession = useServerFn(adminRevokeSessionFn);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({ queryKey: ["admin-settings"], queryFn: () => fetchSettings() });

  const [form, setForm] = useState({
    gym_name: "Fitness 365",
    early_warning_days: 3,
    inactive_days: 7,
    high_priority_days: 14,
    critical_days: 30,
    expiry_alert_days: 7,
    whatsapp_template: "",
    renewal_template: "",
  });

  useEffect(() => {
    if (data?.settings) {
      setForm({
        gym_name: data.settings.gym_name || "Fitness 365",
        early_warning_days: Number(data.settings.early_warning_days || 3),
        inactive_days: Number(data.settings.inactive_days || 7),
        high_priority_days: Number(data.settings.high_priority_days || 14),
        critical_days: Number(data.settings.critical_days || 30),
        expiry_alert_days: Number(data.settings.expiry_alert_days || 7),
        whatsapp_template: data.settings.whatsapp_template || "",
        renewal_template: data.settings.renewal_template || "",
      });
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => updateSettings({ data: form }),
    onSuccess: () => {
      toast.success("Gym settings & thresholds updated");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-inactive"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update settings"),
  });

  const revokeMut = useMutation({
    mutationFn: (tokenPrefix: string) => revokeSession({ data: { tokenPrefix } }),
    onSuccess: () => {
      toast.success("Admin session revoked");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to revoke session"),
  });

  if (error) {
    return (
      <div className="py-16 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
        <div className="font-display text-xl font-bold uppercase text-white">Owner Authorization Required</div>
        <p className="text-xs text-white/50">{(error as any)?.message || "Only the Gym Owner can manage system settings and security logs."}</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return <div className="py-20 text-center text-xs uppercase tracking-widest text-white/40">Loading Security & Settings...</div>;
  }

  const { logs, sessions, envStatus } = data;

  return (
    <div className="space-y-6 pb-12">
      <AdminHeader
        eyebrow="Owner Security & Controls"
        title="Settings &"
        accent="Audit Logs"
        subtitle="Configure retention thresholds, communication templates, active sessions, and immutable audit history."
      />

      {/* Security Environment Checks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-950/90 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl grid place-items-center ${envStatus.adminCodeConfigured ? "bg-primary/15 text-primary" : "bg-red-500/15 text-red-400"}`}>
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-white/50">GYM_ADMIN_ACCESS_CODE</div>
            <div className="text-sm font-black text-white mt-0.5 flex items-center gap-1.5">
              {envStatus.adminCodeConfigured ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-primary" /> 6-Digit Env Configured
                </>
              ) : (
                "Missing / Invalid Env"
              )}
            </div>
          </div>
        </div>

        <div className="bg-zinc-950/90 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl grid place-items-center ${envStatus.razorpayConfigured ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-300"}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-white/50">Razorpay Keys</div>
            <div className="text-sm font-black text-white mt-0.5">
              {envStatus.razorpayConfigured ? "Live Verification Active" : "Not Configured in Env"}
            </div>
          </div>
        </div>

        <div className="bg-zinc-950/90 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl grid place-items-center ${envStatus.webhookConfigured ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-300"}`}>
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-white/50">Razorpay Webhook Secret</div>
            <div className="text-sm font-black text-white mt-0.5">
              {envStatus.webhookConfigured ? "HMAC Signature Active" : "Optional Env Not Set"}
            </div>
          </div>
        </div>
      </div>

      {/* Gym & Retention Thresholds Form */}
      <AdminPanelCard title="Retention & Operational Thresholds" subtitle="Controls Inactive Member alerts, expiry warnings, and WhatsApp reminder templates">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMut.mutate();
          }}
          className="space-y-5 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1.5">Gym Display Name</span>
              <input
                value={form.gym_name}
                onChange={(e) => setForm({ ...form, gym_name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white"
                required
              />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1.5">Early Warning (Days Inactive)</span>
              <input
                type="number"
                min={1}
                max={30}
                value={form.early_warning_days}
                onChange={(e) => setForm({ ...form, early_warning_days: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white"
              />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1.5">Inactive Tier (Days)</span>
              <input
                type="number"
                min={2}
                max={60}
                value={form.inactive_days}
                onChange={(e) => setForm({ ...form, inactive_days: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white"
              />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1.5">High Priority Tier (Days)</span>
              <input
                type="number"
                min={3}
                max={90}
                value={form.high_priority_days}
                onChange={(e) => setForm({ ...form, high_priority_days: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white"
              />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1.5">Critical Risk Tier (Days)</span>
              <input
                type="number"
                min={5}
                max={180}
                value={form.critical_days}
                onChange={(e) => setForm({ ...form, critical_days: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white"
              />
            </label>
            <label>
              <span className="text-white/60 font-bold uppercase block mb-1.5">Membership Expiry Alert Window (Days)</span>
              <input
                type="number"
                min={1}
                max={60}
                value={form.expiry_alert_days}
                onChange={(e) => setForm({ ...form, expiry_alert_days: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-white/60 font-bold uppercase block mb-1.5">
                WhatsApp Inactivity Template (supports {"{{name}}"}, {"{{days}}"}, {"{{gym_name}}"})
              </span>
              <textarea
                rows={3}
                value={form.whatsapp_template}
                onChange={(e) => setForm({ ...form, whatsapp_template: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white"
              />
            </label>
            <label className="block">
              <span className="text-white/60 font-bold uppercase block mb-1.5">
                Renewal Reminder Template (supports {"{{name}}"}, {"{{plan}}"}, {"{{expiry}}"})
              </span>
              <textarea
                rows={3}
                value={form.renewal_template}
                onChange={(e) => setForm({ ...form, renewal_template: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-black font-black uppercase tracking-wider hover:brightness-105 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saveMut.isPending ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </AdminPanelCard>

      {/* Active Admin Sessions */}
      <AdminPanelCard title={`Active Admin & Staff Sessions (${sessions.length})`} subtitle="Revoke active HTTP-only sessions immediately">
        {sessions.length === 0 ? (
          <AdminEmpty message="No active sessions." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[680px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase text-white/45">
                  <th className="py-3">Actor</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">IP Address</th>
                  <th className="py-3">Session Token</th>
                  <th className="py-3">Expires</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sessions.map((s: any) => (
                  <tr key={s.tokenPreview + s.created_at}>
                    <td className="py-3 font-bold text-white">{s.actor_name}</td>
                    <td className="py-3"><AdminBadge status={s.role === "owner" ? "active" : "free"} label={s.role} /></td>
                    <td className="py-3 text-white/60 font-mono">{s.ip_address || "unknown"}</td>
                    <td className="py-3 text-white/50 font-mono">{s.tokenPreview}</td>
                    <td className="py-3 text-white/60">{formatDateTime(s.expires_at)}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => revokeMut.mutate(s.tokenPreview)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 font-bold uppercase text-[10px]"
                      >
                        <Trash2 className="w-3 h-3" /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanelCard>

      {/* Audit Logs */}
      <AdminPanelCard title="Security & Operational Audit Logs" subtitle="Immutable trail of logins, lockouts, refunds, attendance corrections, and changes">
        {logs.length === 0 ? (
          <AdminEmpty message="No activity logs recorded yet." />
        ) : (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs min-w-[780px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase text-white/45 sticky top-0 bg-zinc-950">
                  <th className="py-3">Timestamp</th>
                  <th className="py-3">Actor</th>
                  <th className="py-3">Action</th>
                  <th className="py-3">Target</th>
                  <th className="py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((l: any) => (
                  <tr key={l.id}>
                    <td className="py-2.5 text-white/55 whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                    <td className="py-2.5 font-bold text-white">
                      {l.actor_name} <span className="text-[10px] text-white/40 uppercase">({l.actor_role})</span>
                    </td>
                    <td className="py-2.5">
                      <AdminBadge
                        status={l.action.includes("failed") || l.action.includes("deleted") || l.action.includes("refunded") ? "overdue" : "active"}
                        label={l.action}
                      />
                    </td>
                    <td className="py-2.5 text-white/60">
                      {l.target_type ? `${l.target_type}${l.target_id ? ` #${l.target_id}` : ""}` : "—"}
                    </td>
                    <td className="py-2.5 text-white/50 font-mono text-[11px] max-w-xs truncate">
                      {l.details ? JSON.stringify(l.details) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanelCard>
    </div>
  );
}
