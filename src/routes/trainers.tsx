import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { TRAINERS } from "@/lib/trainers";
import { motion } from "framer-motion";

export const Route = createFileRoute("/trainers")({
  head: () => ({ meta: [
    { title: "Elite Trainers — Fitness 365" },
    { name: "description", content: "Book certified trainers monthly, quarterly or annually." },
  ]}),
  component: TrainersPage,
});

function TrainersPage() {
  return (
    <div className="min-h-screen bg-black selection:bg-primary selection:text-black">
      <Navbar />
      
      <section className="relative py-32 overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-[10px] uppercase font-black tracking-[0.4em] text-primary italic mb-6">Expert Coaches</div>
            <h1 className="font-display text-5xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-8">
              Train With <span className="text-stroke-thick opacity-30 italic">The Best</span>
            </h1>
            <p className="max-w-2xl mx-auto text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-white/30 italic">
              Certified elite trainers for those who demand peak performance and scientific precision.
            </p>
          </motion.div>

          <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {TRAINERS.map((t, i) => (
              <motion.div 
                key={t.slug}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="group bg-zinc-950 border border-white/5 rounded-[3rem] p-10 hover:border-primary/50 transition-all duration-500 text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-10 text-white/5 group-hover:text-primary/5 transition-all duration-700">
                  <ShieldCheck className="w-24 h-24" />
                </div>
                
                <div className="relative mb-8 aspect-square rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/5 group-hover:border-primary/30 transition-all duration-500">
                  {/* Since I can't generate images for each trainer name dynamically here, I'll use placeholders that look good */}
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                    <span className="font-display text-7xl font-black italic tracking-tighter text-white/10">{t.name.split(" ").map(n=>n[0]).join("")}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-3xl font-black uppercase italic tracking-tighter text-white group-hover:text-primary transition-colors">{t.name}</h3>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                      <Star className="w-3 h-3 text-primary fill-current" />
                      <span className="text-[10px] font-black italic text-primary">{t.rating}</span>
                    </div>
                  </div>
                  <div className="text-[10px] uppercase font-black tracking-widest text-primary italic mb-6 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> {t.spec}
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/40 leading-relaxed italic mb-8 h-12 overflow-hidden text-ellipsis line-clamp-3">{t.bio}</p>
                  
                  <div className="flex items-center justify-between border-t border-white/5 pt-8 mt-auto">
                    <div>
                      <div className="text-[9px] uppercase font-black tracking-widest text-white/20 italic mb-1">Elite Rate</div>
                      <div className="font-display text-2xl font-black italic tracking-tighter text-white">₹{t.prices.monthly.toLocaleString()}<span className="text-xs text-white/20 ml-1 italic font-black uppercase">/mo</span></div>
                    </div>
                    <Link to="/signup" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-primary hover:text-black transition-all group/btn">
                      <ArrowRight className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
