import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Dumbbell, ArrowRight, Mail, Lock, User } from "lucide-react";
import { signupFn, meFn } from "@/lib/server-fns";
import { motion } from "framer-motion";

export const Route = createFileRoute("/signup")({
  beforeLoad: async ({ context }) => {
    const { user } = await context.queryClient.ensureQueryData({
      queryKey: ["me"],
      queryFn: () => meFn(),
      staleTime: 5 * 60_000,
    });
    if (user) throw redirect({ to: "/dashboard" });
  },
  component: SignupPage,
});

function SignupPage() {
  const signup = useServerFn(signupFn);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-black selection:bg-primary selection:text-black">
      {/* Background with Blur */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/images/gym-bg.jpg" 
          alt="Background" 
          className="w-full h-full object-cover opacity-30 grayscale blur-[10px]"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <Link to="/" className="flex items-center justify-center gap-2 font-display font-black text-2xl tracking-tighter uppercase italic mb-10 group">
          <Dumbbell className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
          Fitness <span className="text-white/20">365</span>
        </Link>

        <form 
          className="glass-strong rounded-[2.5rem] p-10 border border-white/10 backdrop-blur-3xl shadow-2xl space-y-6"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            try {
              await signup({ data: { name: String(f.get("name")), email: String(f.get("email")), password: String(f.get("password")) } });
              await qc.invalidateQueries({ queryKey: ["me"] });
              qc.removeQueries({ queryKey: ["dashboard"] });
              toast.success("Welcome to the Elite, " + f.get("name") + "!");
              navigate({ to: "/dashboard" });
            } catch (err: any) { toast.error(err?.message || "Signup failed"); }
            finally { setBusy(false); }
          }}
        >
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-black uppercase italic tracking-tighter">Register</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mt-2">Start Your Transformation</p>
          </div>

          <div className="space-y-4">
            <Field name="name" label="Full Name" icon={<User className="w-4 h-4" />} required />
            <Field name="email" label="Email Address" type="email" icon={<Mail className="w-4 h-4" />} required />
            <Field name="password" label="Password (min 6)" type="password" icon={<Lock className="w-4 h-4" />} minLength={6} required />
          </div>

          <div className="pt-4">
            <button 
              disabled={busy} 
              className="w-full bg-primary text-black rounded-2xl py-5 font-black uppercase tracking-[0.3em] italic text-xs hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(var(--primary),0.2)]"
            >
              {busy ? "Creating Account..." : "Create Account"}
              {!busy && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-center text-[10px] uppercase font-black tracking-widest text-white/30 pt-4">
            Already a member? <Link to="/login" className="text-primary hover:underline">Sign In</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}

function Field({ label, icon, ...props }: any) {
  return (
    <label className="block group">
      <div className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-2 ml-1">{label}</div>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
          {icon}
        </div>
        <input 
          {...props} 
          className="w-full bg-white/5 border border-white/5 rounded-2xl pl-14 pr-6 py-5 outline-none focus:border-primary/50 focus:bg-white/10 transition-all font-bold text-sm text-white placeholder:text-white/10" 
        />
      </div>
    </label>
  );
}
