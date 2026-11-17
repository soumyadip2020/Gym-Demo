import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Star } from "lucide-react";
import { TRAINERS } from "@/lib/trainers";
import { dashboardFn } from "@/lib/server-fns";
import { usePay } from "@/lib/use-pay";

export const Route = createFileRoute("/_app/my-trainers")({ component: MyTrainers });

function MyTrainers() {
  const fetchDash = useServerFn(dashboardFn);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const pay = usePay();
  const [pick, setPick] = useState<Record<string, "monthly"|"quarterly"|"annual">>({});

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-muted-foreground">Coaching</div>
        <h1 className="font-display text-3xl md:text-4xl">Book a trainer</h1>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TRAINERS.map((t) => {
          const period = pick[t.slug] ?? "monthly";
          const amount = t.prices[period];
          return (
            <div key={t.slug} className="glass rounded-2xl p-5 flex flex-col">
              <div className="h-32 rounded-xl bg-gradient-to-br from-[oklch(0.88_0.21_135/0.3)] via-[oklch(0.7_0.2_320/0.25)] to-[oklch(0.78_0.18_200/0.25)] grid place-items-center mb-4">
                <div className="font-display text-3xl">{t.name.split(" ").map(n=>n[0]).join("")}</div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-lg">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.spec} · {t.years}y</div>
                </div>
                <div className="text-xs flex items-center gap-1"><Star className="w-3 h-3 text-primary fill-current" />{t.rating}</div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 flex-1">{t.bio}</p>
              <div className="grid grid-cols-3 gap-1 mt-3 text-xs">
                {(["monthly","quarterly","annual"] as const).map((k) => (
                  <button key={k} onClick={() => setPick({ ...pick, [t.slug]: k })}
                    className={`rounded-lg py-1.5 capitalize ${period === k ? "btn-hero" : "glass"}`}>{k}</button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="font-display text-xl">₹{amount.toLocaleString()}</div>
                <button disabled={!data || pay.isPending}
                  onClick={() => data && pay.mutate({ kind: "trainer", plan: period, amount_inr: amount, trainer_slug: t.slug, trainer_name: t.name, user: { name: data.user.name, email: data.user.email } })}
                  className="btn-hero rounded-xl px-4 py-2 text-sm font-medium">Book</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
