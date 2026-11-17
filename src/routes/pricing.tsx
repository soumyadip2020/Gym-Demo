import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { motion } from "framer-motion";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [
    { title: "Membership — Fitness 365" },
    { name: "description", content: "Choose your Fitness 365 plan: free trial, monthly, quarterly or annual." },
  ]}),
  component: PricingPage,
});

const PLANS = [
  { id: "trial", name: "Free Trial", price: "₹0", period: "7 days", desc: "Test the elite waters.", features: ["Full AI Dashboard","Basic Workout Plan","Community Access"] },
  { id: "monthly", name: "Monthly", price: "₹999", period: "/mo", desc: "Flexible performance.", features: ["Everything in Trial","Direct Trainer Chat","Priority AI Processing"] },
  { id: "quarterly", name: "Quarterly", price: "₹2,499", period: "/3mo", desc: "The Athlete's Choice.", features: ["Save 16%","Custom Bio-Metrics","Priority Support Hub"], highlight: true },
  { id: "annual", name: "Annual", price: "₹7,999", period: "/yr", desc: "Total Transformation.", features: ["Save 33%","All Feature Unlocks","Free Trainer Sessions"] },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-black selection:bg-primary selection:text-black">
      <Navbar />
      
      <section className="relative py-32 overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-[10px] uppercase font-black tracking-[0.4em] text-primary italic mb-6">Subscription Models</div>
            <h1 className="font-display text-5xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-8">
              Simple <span className="text-stroke-thick opacity-30 italic">Premium</span> Pricing
            </h1>
            <p className="max-w-2xl mx-auto text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-white/30 italic">
              Cancel anytime. 7-day free trial. No credit card required for entry.
            </p>
          </motion.div>

          <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((p, i) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6 }}
                viewport={{ once: false, amount: 0.12 }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className={`relative group bg-zinc-950 rounded-[3rem] p-10 border transition-all duration-500 flex flex-col text-left ${p.highlight ? "border-primary shadow-[0_30px_100px_rgba(var(--primary),0.1)] ring-1 ring-primary/20" : "border-white/5 hover:border-white/20"}`}
              >
                {p.highlight && (
                  <div className="absolute -top-4 left-10 bg-primary text-black px-6 py-2 rounded-full font-black uppercase tracking-widest italic text-[10px] shadow-lg">
                    Most Popular
                  </div>
                )}
                
                <div className="mb-8">
                  <div className="text-[10px] uppercase font-black tracking-widest text-white/30 italic mb-2">{p.name}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-5xl font-black italic tracking-tighter text-white">{p.price}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">{p.period}</span>
                  </div>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-primary italic">{p.desc}</p>
                </div>

                <ul className="flex-1 space-y-4 mb-10">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60 italic">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link 
                  to="/signup" 
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] italic text-[10px] text-center transition-all duration-300 flex items-center justify-center gap-3 ${p.highlight ? "bg-primary text-black shadow-[0_15px_40px_rgba(var(--primary),0.3)] hover:scale-105" : "bg-white/5 text-white hover:bg-white/10 border border-white/10"}`}
                >
                  Join the Elite <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
