import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Apple, Calendar, Dumbbell, Flame, LineChart, ShieldCheck, TrendingUp, ArrowRight } from "lucide-react";
import { dashboardFn } from "@/lib/server-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const fetchDash = useServerFn(dashboardFn);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] uppercase font-black tracking-widest text-white/40 italic">Synchronizing Your Performance Data...</p>
      </div>
    );
  }

  const cards = [
    { label: "Membership", value: data.membership ? data.membership.plan : "None", sub: data.membership ? `Ends: ${new Date(data.membership.ends_at).toLocaleDateString()}` : "Subscribe to start", icon: ShieldCheck, color: "text-primary" },
    { label: "Streak", value: `${data.streak} days`, sub: "Elite Consistency", icon: Flame, color: "text-orange-500" },
    { label: "Calories", value: `${data.streak * 380}`, sub: "Monthly Est.", icon: Activity, color: "text-red-500" },
    { label: "AI Plan", value: data.lastWorkout ? data.lastWorkout.goal.replace("_"," ") : "—", sub: data.lastWorkout ? "AI Optimized" : "Generate Now", icon: Dumbbell, color: "text-blue-500" },
    { label: "BMI Index", value: data.bmi ?? "—", sub: data.bmi ? bmiLabel(data.bmi) : "Add height & weight", icon: LineChart, color: "text-primary" },
    { label: "Weight", value: data.user.weight_kg ? `${data.user.weight_kg} kg` : "—", sub: "Last recorded", icon: TrendingUp, color: "text-green-500" },
  ];

  const chartData = (data.progress ?? []).map((p: any) => ({
    day: new Date(p.day).toLocaleDateString("en", { month: "short", day: "numeric" }),
    weight: p.weight_kg ? Number(p.weight_kg) : null,
  })).filter((p: any) => p.weight !== null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] uppercase font-black tracking-[0.3em] text-white/40 mb-2 italic">Elite Athlete Profile</div>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            Welcome, <span className="text-primary">{data.user.name.split(' ')[0]}</span>
          </h1>
        </div>
        <div className="bg-white/5 border border-white/5 px-6 py-3 rounded-2xl backdrop-blur-xl hidden md:block">
          <div className="text-[10px] uppercase font-black tracking-widest text-white/30 italic">Daily Status</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
            <span className="text-[11px] font-black uppercase tracking-widest italic">Live Optimization Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((c, i) => (
          <motion.div 
            key={c.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-zinc-950 border border-white/5 p-8 rounded-[2.5rem] hover:border-primary/30 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-primary/10 transition-colors">
              <c.icon className="w-20 h-20" />
            </div>
            <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center ${c.color} mb-6 group-hover:scale-110 transition-transform`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-2 italic">{c.label}</div>
            <div className="font-display text-3xl font-black uppercase italic tracking-tighter text-white group-hover:text-primary transition-colors">{c.value}</div>
            <div className="text-[9px] uppercase font-black tracking-widest text-white/20 mt-2">{c.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-950 border border-white/5 rounded-[3rem] p-8 md:p-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none" />
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-1 italic">Growth Analytics</div>
              <h3 className="font-display text-2xl font-black uppercase italic tracking-tighter">Weight Progression</h3>
            </div>
            <Link to="/progress" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-primary hover:text-black transition-all group/btn">
              <ArrowRight className="w-4 h-4 group-hover/btn:scale-110" />
            </Link>
          </div>
          <div className="h-72 relative z-10">
            {chartData.length > 1 ? (
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="w" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.88 0.21 135)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.88 0.21 135)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    stroke="rgba(255,255,255,0.1)" 
                    fontSize={10} 
                    tickFormatter={(v) => v.toUpperCase()}
                    fontFamily="Syncopate"
                    fontWeight="bold"
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.1)" 
                    fontSize={10} 
                    domain={["dataMin - 2", "dataMax + 2"]}
                    fontFamily="Syncopate"
                    fontWeight="bold"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: "rgba(9, 9, 11, 0.9)", 
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,.05)", 
                      borderRadius: "1.5rem",
                      padding: "1rem",
                      fontSize: "10px",
                      fontFamily: "Syncopate",
                      fontWeight: "bold",
                      textTransform: "uppercase"
                    }} 
                  />
                  <Area type="monotone" dataKey="weight" stroke="oklch(0.88 0.21 135)" fill="url(#w)" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/20 italic font-black uppercase tracking-tighter">DATA</div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">Insufficient Data Points to Render Analytics</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-zinc-950 border border-white/5 rounded-[3rem] p-10 flex flex-col items-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-8 italic relative z-10">Consistency Index</div>
          <div className="relative mb-8 z-10">
            <svg className="w-48 h-48 -rotate-90">
              <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
              <circle 
                cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" 
                strokeDasharray={552.9} strokeDashoffset={552.9 * (1 - data.consistency / 100)}
                className="text-primary transition-all duration-1000 ease-out" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display text-5xl font-black italic tracking-tighter">{data.consistency}<span className="text-xl">%</span></div>
              <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mt-1">Score</div>
            </div>
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-6 italic z-10">30 Day Performance Heatmap</div>
          <div className="grid grid-cols-7 gap-1.5 z-10">
            {Array.from({ length: 28 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (27 - i));
              const k = d.toISOString().slice(0, 10);
              const on = data.days.includes(k);
              return <div key={i} className={`w-3 h-3 rounded-sm ${on ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-white/5 hover:bg-white/10 transition-colors"}`} title={k} />;
            })}
          </div>
          <Link to="/check-in" className="mt-10 w-full bg-primary text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] italic text-[10px] hover:scale-105 transition-transform z-10 shadow-[0_15px_40px_rgba(var(--primary),0.3)]">
            Check In Today
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 pb-10">
        <Link to="/workout" className="group bg-zinc-950 border border-white/5 rounded-[2.5rem] p-10 hover:border-primary/50 transition-all duration-500 flex items-center justify-between overflow-hidden relative">
          <div className="absolute right-0 top-0 p-10 text-white/5 group-hover:text-primary/10 transition-all group-hover:scale-110 duration-700"><Dumbbell className="w-24 h-24" /></div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-black transition-all duration-500">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="font-display text-2xl font-black uppercase italic tracking-tighter mb-2">AI Workout Planner</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 italic">Generate elite-tier programs instantly.</p>
          </div>
          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all relative z-10">
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
        <Link to="/diet" className="group bg-zinc-950 border border-white/5 rounded-[2.5rem] p-10 hover:border-primary/50 transition-all duration-500 flex items-center justify-between overflow-hidden relative">
          <div className="absolute right-0 top-0 p-10 text-white/5 group-hover:text-primary/10 transition-all group-hover:scale-110 duration-700"><Apple className="w-24 h-24" /></div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-black transition-all duration-500">
              <Apple className="w-6 h-6" />
            </div>
            <h3 className="font-display text-2xl font-black uppercase italic tracking-tighter mb-2">AI Diet Planner</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 italic">Precision nutrition for peak performance.</p>
          </div>
          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all relative z-10">
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </motion.div>
  );
}

function bmiLabel(b: number) {
  if (b < 18.5) return "Underweight Elite";
  if (b < 25) return "Prime Performance";
  if (b < 30) return "Mass Focus";
  return "Power Limit";
}
