import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarCheck,
  CreditCard,
  Dumbbell,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
  Wallet,
  X,
} from "lucide-react";
import { adminLogoutFn, adminMeFn } from "@/lib/admin-fns";

export const Route = createFileRoute("/_admin")({
  beforeLoad: async ({ context, location }) => {
    const { admin } = await context.queryClient.fetchQuery({
      queryKey: ["admin-me"],
      queryFn: () => adminMeFn(),
      staleTime: 60_000,
    });
    const isAdminRoot = location.pathname === "/admin" || location.pathname === "/admin/";
    if (!admin && !isAdminRoot) {
      throw redirect({ to: "/admin" });
    }
    return { admin };
  },
  component: AdminLayout,
});

const ADMIN_NAV = [
  { to: "/admin", perm: "overview", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/members", perm: "members", label: "Members", icon: Users },
  { to: "/admin/attendance", perm: "attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/admin/inactive", perm: "inactive", label: "Inactive Members", icon: UserX },
  { to: "/admin/memberships", perm: "memberships", label: "Memberships", icon: CreditCard },
  { to: "/admin/payments", perm: "payments", label: "Payments", icon: Wallet },
  { to: "/admin/trainers", perm: "trainers", label: "Trainers & Staff", icon: UserCheck },
  { to: "/admin/finance", perm: "finance", label: "Revenue & Expenses", icon: BarChart3 },
  { to: "/admin/reports", perm: "reports", label: "Reports", icon: FileBarChart2 },
  { to: "/admin/settings", perm: "settings", label: "Settings", icon: Settings, ownerOnly: true },
] as const;

function AdminLayout() {
  const { admin } = Route.useRouteContext() as any;
  const logout = useServerFn(adminLogoutFn);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!admin) {
    return <Outlet />;
  }

  const visibleNav = ADMIN_NAV.filter((item) => {
    if ("ownerOnly" in item && item.ownerOnly && admin.role !== "owner") return false;
    if (admin.role === "owner") return true;
    return Array.isArray(admin.permissions) && admin.permissions.includes(item.perm);
  });

  const handleLogout = async () => {
    await logout({});
    await qc.cancelQueries();
    qc.setQueryData(["admin-me"], { admin: null });
    await router.invalidate();
    await navigate({ to: "/admin", replace: true });
    qc.removeQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("admin-") && q.queryKey[0] !== "admin-me" });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-white/10 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2.5 font-display font-black text-xl tracking-tighter uppercase italic">
            <Dumbbell className="w-7 h-7 text-primary" />
            <span>
              Fitness <span className="text-white/30">365</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5">
          <ShieldCheck className="w-3.5 h-3.5" />
          Owner Command Suite
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {visibleNav.map((item) => {
            const active =
              "exact" in item && item.exact
                ? pathname === "/admin" || pathname === "/admin/"
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as any}
                preload="intent"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                  active
                    ? "bg-primary text-black font-black shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary text-black font-black grid place-items-center text-sm">
              {(admin.actor_name || "A")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{admin.actor_name}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">{admin.role}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              to="/"
              className="flex-1 text-center py-2.5 rounded-xl border border-white/10 text-[11px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 transition"
            >
              Public Site
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-500/20 text-[11px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3.5 bg-zinc-950 border-b border-white/10 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
            <Activity className="w-4 h-4 text-primary" /> Admin Command
          </div>
          <button onClick={handleLogout} className="p-2 text-white/60 hover:text-red-400" aria-label="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 p-5 sm:p-8 lg:p-10 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/75 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
