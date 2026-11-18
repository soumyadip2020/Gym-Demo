import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "@tanstack/react-router";
import {
  getCookie,
  setCookie,
  deleteCookie,
  getRequestProtocol,
  getRequestHeader,
  getRequestIP,
} from "@tanstack/react-start/server";
import { ensureSchema, getSql, hasRealDatabase } from "./db.server";

export const ADMIN_COOKIE = "f365_admin_session";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const WINDOW_MINUTES = 15;
const SESSION_HOURS = 12;

export type AdminRole = "owner" | "manager" | "receptionist" | "supervisor" | "support" | "trainer";

export type AdminPermission =
  | "overview"
  | "members"
  | "attendance"
  | "inactive"
  | "memberships"
  | "payments"
  | "trainers"
  | "finance"
  | "reports"
  | "settings";

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  "overview",
  "members",
  "attendance",
  "inactive",
  "memberships",
  "payments",
  "trainers",
  "finance",
  "reports",
  "settings",
];

export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  owner: [...ALL_ADMIN_PERMISSIONS],
  manager: ["overview", "members", "attendance", "inactive", "memberships", "payments", "trainers", "finance", "reports"],
  receptionist: ["overview", "members", "attendance", "inactive", "memberships"],
  supervisor: ["overview", "members", "attendance", "inactive", "trainers"],
  support: ["overview", "members", "inactive"],
  trainer: ["overview", "members", "attendance"],
};

export interface AdminSessionUser {
  token: string;
  role: AdminRole;
  staff_id: number | null;
  actor_name: string;
  permissions: AdminPermission[];
  canViewCompensation: boolean;
  expires_at: string;
}

function getCookieSecurity() {
  let isHttps = false;
  try {
    const proto = getRequestProtocol({ xForwardedProto: true });
    const xfp = getRequestHeader("x-forwarded-proto") || "";
    const origin = getRequestHeader("origin") || "";
    const referer = getRequestHeader("referer") || "";
    const forwarded = (getRequestHeader("forwarded") || "").toLowerCase();
    isHttps =
      proto === "https" ||
      xfp.split(",")[0]?.trim().toLowerCase() === "https" ||
      origin.startsWith("https://") ||
      referer.startsWith("https://") ||
      forwarded.includes("proto=https");
  } catch {
    isHttps = false;
  }
  return {
    sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
    secure: isHttps,
    ...(isHttps ? { partitioned: true } : {}),
  };
}

function getClientIp(): string {
  try {
    const xff = getRequestHeader("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    return getRequestIP({ xForwardedFor: true }) || "unknown";
  } catch {
    return "unknown";
  }
}

function timingSafeMatch(expected: string, provided: string): boolean {
  const a = crypto.createHash("sha256").update(expected).digest();
  const b = crypto.createHash("sha256").update(provided).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function verifyAdminAccessCode(codeInput: string): Promise<AdminSessionUser> {
  if (!hasRealDatabase()) {
    throw new Error("Database connection required for Admin Panel.");
  }
  await ensureSchema();
  const sql = getSql();
  const expected = (process.env.GYM_ADMIN_ACCESS_CODE || "").trim();
  if (!/^\d{6}$/.test(expected)) {
    throw new Error("Admin access code is not configured. Set a 6-digit GYM_ADMIN_ACCESS_CODE in environment variables.");
  }

  const cleanCode = codeInput.trim();
  const ip = getClientIp();
  const rateKey = `owner:${ip}`;

  // Check lockout status
  const rateRows = (await sql`SELECT * FROM admin_rate_limits WHERE key = ${rateKey} LIMIT 1`) as any[];
  const existing = rateRows[0];
  if (existing?.locked_until && new Date(existing.locked_until).getTime() > Date.now()) {
    const mins = Math.max(1, Math.ceil((new Date(existing.locked_until).getTime() - Date.now()) / 60000));
    throw new Error(`Too many failed attempts. Locked for ${mins} more minute${mins === 1 ? "" : "s"}.`);
  }

  const matches = /^\d{6}$/.test(cleanCode) && timingSafeMatch(expected, cleanCode);
  if (!matches) {
    const windowExpired =
      !existing?.window_started_at ||
      Date.now() - new Date(existing.window_started_at).getTime() > WINDOW_MINUTES * 60_000;
    const nextAttempts = windowExpired ? 1 : Number(existing?.attempts || 0) + 1;
    const lockedUntil =
      nextAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null;

    await sql`
      INSERT INTO admin_rate_limits (key, attempts, window_started_at, locked_until)
      VALUES (${rateKey}, ${nextAttempts}, NOW(), ${lockedUntil})
      ON CONFLICT (key) DO UPDATE SET
        attempts = ${nextAttempts},
        window_started_at = CASE WHEN ${windowExpired} THEN NOW() ELSE admin_rate_limits.window_started_at END,
        locked_until = ${lockedUntil}
    `;

    await logAdminActivityInternal({
      actor_name: "Unknown",
      actor_role: "owner",
      action: "admin_login_failed",
      target_type: "auth",
      details: { ip, attempts: nextAttempts, locked: Boolean(lockedUntil) },
    });

    if (lockedUntil) {
      throw new Error(`Invalid code. Account temporarily locked for ${LOCKOUT_MINUTES} minutes.`);
    }
    const remaining = MAX_FAILED_ATTEMPTS - nextAttempts;
    throw new Error(`Invalid 6-digit access code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
  }

  // Clear rate limit & create owner session
  await sql`DELETE FROM admin_rate_limits WHERE key = ${rateKey}`;
  return createAdminSession({
    role: "owner",
    staff_id: null,
    actor_name: "Gym Owner",
    permissions: ALL_ADMIN_PERMISSIONS,
    ip,
  });
}

export async function verifyStaffLogin(emailInput: string, password: string): Promise<AdminSessionUser> {
  if (!hasRealDatabase()) {
    throw new Error("Database connection required for Staff Portal.");
  }
  await ensureSchema();
  const sql = getSql();
  const email = emailInput.trim().toLowerCase();
  const ip = getClientIp();
  const rateKey = `staff:${ip}:${email}`;

  const rateRows = (await sql`SELECT * FROM admin_rate_limits WHERE key = ${rateKey} LIMIT 1`) as any[];
  const existing = rateRows[0];
  if (existing?.locked_until && new Date(existing.locked_until).getTime() > Date.now()) {
    const mins = Math.max(1, Math.ceil((new Date(existing.locked_until).getTime() - Date.now()) / 60000));
    throw new Error(`Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`);
  }

  const rows = (await sql`SELECT * FROM gym_staff WHERE email = ${email} AND is_active = true LIMIT 1`) as any[];
  const staff = rows[0];
  const ok = staff ? await bcrypt.compare(password, staff.password_hash) : false;

  if (!ok) {
    const windowExpired =
      !existing?.window_started_at ||
      Date.now() - new Date(existing.window_started_at).getTime() > WINDOW_MINUTES * 60_000;
    const nextAttempts = windowExpired ? 1 : Number(existing?.attempts || 0) + 1;
    const lockedUntil =
      nextAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null;
    await sql`
      INSERT INTO admin_rate_limits (key, attempts, window_started_at, locked_until)
      VALUES (${rateKey}, ${nextAttempts}, NOW(), ${lockedUntil})
      ON CONFLICT (key) DO UPDATE SET
        attempts = ${nextAttempts},
        window_started_at = CASE WHEN ${windowExpired} THEN NOW() ELSE admin_rate_limits.window_started_at END,
        locked_until = ${lockedUntil}
    `;
    throw new Error("Invalid staff credentials or inactive account.");
  }

  await sql`DELETE FROM admin_rate_limits WHERE key = ${rateKey}`;
  const role = (staff.role || "receptionist") as AdminRole;
  const rawPerms = Array.isArray(staff.permissions) ? staff.permissions : ROLE_DEFAULT_PERMISSIONS[role] || ["overview"];
  // Trainers and non-owner roles never gain owner settings/salary escalation
  const safePerms = rawPerms.filter((p: string) =>
    role === "trainer" ? ["overview", "members", "attendance"].includes(p) : p !== "settings",
  ) as AdminPermission[];

  return createAdminSession({
    role,
    staff_id: staff.id,
    actor_name: staff.name,
    permissions: safePerms,
    ip,
  });
}

async function createAdminSession(input: {
  role: AdminRole;
  staff_id: number | null;
  actor_name: string;
  permissions: AdminPermission[];
  ip: string;
}): Promise<AdminSessionUser> {
  const sql = getSql();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();

  await sql`
    INSERT INTO admin_sessions (token, role, staff_id, actor_name, permissions, ip_address, expires_at)
    VALUES (${token}, ${input.role}, ${input.staff_id}, ${input.actor_name}, ${JSON.stringify(input.permissions)}::jsonb, ${input.ip}, ${expiresAt})
  `;

  setCookie(ADMIN_COOKIE, token, {
    httpOnly: true,
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
    ...getCookieSecurity(),
  });

  await logAdminActivityInternal({
    actor_name: input.actor_name,
    actor_role: input.role,
    action: "admin_login_success",
    target_type: "auth",
    details: { ip: input.ip },
  });

  return {
    token,
    role: input.role,
    staff_id: input.staff_id,
    actor_name: input.actor_name,
    permissions: input.permissions,
    canViewCompensation: input.role === "owner",
    expires_at: expiresAt,
  };
}

export async function getAdminSession(): Promise<AdminSessionUser | null> {
  if (!hasRealDatabase()) return null;
  const token = getCookie(ADMIN_COOKIE);
  if (!token) return null;
  const run = async () => {
    const sql = getSql();
    return (await sql`
      SELECT s.*, st.is_active AS staff_active
      FROM admin_sessions s
      LEFT JOIN gym_staff st ON st.id = s.staff_id
      WHERE s.token = ${token}
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
      LIMIT 1
    `) as any[];
  };
  let rows: any[];
  try {
    rows = await run();
  } catch {
    await ensureSchema();
    rows = await run();
  }
  const row = rows[0];
  if (!row) return null;
  if (row.staff_id && row.staff_active === false) return null;

  const permissions = (Array.isArray(row.permissions) ? row.permissions : []) as AdminPermission[];
  const role = row.role as AdminRole;
  return {
    token: row.token,
    role,
    staff_id: row.staff_id ?? null,
    actor_name: row.actor_name,
    permissions,
    canViewCompensation: role === "owner",
    expires_at: row.expires_at,
  };
}

export async function requireAdmin(permission?: AdminPermission, options?: { ownerOnly?: boolean }): Promise<AdminSessionUser> {
  const session = await getAdminSession();
  if (!session) {
    throw redirect({ to: "/admin" });
  }
  if (options?.ownerOnly && session.role !== "owner") {
    throw new Error("Owner authorization required for this operation.");
  }
  if (permission && session.role !== "owner" && !session.permissions.includes(permission)) {
    throw new Error(`Access denied: missing '${permission}' permission.`);
  }
  return session;
}

export async function destroyAdminSession(): Promise<void> {
  const token = getCookie(ADMIN_COOKIE);
  if (token && hasRealDatabase()) {
    const sql = getSql();
    await sql`UPDATE admin_sessions SET revoked_at = NOW() WHERE token = ${token}`;
  }
  deleteCookie(ADMIN_COOKIE, { path: "/", ...getCookieSecurity() });
}

async function logAdminActivityInternal(entry: {
  actor_name: string;
  actor_role: string;
  action: string;
  target_type?: string;
  target_id?: string | number;
  details?: Record<string, unknown>;
}) {
  try {
    const sql = getSql();
    await sql`
      INSERT INTO admin_activity_logs (actor_name, actor_role, action, target_type, target_id, details)
      VALUES (
        ${entry.actor_name},
        ${entry.actor_role},
        ${entry.action},
        ${entry.target_type ?? null},
        ${entry.target_id !== undefined ? String(entry.target_id) : null},
        ${entry.details ? JSON.stringify(entry.details) : null}::jsonb
      )
    `;
  } catch (err) {
    console.error("Failed to record admin activity log:", err);
  }
}

export async function logAdminActivity(
  admin: AdminSessionUser,
  action: string,
  target_type?: string,
  target_id?: string | number,
  details?: Record<string, unknown>,
) {
  await logAdminActivityInternal({
    actor_name: admin.actor_name,
    actor_role: admin.role,
    action,
    target_type,
    target_id,
    details,
  });
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const generated = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return timingSafeMatch(generated, signature);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeMatch(expected, signature);
}
