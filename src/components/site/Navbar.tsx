import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Zap, Dumbbell } from "lucide-react";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { to: "/", label: "Home" },
    { to: "/pricing", label: "Features" },
    { to: "/trainers", label: "About" },
    { to: "/contact", label: "Contact" },
  ];
  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <nav className="glass-strong rounded-full px-6 py-4 flex items-center justify-between border-white/10 backdrop-blur-3xl">
          <Link to="/" className="flex items-center gap-2 font-display font-black text-xl tracking-tighter uppercase italic">
            <Dumbbell className="w-8 h-8 text-primary" />
            Fitness <span className="text-white/20">365</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-[13px] font-bold uppercase tracking-widest text-white/50 hover:text-primary transition-all duration-300"
                activeProps={{ className: "text-primary" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-[13px] font-bold uppercase tracking-widest text-white/80 hover:text-white transition">Sign In</Link>
            <Link to="/signup" className="bg-primary text-black px-8 py-3 text-[13px] rounded-full font-black uppercase tracking-widest hover:scale-105 transition-transform">Get Started</Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>
        {open && (
          <div className="md:hidden glass-strong rounded-3xl mt-4 p-6 flex flex-col gap-4 border-white/10 animate-in fade-in slide-in-from-top-4">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="text-lg font-bold uppercase tracking-widest border-b border-white/5 pb-2" onClick={() => setOpen(false)}>{l.label}</Link>
            ))}
            <div className="flex flex-col gap-3 mt-4">
              <Link to="/login" className="text-center py-4 text-sm font-bold uppercase tracking-widest border border-white/10 rounded-2xl">Sign In</Link>
              <Link to="/signup" className="text-center bg-primary text-black py-4 text-sm font-black uppercase tracking-widest rounded-2xl">Get Started</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
