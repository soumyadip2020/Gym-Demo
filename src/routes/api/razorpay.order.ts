import { createFileRoute } from "@tanstack/react-router";
import Razorpay from "razorpay";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth.server";
import { getAdminSession } from "@/lib/admin-auth.server";

const Body = z.object({ amount_inr: z.number().min(1).max(500000), notes: z.record(z.string(), z.string()).optional() });

export const Route = createFileRoute("/api/razorpay/order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [user, admin] = await Promise.all([getCurrentUser(), getAdminSession()]);
        if (!user && !admin) {
          return Response.json({ error: "Authentication required" }, { status: 401 });
        }
        const id = process.env.RAZORPAY_KEY_ID;
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!id || !secret) return Response.json({ error: "Razorpay not configured" }, { status: 500 });
        const body = Body.safeParse(await request.json());
        if (!body.success) return Response.json({ error: "Invalid body" }, { status: 400 });
        const rzp = new Razorpay({ key_id: id, key_secret: secret });
        try {
          const order = await rzp.orders.create({
            amount: Math.round(body.data.amount_inr * 100),
            currency: "INR",
            receipt: `rcpt_${Date.now()}`,
            notes: body.data.notes,
          });
          return Response.json({ order, key_id: id });
        } catch (e: any) {
          return Response.json({ error: e?.message || "Failed" }, { status: 500 });
        }
      },
    },
  },
});
