import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ShieldCheck, ArrowRight, Zap, CreditCard, Clock } from "lucide-react";
import { dashboardFn } from "@/lib/server-fns";
import { safeMemberQuery } from "@/lib/safe-query";
import { usePay } from "@/lib/use-pay";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/membership")({ component: MembershipPage });

const PLANS = [
  { id: "trial", name: "Free Trial", price: 0, period: "7 days", desc: "Elite Entry", features: ["Full AI Dashboard","Basic Analytics","Community Support"] },
  { id: "monthly", name: "Monthly", price: 999, period: "/mo", desc: "Flexible Core", features: ["Everything in Trial","Trainer Direct Chat","Priority AI Engine"] },
  { id: "quarterly", name: "Quarterly", price: 2499, period: "/3mo", desc: "The Athlete's Choice", features: ["Save 16%","Custom Bio-Metrics","Priority Support Hub"], highlight: true },
  { id: "annual", name: "Annual", price: 7999, period: "/yr", desc: "Peak Evolution", features: ["Save 33%","All Feature Unlocks","Free Trainer Sessions"] },
];

function MembershipPage() {
  const fetchDash = useServerFn(dashboardFn);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: safeMemberQuery(() => fetchDash(), qc) });
  const pay = usePay();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.3em] text-white/40 mb-2 italic">Subscription Matrix</div>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            Membership <span className="text-primary">Status</span>
          </h1>
        </div>
      </div>

      {data?.membership && (
        <div className="bg-zinc-950 border border-white/5 rounded-[3rem] p-10 flex flex-wrap items-center gap-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 text-white/5 group-hover:text-primary/10 transition-colors">
            <ShieldCheck className="w-24 h-24" />
          </div>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-primary text-black flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.3)]">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-1 italic">Active Protocol</div>
              <div className="font-display text-3xl font-black uppercase italic tracking-tighter text-white group-hover:text-primary transition-colors">
                {data.membership.plan} Edition
              </div>
            </div>
          </div>

          <div className="flex gap-10 relative z-10">
            <div>
              <div className="text-[9px] uppercase font-black tracking-widest text-white/20 mb-2 italic flex items-center gap-2">
                <Clock className="w-3 h-3" /> Termination Date
              </div>
              <div className="text-xs font-black uppercase tracking-widest italic text-white/60">
                {new Date(data.membership.ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase font-black tracking-widest text-white/20 mb-2 italic flex items-center gap-2">
                <Zap className="w-3 h-3" /> Auto-Renewal
              </div>
              <div className={`text-xs font-black uppercase tracking-widest italic ${data.membership.auto_renew ? "text-primary" : "text-red-500"}`}>
                {data.membership.auto_renew ? "OPTIMIZATION ACTIVE" : "MANUAL INTERVENTION REQ"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((p, i) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`relative group bg-zinc-950 rounded-[3.5rem] p-10 border transition-all duration-500 flex flex-col text-left ${p.highlight ? "border-primary shadow-[0_30px_100px_rgba(var(--primary),0.1)] ring-1 ring-primary/20" : "border-white/5 hover:border-white/20"}`}
          >
            {p.highlight && (
              <div className="absolute -top-4 left-10 bg-primary text-black px-6 py-2 rounded-full font-black uppercase tracking-widest italic text-[10px] shadow-lg">
                Elite Choice
              </div>
            )}
            
            <div className="mb-8 relative z-10">
              <div className="text-[10px] uppercase font-black tracking-widest text-white/30 italic mb-2">{p.name}</div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-black italic tracking-tighter text-white">₹{p.price.toLocaleString()}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">{p.period}</span>
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-primary italic">{p.desc}</p>
            </div>

            <ul className="flex-1 space-y-4 mb-10 relative z-10">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60 italic">{f}</span>
                </li>
              ))}
            </ul>

            <button
              disabled={!data || pay.isPending}
              onClick={() => data && pay.mutate({ kind: "membership", plan: p.id, amount_inr: p.price, user: { name: data.user.name, email: data.user.email } })}
              className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] italic text-[10px] text-center transition-all duration-300 flex items-center justify-center gap-3 relative z-10 ${p.highlight ? "bg-primary text-black shadow-[0_15px_40px_rgba(var(--primary),0.3)] hover:scale-105" : "bg-white/5 text-white hover:bg-white/10 border border-white/10"}`}
            >
              {pay.isPending ? "TRANSITIONING..." : p.id === "trial" ? "INITIALIZE TRIAL" : "SYNCHRONIZE"}
              {!pay.isPending && <ArrowRight className="w-4 h-4" />}
            </button>
            
            <div className="absolute -bottom-10 -right-10 p-10 text-white/5 group-hover:text-primary/5 transition-all duration-700">
              <CreditCard className="w-32 h-32" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
