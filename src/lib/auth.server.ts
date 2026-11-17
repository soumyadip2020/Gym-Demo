import bcrypt from "bcryptjs";
import { getCookie, setCookie, deleteCookie, getRequestProtocol } from "@tanstack/react-start/server";
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
    isHttps = getRequestProtocol({ xForwardedProto: true }) === "https";
  } catch {
    isHttps = false;
  }
  return {
    sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
    secure: isHttps,
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
  const { sameSite, secure } = getCookieSecurity();
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

export async function getCurrentUser() {
  const token = getCookie(COOKIE);
  if (!token) return null;
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT u.id, u.email, u.name, u.height_cm, u.weight_kg, u.age, u.gender
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW() LIMIT 1
  `) as any[];
  return rows[0] ?? null;
}

export async function destroySession() {
  const token = getCookie(COOKIE);
  if (token) {
    const sql = getSql();
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }
  const { sameSite, secure } = getCookieSecurity();
  deleteCookie(COOKIE, { path: "/", sameSite, secure });
}
