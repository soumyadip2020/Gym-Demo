import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Flame, Trophy, Calendar as CalIcon, Check, Zap, MapPin } from "lucide-react";
import { checkInFn, dashboardFn } from "@/lib/server-fns";
import { safeMemberQuery } from "@/lib/safe-query";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/check-in")({ component: CheckIn });

function CheckIn() {
  const fetchDash = useServerFn(dashboardFn);
  const checkIn = useServerFn(checkInFn);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: safeMemberQuery(() => fetchDash(), qc) });
  
  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const today = new Date().toISOString().slice(0, 10);
  const checkedToday = data.days.includes(today);

  const monthDays = (() => {
    const d = new Date();
    const y = d.getFullYear(), m = d.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    return { first, days, y, m };
  })();

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.3em] text-white/40 mb-2 italic">Attendance Log</div>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            Check-In & <span className="text-primary">Streaks</span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Stat icon={Flame} label="Current Streak" value={`${data.streak} DAYS`} color="text-orange-500" />
        <Stat icon={CalIcon} label="Session Count" value={`${data.monthCount} UNITS`} color="text-primary" />
        <Stat icon={Trophy} label="Performance" value={`${data.consistency}%`} color="text-yellow-500" />
      </div>

      <div className="bg-zinc-950 border border-white/5 rounded-[3rem] p-8 md:p-12 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 relative z-10">
          <div>
            <div className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-2 italic">Current Node</div>
            <div className="font-display text-2xl font-black uppercase italic tracking-tighter text-white">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px] font-black uppercase tracking-widest text-primary italic">
              <MapPin className="w-3 h-3" /> HQ Operational Center
            </div>
          </div>
          
          <button
            disabled={checkedToday}
            onClick={async () => { 
              try { 
                await checkIn({}); 
                toast.success("BIOMETRIC LOGGED! 🔥"); 
                qc.invalidateQueries({ queryKey: ["dashboard"] }); 
              } catch (e: any) { toast.error(e.message); } 
            }}
            className={`flex items-center justify-center gap-3 rounded-2xl px-12 py-5 font-black uppercase tracking-[0.2em] italic text-xs transition-all duration-500 ${checkedToday ? "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed" : "bg-primary text-black hover:scale-105 shadow-[0_20px_50px_rgba(var(--primary),0.3)]"}`}
          >
            {checkedToday ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            {checkedToday ? "LOGGED TODAY" : "INITIALIZE LOG"}
          </button>
        </div>

        <div className="relative z-10 border-t border-white/5 pt-10">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-8 italic text-center">Neural Attendance Map</div>
          
          <div className="grid grid-cols-7 gap-3 sm:gap-4 max-w-2xl mx-auto">
            {dayNames.map((d) => (
              <div key={d} className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 py-2 italic text-center">{d}</div>
            ))}
            {Array.from({ length: monthDays.first }).map((_, i) => <div key={"e" + i} />)}
            {Array.from({ length: monthDays.days }).map((_, i) => {
              const day = i + 1;
              const k = `${monthDays.y}-${String(monthDays.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const on = data.days.includes(k);
              const isToday = k === today;
              return (
                <div 
                  key={day} 
                  className={`aspect-square rounded-2xl grid place-items-center text-[11px] font-black transition-all duration-300 relative group/day ${on ? "bg-primary text-black shadow-[0_0_20px_rgba(var(--primary),0.2)]" : "bg-white/5 text-white/20 hover:bg-white/10 hover:text-white border border-white/5"} ${isToday ? "ring-2 ring-primary ring-offset-4 ring-offset-black" : ""}`}
                >
                  {day}
                  {on && <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-primary" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-zinc-950 border border-white/5 rounded-[2.5rem] p-8 group hover:border-primary/30 transition-all duration-500 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-primary/10 transition-colors">
        <Icon className="w-16 h-16" />
      </div>
      <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center ${color} mb-6 group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-2 italic">{label}</div>
      <div className="font-display text-3xl font-black uppercase italic tracking-tighter text-white group-hover:text-primary transition-colors">{value}</div>
    </div>
  );
}
