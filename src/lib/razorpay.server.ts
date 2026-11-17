import crypto from "node:crypto";
import Razorpay from "razorpay";

export function verifyRazorpayPaymentSignature(args: {
  orderId?: string;
  paymentId?: string;
  signature?: string;
}): boolean {
  const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!secret) return false;
  if (!args.orderId || !args.paymentId || !args.signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(args.signature.trim(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
  if (!secret || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function createRazorpayRefund(paymentId: string, amountInr: number): Promise<{ id: string } | null> {
  const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) return null;
  const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const refund = await rzp.payments.refund(paymentId, {
    amount: Math.round(amountInr * 100),
  });
  return { id: String((refund as any).id || `rfnd_${Date.now()}`) };
}
