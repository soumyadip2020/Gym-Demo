import bcrypt from "bcryptjs";
import { getCookie, setCookie, deleteCookie, getRequestProtocol, getRequestHeader } from "@tanstack/react-start/server";
import { ensureSchema, getSql } from "./db.server";

const COOKIE = "f365_session";

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
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

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: number) {
  await ensureSchema();
  const sql = getSql();
  const token = randomToken();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expires.toISOString()})`;
  setCookie(COOKIE, token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    ...getCookieSecurity(),
  });
  return token;
}

export async function getCurrentUser() {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const run = async () => {
    const sql = getSql();
    return (await sql`
      SELECT u.id, u.email, u.name, u.height_cm, u.weight_kg, u.age, u.gender
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ${token} AND s.expires_at > NOW() LIMIT 1
    `) as any[];
  };
  try {
    const rows = await run();
    return rows[0] ?? null;
  } catch {
    await ensureSchema();
    const rows = await run();
    return rows[0] ?? null;
  }
}

export async function destroySession() {
  const token = getCookie(COOKIE);
  if (token) {
    const sql = getSql();
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }
  deleteCookie(COOKIE, { path: "/", ...getCookieSecurity() });
}
