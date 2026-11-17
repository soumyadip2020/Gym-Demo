import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { subscribeFn, bookTrainerFn } from "@/lib/server-fns";

declare global { interface Window { Razorpay: any } }

type Kind = "membership" | "trainer";
interface Args {
  kind: Kind;
  amount_inr: number;
  plan: string;
  trainer_slug?: string;
  trainer_name?: string;
  user: { name: string; email: string };
}

export function usePay() {
  const subscribe = useServerFn(subscribeFn);
  const book = useServerFn(bookTrainerFn);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: Args) => {
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_inr: args.amount_inr, notes: { plan: args.plan, kind: args.kind } }),
      });
      if (!orderRes.ok) {
        // Fallback: record subscription without payment for free trial / dev
        if (args.amount_inr === 0 || args.plan === "trial") {
          if (args.kind === "membership") await subscribe({ data: { plan: args.plan as any, amount_inr: 0 } });
          return { ok: true, dev: true };
        }
        throw new Error("Payment unavailable. Configure Razorpay keys.");
      }
      const { order, key_id } = await orderRes.json();

      return new Promise<any>((resolve, reject) => {
        const opts = {
          key: key_id,
          amount: order.amount,
          currency: order.currency,
          name: "Fitness 365",
          description: args.kind === "membership" ? `Membership: ${args.plan}` : `Trainer: ${args.trainer_name}`,
          order_id: order.id,
          prefill: { name: args.user.name, email: args.user.email },
          theme: { color: "#a8e10b" },
          handler: async (resp: any) => {
            try {
              if (args.kind === "membership") {
                await subscribe({ data: { plan: args.plan as any, amount_inr: args.amount_inr, razorpay_payment_id: resp.razorpay_payment_id } });
              } else {
                await book({ data: { trainer_slug: args.trainer_slug!, plan: args.plan as any, amount_inr: args.amount_inr, razorpay_payment_id: resp.razorpay_payment_id } });
              }
              resolve(resp);
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        };
        const rzp = new window.Razorpay(opts);
        rzp.open();
      });
    },
    onSuccess: () => { toast.success("Payment successful"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e?.message || "Payment failed"),
  });
}
