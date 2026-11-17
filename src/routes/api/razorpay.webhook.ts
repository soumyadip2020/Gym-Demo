import { createFileRoute } from "@tanstack/react-router";
import { verifyRazorpayWebhookSignature } from "@/lib/admin-auth.server";
import { ensureSchema, getSql } from "@/lib/db.server";

export const Route = createFileRoute("/api/razorpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
          return Response.json({ error: "Razorpay webhook secret not configured" }, { status: 503 });
        }
        const signature = request.headers.get("x-razorpay-signature") || "";
        const rawBody = await request.text();
        if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature)) {
          return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
        }

        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return Response.json({ error: "Malformed JSON" }, { status: 400 });
        }

        await ensureSchema();
        const sql = getSql();
        const event = payload?.event as string;
        const paymentEntity = payload?.payload?.payment?.entity;
        const refundEntity = payload?.payload?.refund?.entity;

        if (event === "payment.captured" && paymentEntity?.id) {
          const amountInr = Math.round(Number(paymentEntity.amount || 0) / 100);
          await sql`
            INSERT INTO payments (transaction_id, razorpay_order_id, razorpay_payment_id, amount_inr, payment_method, purpose, status, notes)
            VALUES (
              ${paymentEntity.id},
              ${paymentEntity.order_id ?? null},
              ${paymentEntity.id},
              ${amountInr},
              ${paymentEntity.method || "razorpay"},
              ${paymentEntity.description || "Razorpay Webhook Capture"},
              'paid',
              ${"Webhook: " + event}
            )
            ON CONFLICT (razorpay_payment_id) DO UPDATE SET status = 'paid'
          `;
        } else if (event === "payment.failed" && paymentEntity?.id) {
          const amountInr = Math.round(Number(paymentEntity.amount || 0) / 100);
          await sql`
            INSERT INTO payments (transaction_id, razorpay_order_id, razorpay_payment_id, amount_inr, payment_method, purpose, status, notes)
            VALUES (
              ${paymentEntity.id},
              ${paymentEntity.order_id ?? null},
              ${paymentEntity.id},
              ${amountInr},
              ${paymentEntity.method || "razorpay"},
              ${paymentEntity.description || "Razorpay Payment Attempt"},
              'failed',
              ${paymentEntity.error_description || "Payment failed"}
            )
            ON CONFLICT (razorpay_payment_id) DO UPDATE SET status = 'failed'
          `;
        } else if (event === "refund.processed" && refundEntity?.payment_id) {
          await sql`
            UPDATE payments
            SET status = 'refunded', refund_id = ${refundEntity.id ?? null}, refunded_at = NOW()
            WHERE razorpay_payment_id = ${refundEntity.payment_id}
          `;
        }

        return Response.json({ received: true });
      },
    },
  },
});
