import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { addProgressFn, progressFn } from "@/lib/server-fns";
import { safeMemberQuery } from "@/lib/safe-query";

export const Route = createFileRoute("/_app/progress")({ component: Progress });

function Progress() {
  const fetchProg = useServerFn(progressFn);
  const addProg = useServerFn(addProgressFn);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["progress"], queryFn: safeMemberQuery(() => fetchProg(), qc) });
  const [f, setF] = useState({ weight_kg: "", body_fat: "", muscle_mass: "", notes: "" });
  const m = useMutation({
    mutationFn: async () => addProg({ data: {
      weight_kg: f.weight_kg ? Number(f.weight_kg) : undefined,
      body_fat: f.body_fat ? Number(f.body_fat) : undefined,
      muscle_mass: f.muscle_mass ? Number(f.muscle_mass) : undefined,
      notes: f.notes || undefined,
    }}),
    onSuccess: () => { toast.success("Saved"); setF({ weight_kg: "", body_fat: "", muscle_mass: "", notes: "" }); qc.invalidateQueries({ queryKey: ["progress"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const chart = (data?.entries ?? []).map((e: any) => ({
    day: new Date(e.day).toLocaleDateString("en", { month: "short", day: "numeric" }),
    weight: e.weight_kg ? Number(e.weight_kg) : null,
    bf: e.body_fat ? Number(e.body_fat) : null,
    mm: e.muscle_mass ? Number(e.muscle_mass) : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-muted-foreground">Tracker</div>
        <h1 className="font-display text-3xl md:text-4xl">Progress</h1>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="glass-strong rounded-2xl p-6 grid sm:grid-cols-4 gap-3">
        <In label="Weight (kg)" value={f.weight_kg} onChange={(v: any) => setF({ ...f, weight_kg: v })} />
        <In label="Body fat (%)" value={f.body_fat} onChange={(v: any) => setF({ ...f, body_fat: v })} />
        <In label="Muscle (kg)" value={f.muscle_mass} onChange={(v: any) => setF({ ...f, muscle_mass: v })} />
        <button className="btn-hero rounded-xl py-3 font-medium self-end">Add entry</button>
      </form>

      <div className="glass-strong rounded-2xl p-6">
        <div className="font-display text-lg mb-3">Weight</div>
        <div className="h-64">
          {chart.filter((c: any) => c.weight).length > 1 ? (
            <ResponsiveContainer>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,.4)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.025 265)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="weight" stroke="oklch(0.88 0.21 135)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">Add entries to view chart.</div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-strong rounded-2xl p-6">
          <div className="font-display text-lg mb-3">Body Fat %</div>
          <div className="h-56">
            {chart.filter((c: any) => c.bf).length > 1 ? (
              <ResponsiveContainer><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" /><XAxis dataKey="day" stroke="rgba(255,255,255,.4)" fontSize={11} /><YAxis stroke="rgba(255,255,255,.4)" fontSize={11} /><Tooltip contentStyle={{ background: "oklch(0.18 0.025 265)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }} /><Line type="monotone" dataKey="bf" stroke="oklch(0.7 0.2 320)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
            ) : <div className="h-full grid place-items-center text-sm text-muted-foreground">No data yet.</div>}
          </div>
        </div>
        <div className="glass-strong rounded-2xl p-6">
          <div className="font-display text-lg mb-3">Muscle Mass (kg)</div>
          <div className="h-56">
            {chart.filter((c: any) => c.mm).length > 1 ? (
              <ResponsiveContainer><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" /><XAxis dataKey="day" stroke="rgba(255,255,255,.4)" fontSize={11} /><YAxis stroke="rgba(255,255,255,.4)" fontSize={11} /><Tooltip contentStyle={{ background: "oklch(0.18 0.025 265)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }} /><Line type="monotone" dataKey="mm" stroke="oklch(0.78 0.18 200)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
            ) : <div className="h-full grid place-items-center text-sm text-muted-foreground">No data yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
function In({ label, value, onChange }: any) {
  return (<label className="block"><div className="text-xs text-muted-foreground mb-1.5">{label}</div>
    <input value={value} onChange={(e) => onChange(e.target.value)} type="number" step="0.1" className="w-full glass rounded-xl px-4 py-2.5 outline-none" /></label>);
}
