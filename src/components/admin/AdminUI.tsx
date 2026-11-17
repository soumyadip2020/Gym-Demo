import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function formatINR(value: unknown): string {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN")}`;
}

export function formatDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AdminHeader({
  eyebrow,
  title,
  accent,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-white/10">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-primary mb-2">{eyebrow}</div>
        <h1 className="font-display text-2xl sm:text-4xl font-black uppercase tracking-tight leading-none">
          {title} {accent && <span className="text-primary">{accent}</span>}
        </h1>
        {subtitle && <p className="text-sm text-white/50 mt-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function AdminKpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  to,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  tone?: "default" | "primary" | "warning" | "danger" | "info";
  to?: string;
}) {
  const toneClasses = {
    default: "border-white/10 hover:border-white/25",
    primary: "border-primary/25 hover:border-primary/50",
    warning: "border-amber-500/25 hover:border-amber-500/50",
    danger: "border-red-500/30 hover:border-red-500/60",
    info: "border-cyan-400/25 hover:border-cyan-400/50",
  }[tone];

  const iconTone = {
    default: "text-white/70 bg-white/5",
    primary: "text-primary bg-primary/10",
    warning: "text-amber-400 bg-amber-500/10",
    danger: "text-red-400 bg-red-500/10",
    info: "text-cyan-400 bg-cyan-500/10",
  }[tone];

  const inner = (
    <div className={`bg-zinc-950/90 border ${toneClasses} rounded-2xl p-5 transition-all h-full flex flex-col justify-between`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconTone}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-4">
        <div className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">{value}</div>
        {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to as any} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function AdminPanelCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-zinc-950/90 border border-white/10 rounded-2xl p-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-tight text-white">{title}</h2>
          {subtitle && <p className="text-xs text-white/45 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const BADGE_STYLES: Record<string, string> = {
  active: "bg-primary/15 text-primary border-primary/30",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  free: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  early_warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  within_7_days: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  within_30_days: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  within_3_days: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  expiring_today: "bg-red-500/15 text-red-400 border-red-500/30",
  inactive: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  high_priority: "bg-red-500/15 text-red-300 border-red-500/30",
  critical: "bg-red-600/25 text-red-300 border-red-500/50",
  overdue: "bg-red-500/15 text-red-400 border-red-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  paused: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  refunded: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  archived: "bg-zinc-700/30 text-zinc-400 border-zinc-600/40",
  none: "bg-white/5 text-white/40 border-white/10",
};

export function AdminBadge({ status, label }: { status: string; label?: string }) {
  const key = String(status || "none").toLowerCase();
  const cls = BADGE_STYLES[key] || "bg-white/10 text-white/70 border-white/15";
  const text = label || key.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {text}
    </span>
  );
}

export function AdminModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} bg-zinc-950 border border-white/15 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/10">
          <div>
            <h3 className="font-display text-lg font-bold uppercase tracking-tight text-white">{title}</h3>
            {subtitle && <p className="text-xs text-white/50 mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <AdminModal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-white/70 leading-relaxed">{description}</p>
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-wider text-white/70 hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition disabled:opacity-50 ${
            danger ? "bg-red-600 text-white hover:bg-red-500" : "bg-primary text-black hover:brightness-105"
          }`}
        >
          {busy ? "Processing..." : confirmLabel}
        </button>
      </div>
    </AdminModal>
  );
}

export function AdminEmpty({ message }: { message: string }) {
  return (
    <div className="py-12 text-center border border-dashed border-white/10 rounded-xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{message}</p>
    </div>
  );
}
