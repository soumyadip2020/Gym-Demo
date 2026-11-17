import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Dumbbell, Sparkles, ArrowRight, Activity, Zap, History, Info } from "lucide-react";
import { generateWorkoutFn, listPlansFn } from "@/lib/server-fns";
import { safeMemberQuery } from "@/lib/safe-query";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_app/workout")({ component: WorkoutPlanner });

function WorkoutPlanner() {
  const generate = useServerFn(generateWorkoutFn);
  const listPlans = useServerFn(listPlansFn);
  const qc = useQueryClient();
  const { data: plans, refetch } = useQuery({ queryKey: ["plans"], queryFn: safeMemberQuery(() => listPlans(), qc) });
  const [form, setForm] = useState({ goal: "muscle_gain", height_cm: 175, weight_kg: 75, age: 28, experience: "intermediate", injuries: "", days_per_week: 4 });
  
  const m = useMutation({
    mutationFn: async () => generate({ data: form as any }),
    onSuccess: () => { toast.success("AI Plan Optimized!"); refetch(); },
    onError: (e: any) => toast.error(e?.message || "Optimization failed"),
  });
  
  const latest = m.data?.plan ?? plans?.workouts?.[0]?.data ?? null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.3em] text-white/40 mb-2 italic">Intelligence Core</div>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            AI Workout <span className="text-primary">Architect</span>
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
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-white italic">Biometric Input</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">Optimization Parameters</p>
              </div>
            </div>

            <Select label="Training Goal" value={form.goal} onChange={(v: any) => setForm({ ...form, goal: v })}
              options={[["fat_loss","Fat Loss"],["muscle_gain","Muscle Gain"],["strength","Strength"],["endurance","Endurance"]]} />
            
            <div className="grid grid-cols-2 gap-4">
              <Num label="Height (CM)" value={form.height_cm} onChange={(v: any) => setForm({ ...form, height_cm: v })} />
              <Num label="Weight (KG)" value={form.weight_kg} onChange={(v: any) => setForm({ ...form, weight_kg: v })} />
              <Num label="Age" value={form.age} onChange={(v: any) => setForm({ ...form, age: v })} />
              <Num label="Weekly Days" value={form.days_per_week} onChange={(v: any) => setForm({ ...form, days_per_week: v })} />
            </div>

            <Select label="Skill Level" value={form.experience} onChange={(v: any) => setForm({ ...form, experience: v })}
              options={[["beginner","Beginner"],["intermediate","Intermediate"],["advanced","Advanced"]]} />
            
            <label className="block group">
              <div className="text-[9px] uppercase font-black tracking-widest text-white/30 mb-2 ml-1 italic">Medical/Injuries</div>
              <input 
                value={form.injuries} 
                onChange={(e) => setForm({ ...form, injuries: e.target.value })} 
                placeholder="ANY PHYSICAL LIMITATIONS?"
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-primary/50 transition-all font-black text-[10px] text-white placeholder:text-white/10 uppercase tracking-widest" 
              />
            </label>

            <button 
              disabled={m.isPending} 
              className="w-full bg-primary text-black rounded-2xl py-6 font-black uppercase tracking-[0.2em] italic text-xs hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(var(--primary),0.2)] mt-8"
            >
              {m.isPending ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {m.isPending ? "Generating..." : "Optimize Plan"}
            </button>
          </form>

          {plans && plans.workouts?.length > 1 && (
            <div className="bg-zinc-950 border border-white/5 rounded-[2.5rem] p-8">
              <div className="flex items-center gap-3 mb-6">
                <History className="w-4 h-4 text-white/20" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Historical Archives</h3>
              </div>
              <div className="space-y-3">
                {plans.workouts.slice(1, 5).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5 group hover:border-primary/20 transition-all">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60 italic group-hover:text-primary transition-colors">{p.goal.replace("_"," ")}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                <div className="bg-zinc-950 border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none" />
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-black flex items-center justify-center">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-black uppercase italic tracking-tighter">Strategic Summary</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">AI COACH VERDICT</p>
                    </div>
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest leading-relaxed text-white/60 italic relative z-10 border-l-4 border-primary pl-8 py-2">
                    {latest.summary}
                  </p>
                </div>

                <div className="space-y-6">
                  {(latest.weekly ?? []).map((d: any, i: number) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-zinc-950 border border-white/5 rounded-[3rem] p-8 md:p-10 group hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center font-black italic text-sm text-white/40">
                            0{i + 1}
                          </div>
                          <h3 className="font-display text-2xl font-black uppercase italic tracking-tighter group-hover:text-primary transition-colors">{d.day}</h3>
                        </div>
                        <div className="px-5 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-primary italic">
                          {d.focus}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {(d.exercises ?? []).map((ex: any, j: number) => (
                          <div key={j} className="group/item bg-white/5 border border-white/5 rounded-2xl p-6 hover:bg-white/10 transition-all relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 text-white/5 group-hover/item:text-primary/10 transition-colors">
                              <Dumbbell className="w-12 h-12" />
                            </div>
                            <div className="flex items-start gap-4 relative z-10">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-black transition-all">
                                <Zap className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-black uppercase tracking-widest text-white italic mb-1 group-hover/item:text-primary transition-colors truncate">{ex.name}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-white/30 italic">
                                  {ex.sets} SETS × {ex.reps} REPS <span className="mx-2 text-primary">|</span> {ex.rest} REST
                                </div>
                                {ex.notes && (
                                  <div className="mt-3 flex gap-2">
                                    <Info className="w-3 h-3 text-primary/40 shrink-0" />
                                    <p className="text-[8px] font-black uppercase tracking-widest text-white/20 italic leading-tight">{ex.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {latest.tips?.length > 0 && (
                  <div className="bg-zinc-950 border border-white/5 rounded-[3rem] p-10">
                    <div className="flex items-center gap-4 mb-8">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h3 className="font-display text-2xl font-black uppercase italic tracking-tighter">Elite Optimization Tips</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                      {latest.tips.map((t: string, i: number) => (
                        <div key={i} className="flex gap-4 items-start">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                            <Check className="w-3 h-3" />
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
                  <Sparkles className="w-10 h-10 text-white/10 group-hover:text-primary transition-all duration-700 group-hover:scale-110" />
                </div>
                <h2 className="font-display text-3xl font-black uppercase italic tracking-tighter mb-4">Neural Grid Offline</h2>
                <p className="max-w-xs text-[10px] font-black uppercase tracking-widest text-white/20 leading-relaxed italic">
                  Initialize biometrics and define training parameters to architect your elite performance program.
                </p>
                <button 
                  onClick={() => m.mutate()}
                  className="mt-10 flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] italic text-[10px] group"
                >
                  Architect First Plan <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
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

function Select({ label, value, onChange, options }: any) {
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

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}
