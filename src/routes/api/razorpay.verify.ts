import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyRazorpaySignature } from "@/lib/admin-auth.server";
import { ensureSchema, getSql } from "@/lib/db.server";

const VerifyBody = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  amount_inr: z.number().min(0).max(500000).optional(),
  purpose: z.string().max(200).optional(),
});

export const Route = createFileRoute("/api/razorpay/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = VerifyBody.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ verified: false, error: "Invalid verification payload" }, { status: 400 });
        }

        const ok = verifyRazorpaySignature(
          parsed.data.razorpay_order_id,
          parsed.data.razorpay_payment_id,
          parsed.data.razorpay_signature,
        );

        if (!ok) {
          return Response.json({ verified: false, error: "Cryptographic signature verification failed" }, { status: 400 });
        }

        await ensureSchema();
        const sql = getSql();
        const existing = (await sql`
          SELECT id FROM payments WHERE razorpay_payment_id = ${parsed.data.razorpay_payment_id} LIMIT 1
        `) as any[];

        return Response.json({
          verified: true,
          duplicate: existing.length > 0,
        });
      },
    },
  },
});
