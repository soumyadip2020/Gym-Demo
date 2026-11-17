import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Apple, Droplet, Sparkles, Activity, PieChart, Info, ArrowRight, Zap, Coffee, Sun, Sunset, Moon } from "lucide-react";
import { generateDietFn, listPlansFn } from "@/lib/server-fns";
import { safeMemberQuery } from "@/lib/safe-query";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_app/diet")({ component: DietPlanner });

function DietPlanner() {
  const generate = useServerFn(generateDietFn);
  const listPlans = useServerFn(listPlansFn);
  const qc = useQueryClient();
  const { data: plans, refetch } = useQuery({ queryKey: ["plans"], queryFn: safeMemberQuery(() => listPlans(), qc) });
  const [form, setForm] = useState({ goal: "muscle_gain", height_cm: 175, weight_kg: 75, age: 28, veg: "veg", allergies: "" });
  
  const m = useMutation({
    mutationFn: async () => generate({ data: form as any }),
    onSuccess: () => { toast.success("Nutrition Plan Optimized!"); refetch(); },
    onError: (e: any) => toast.error(e?.message || "Optimization failed"),
  });

  const latest = m.data?.plan ?? plans?.diets?.[0]?.data ?? null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.3em] text-white/40 mb-2 italic">Metabolic Hub</div>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            AI Diet <span className="text-primary">Architect</span>
          </h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Input Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <form 
            className="bg-zinc-950 border border-white/5 rounded-[3rem] p-8 space-y-6 sticky top-8"
            onSubmit={(e) => { e.preventDefault(); m.mutate(); }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-white italic">Metabolic Input</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">Optimization Parameters</p>
              </div>
            </div>

            <Sel label="Metabolic Goal" value={form.goal} onChange={(v: any) => setForm({ ...form, goal: v })}
              options={[["fat_loss","Fat Loss"],["muscle_gain","Muscle Gain"],["maintenance","Maintenance"],["strength","Strength"]]} />
            
            <div className="grid grid-cols-2 gap-4">
              <Num label="Height (CM)" value={form.height_cm} onChange={(v: any) => setForm({ ...form, height_cm: v })} />
              <Num label="Weight (KG)" value={form.weight_kg} onChange={(v: any) => setForm({ ...form, weight_kg: v })} />
              <Num label="Age" value={form.age} onChange={(v: any) => setForm({ ...form, age: v })} />
            </div>

            <Sel label="Dietary Protocol" value={form.veg} onChange={(v: any) => setForm({ ...form, veg: v })}
              options={[["veg","Vegetarian"],["non_veg","Non-Veg"],["vegan","Vegan"],["eggetarian","Eggetarian"]]} />
            
            <label className="block group">
              <div className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-2 ml-1 italic">Known Allergies</div>
              <input 
                value={form.allergies} 
                onChange={(e) => setForm({ ...form, allergies: e.target.value })} 
                placeholder="ANY FOOD SENSITIVITIES?"
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-black text-[10px] text-white placeholder:text-white/10 uppercase tracking-widest" 
              />
            </label>

            <button 
              disabled={m.isPending} 
              className="w-full bg-primary text-black rounded-2xl py-6 font-black uppercase tracking-[0.2em] italic text-xs hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(var(--primary),0.2)] mt-8"
            >
              {m.isPending ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {m.isPending ? "Calculating..." : "Optimize Diet"}
            </button>
          </form>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {latest ? (
              <motion.div 
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Stat label="Total Calories" value={latest.calories} unit="KCAL" icon={<Zap className="w-4 h-4" />} />
                  <Stat label="Protein" value={latest?.macros?.protein_g} unit="G" icon={<Activity className="w-4 h-4" />} />
                  <Stat label="Carbs" value={latest?.macros?.carbs_g} unit="G" icon={<PieChart className="w-4 h-4" />} />
                  <Stat label="Fat" value={latest?.macros?.fat_g} unit="G" icon={<Activity className="w-4 h-4" />} />
                </div>

                <div className="bg-zinc-950 border border-white/5 rounded-[3rem] p-8 flex items-center gap-6 group hover:border-primary/30 transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                    <Droplet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-1 italic">Hydration Protocol</div>
                    <div className="font-display text-2xl font-black italic tracking-tighter text-white">
                      Target: <span className="text-primary">{latest.water_l ?? "—"} LITERS</span> / DAY
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {(latest.meals ?? []).map((meal: any, i: number) => {
                    const icons = [<Coffee/>, <Sun/>, <Sunset/>, <Moon/>];
                    return (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-zinc-950 border border-white/5 rounded-[3rem] p-8 md:p-10 group hover:border-white/10 transition-all relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-10 text-white/5 group-hover:text-primary/5 transition-all duration-700">
                          {icons[i % 4] || <Apple className="w-24 h-24" />}
                        </div>
                        
                        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center font-black italic text-sm text-white/40">
                              0{i + 1}
                            </div>
                            <div>
                              <div className="text-[9px] font-black uppercase tracking-widest text-white/20 italic mb-1">{meal.time}</div>
                              <h3 className="font-display text-2xl font-black uppercase italic tracking-tighter group-hover:text-primary transition-colors">{meal.name}</h3>
                            </div>
                          </div>
                          <div className="px-5 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-primary italic">
                            {meal.calories} KCAL
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          {(meal.items ?? []).map((it: string, j: number) => (
                            <div key={j} className="group/item bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-all flex items-center gap-4">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-black transition-all">
                                <Apple className="w-4 h-4" />
                              </div>
                              <span className="text-[11px] font-black uppercase tracking-widest text-white/60 italic group-hover/item:text-white transition-colors">{it}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {latest.notes?.length > 0 && (
                  <div className="bg-zinc-950 border border-white/5 rounded-[3rem] p-10">
                    <div className="flex items-center gap-4 mb-8">
                      <Info className="w-5 h-5 text-primary" />
                      <h3 className="font-display text-2xl font-black uppercase italic tracking-tighter">Nutritionist Insights</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                      {latest.notes.map((t: string, i: number) => (
                        <div key={i} className="flex gap-4 items-start">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                            <ArrowRight className="w-3 h-3" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-relaxed italic">{t}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center p-10 bg-zinc-950 border border-white/5 rounded-[4rem]"
              >
                <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-center mb-10 group">
                  <Apple className="w-10 h-10 text-white/10 group-hover:text-primary transition-all duration-700 group-hover:scale-110" />
                </div>
                <h2 className="font-display text-3xl font-black uppercase italic tracking-tighter mb-4">Metabolic Grid Offline</h2>
                <p className="max-w-xs text-[10px] font-black uppercase tracking-widest text-white/20 leading-relaxed italic">
                  Define your biometrics and dietary protocol to synchronize your elite nutrition program.
                </p>
                <button 
                  onClick={() => m.mutate()}
                  className="mt-10 flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] italic text-[10px] group"
                >
                  Synchronize Diet <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, unit, icon }: any) {
  return (
    <div className="bg-zinc-950 border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-primary/30 transition-all">
      <div className="absolute top-0 right-0 p-4 text-white/5 group-hover:text-primary/10 transition-colors">
        {icon}
      </div>
      <div className="text-[9px] uppercase font-black tracking-widest text-white/20 mb-2 italic">{label}</div>
      <div className="font-display text-2xl font-black italic tracking-tighter text-white group-hover:text-primary transition-colors">
        {value ?? "—"}<span className="text-[10px] ml-1 opacity-40 group-hover:opacity-100">{unit}</span>
      </div>
    </div>
  );
}

function Num({ label, value, onChange }: any) {
  return (
    <label className="block group">
      <div className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-2 ml-1 italic">{label}</div>
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))} 
        className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-primary/50 transition-all font-black text-[10px] text-white placeholder:text-white/10 uppercase tracking-widest" 
      />
    </label>
  );
}

function Sel({ label, value, onChange, options }: any) {
  return (
    <label className="block group">
      <div className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-2 ml-1 italic">{label}</div>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 outline-none focus:border-primary/50 transition-all font-black text-[10px] text-white uppercase tracking-widest cursor-pointer appearance-none"
      >
        {options.map(([v, l]: [string, string]) => <option key={v} value={v} className="bg-zinc-950">{l}</option>)}
      </select>
    </label>
  );
}
