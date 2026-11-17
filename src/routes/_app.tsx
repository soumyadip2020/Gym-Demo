import { createFileRoute, Outlet, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LayoutDashboard, Calendar, Dumbbell, Apple, LineChart, CreditCard, UserCog, LogOut, Menu, X } from "lucide-react";
import { logoutFn, meFn } from "@/lib/server-fns";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { user } = await meFn();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  component: AppShell,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/check-in", label: "Check-in", icon: Calendar },
  { to: "/workout", label: "AI Workout", icon: Dumbbell },
  { to: "/diet", label: "AI Diet", icon: Apple },
  { to: "/progress", label: "Progress", icon: LineChart },
  { to: "/membership", label: "Membership", icon: CreditCard },
  { to: "/my-trainers", label: "My Trainers", icon: UserCog },
] as const;

function AppShell() {
  const { user } = Route.useRouteContext() as any;
  const logout = useServerFn(logoutFn);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black flex flex-col md:flex-row overflow-hidden">
      {/* Global Background Glow */}
      <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-[150px] rounded-full pointer-events-none z-0" />
      
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-500 ease-in-out transform md:relative md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-full bg-zinc-950/50 backdrop-blur-3xl border-r border-white/5 p-6 flex flex-col relative z-10">
          <Link to="/" className="flex items-center gap-3 font-display font-black text-2xl tracking-tighter uppercase italic mb-12">
            <Dumbbell className="w-8 h-8 text-primary" />
            Fitness <span className="text-white/20">365</span>
          </Link>

          <nav className="flex-1 space-y-2">
            {nav.map((n) => (
              <Link 
                key={n.to} 
                to={n.to} 
                onClick={() => setOpen(false)}
                className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] italic text-white/40 hover:text-primary hover:bg-white/5 transition-all duration-300 group"
                activeProps={{ className: "flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] italic text-primary bg-primary/5 border border-primary/10" }}
              >
                <n.icon className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-4 p-2 rounded-2xl bg-white/5 border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-primary text-black grid place-items-center font-black italic text-lg shadow-lg">
                {(user.name || "U")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-black uppercase tracking-widest text-white truncate italic">{user.name}</div>
                <div className="text-[10px] font-medium text-white/30 truncate">{user.email}</div>
              </div>
            </div>
            <button 
              onClick={async () => { await logout({}); navigate({ to: "/" }); }} 
              className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic text-white/40 hover:text-red-500 hover:bg-red-500/5 transition-all"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 flex flex-col min-h-screen max-h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-6 bg-black/50 backdrop-blur-xl border-b border-white/5">
          <Link to="/" className="flex items-center gap-2 font-display font-black text-lg tracking-tighter uppercase italic">
            <Dumbbell className="w-6 h-6 text-primary" />
            Fitness <span className="text-white/20">365</span>
          </Link>
          <button onClick={() => setOpen(!open)} className="p-3 bg-white/5 rounded-xl border border-white/10">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
          <div className="max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
