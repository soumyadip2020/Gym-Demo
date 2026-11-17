import { neon } from "@neondatabase/serverless";

type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<any[]>;

interface MockStore {
  nextId: number;
  users: any[];
  sessions: any[];
  memberships: any[];
  check_ins: any[];
  workout_plans: any[];
  diet_plans: any[];
  progress_entries: any[];
  trainer_bookings: any[];
}

const GLOBAL_MOCK_KEY = "__FITNESS365_MOCK_DB__";

function getMockStore(): MockStore {
  const g = globalThis as unknown as Record<string, MockStore | undefined>;
  if (!g[GLOBAL_MOCK_KEY]) {
    g[GLOBAL_MOCK_KEY] = {
      nextId: 1,
      users: [],
      sessions: [],
      memberships: [],
      check_ins: [],
      workout_plans: [],
      diet_plans: [],
      progress_entries: [],
      trainer_bookings: [],
    };
  }
  return g[GLOBAL_MOCK_KEY]!;
}

function createMockSql(): SqlTag {
  console.warn("[AI Studio] DATABASE_URL not configured — using in-memory mock store (data resets on restart).");
  return async (strings: TemplateStringsArray, ...values: unknown[]): Promise<any[]> => {
    const query = strings.join("?").replace(/\s+/g, " ").trim();
    const db = getMockStore();

    if (/^CREATE TABLE/i.test(query)) {
      return [];
    }

    // Sessions
    if (/^INSERT INTO sessions/i.test(query)) {
      const [token, user_id, expires_at] = values;
      db.sessions.push({ token, user_id, expires_at, created_at: new Date().toISOString() });
      return [];
    }
    if (/FROM sessions s JOIN users u/i.test(query)) {
      const [token] = values;
      const now = Date.now();
      const sess = db.sessions.find((s) => s.token === token && new Date(s.expires_at).getTime() > now);
      if (!sess) return [];
      const user = db.users.find((u) => u.id === sess.user_id);
      if (!user) return [];
      return [{
        id: user.id,
        email: user.email,
        name: user.name,
        height_cm: user.height_cm,
        weight_kg: user.weight_kg,
        age: user.age,
        gender: user.gender,
      }];
    }
    if (/^DELETE FROM sessions/i.test(query)) {
      const [token] = values;
      db.sessions = db.sessions.filter((s) => s.token !== token);
      return [];
    }

    // Users
    if (/^SELECT id FROM users WHERE email/i.test(query)) {
      const [email] = values;
      const u = db.users.find((x) => x.email === email);
      return u ? [{ id: u.id }] : [];
    }
    if (/^SELECT id, password_hash FROM users WHERE email/i.test(query)) {
      const [email] = values;
      const u = db.users.find((x) => x.email === email);
      return u ? [{ id: u.id, password_hash: u.password_hash }] : [];
    }
    if (/^INSERT INTO users/i.test(query)) {
      const [email, password_hash, name] = values;
      const id = db.nextId++;
      db.users.push({
        id,
        email,
        password_hash,
        name,
        height_cm: null,
        weight_kg: null,
        age: null,
        gender: null,
        created_at: new Date().toISOString(),
      });
      return [{ id }];
    }
    if (/^UPDATE users SET/i.test(query)) {
      const [height_cm, weight_kg, age, gender, id] = values;
      const u = db.users.find((x) => x.id === id);
      if (u) {
        if (height_cm !== null && height_cm !== undefined) u.height_cm = height_cm;
        if (weight_kg !== null && weight_kg !== undefined) u.weight_kg = weight_kg;
        if (age !== null && age !== undefined) u.age = age;
        if (gender !== null && gender !== undefined) u.gender = gender;
      }
      return [];
    }

    // Check-ins
    if (/^SELECT day FROM check_ins/i.test(query)) {
      const [user_id] = values;
      return db.check_ins
        .filter((c) => c.user_id === user_id)
        .sort((a, b) => String(b.day).localeCompare(String(a.day)))
        .slice(0, 120)
        .map((c) => ({ day: c.day }));
    }
    if (/^INSERT INTO check_ins/i.test(query)) {
      const [user_id, day] = values;
      const exists = db.check_ins.some((c) => c.user_id === user_id && c.day === day);
      if (!exists) {
        db.check_ins.push({ id: db.nextId++, user_id, day, created_at: new Date().toISOString() });
      }
      return [];
    }

    // Memberships
    if (/FROM memberships WHERE user_id = \? AND ends_at > NOW\(\)/i.test(query)) {
      const [user_id] = values;
      const now = Date.now();
      return db.memberships
        .filter((m) => m.user_id === user_id && new Date(m.ends_at).getTime() > now)
        .sort((a, b) => new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime())
        .slice(0, 1);
    }
    if (/FROM memberships WHERE user_id = \? ORDER BY created_at DESC/i.test(query)) {
      const [user_id] = values;
      return db.memberships
        .filter((m) => m.user_id === user_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    if (/^INSERT INTO memberships/i.test(query)) {
      const [user_id, plan, ends_at, amount_inr, razorpay_payment_id] = values;
      db.memberships.push({
        id: db.nextId++,
        user_id,
        plan,
        status: "active",
        starts_at: new Date().toISOString(),
        ends_at,
        auto_renew: true,
        amount_inr,
        razorpay_payment_id,
        created_at: new Date().toISOString(),
      });
      return [];
    }

    // Workout plans
    if (/^INSERT INTO workout_plans/i.test(query)) {
      const [user_id, goal, dataStr] = values;
      const id = db.nextId++;
      const data = typeof dataStr === "string" ? JSON.parse(dataStr) : dataStr;
      db.workout_plans.push({ id, user_id, goal, data, created_at: new Date().toISOString() });
      return [{ id }];
    }
    if (/FROM workout_plans/i.test(query)) {
      const [user_id] = values;
      const limitMatch = query.match(/LIMIT (\d+)/i);
      const limit = limitMatch ? Number(limitMatch[1]) : 20;
      return db.workout_plans
        .filter((w) => w.user_id === user_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    }

    // Diet plans
    if (/^INSERT INTO diet_plans/i.test(query)) {
      const [user_id, goal, dataStr] = values;
      const id = db.nextId++;
      const data = typeof dataStr === "string" ? JSON.parse(dataStr) : dataStr;
      db.diet_plans.push({ id, user_id, goal, data, created_at: new Date().toISOString() });
      return [{ id }];
    }
    if (/FROM diet_plans/i.test(query)) {
      const [user_id] = values;
      const limitMatch = query.match(/LIMIT (\d+)/i);
      const limit = limitMatch ? Number(limitMatch[1]) : 20;
      return db.diet_plans
        .filter((d) => d.user_id === user_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    }

    // Progress entries
    if (/^INSERT INTO progress_entries/i.test(query)) {
      const [user_id, weight_kg, body_fat, muscle_mass, notes] = values;
      db.progress_entries.push({
        id: db.nextId++,
        user_id,
        day: new Date().toISOString().slice(0, 10),
        weight_kg,
        body_fat,
        muscle_mass,
        notes,
        created_at: new Date().toISOString(),
      });
      return [];
    }
    if (/FROM progress_entries/i.test(query)) {
      const [user_id] = values;
      const limitMatch = query.match(/LIMIT (\d+)/i);
      const limit = limitMatch ? Number(limitMatch[1]) : 1000;
      return db.progress_entries
        .filter((p) => p.user_id === user_id)
        .sort((a, b) => String(a.day).localeCompare(String(b.day)))
        .slice(0, limit);
    }

    // Trainer bookings
    if (/^INSERT INTO trainer_bookings/i.test(query)) {
      const [user_id, trainer_slug, plan, ends_at, amount_inr, razorpay_payment_id] = values;
      db.trainer_bookings.push({
        id: db.nextId++,
        user_id,
        trainer_slug,
        plan,
        starts_at: new Date().toISOString(),
        ends_at,
        amount_inr,
        razorpay_payment_id,
        created_at: new Date().toISOString(),
      });
      return [];
    }
    if (/FROM trainer_bookings/i.test(query)) {
      const [user_id] = values;
      return db.trainer_bookings
        .filter((t) => t.user_id === user_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return [];
  };
}

let _sql: SqlTag | null = null;
let _mockSql: SqlTag | null = null;
export function getSql(): SqlTag {
  const url = (
    process.env.DATABASE_URL ||
    (import.meta as any).env?.DATABASE_URL ||
    (import.meta as any).env?.VITE_DATABASE_URL ||
    ""
  ).trim();
  if (!url) {
    if (!_mockSql) _mockSql = createMockSql();
    return _mockSql;
  }
  if (_sql) return _sql;
  _sql = neon(url) as unknown as SqlTag;
  return _sql;
}

let _initPromise: Promise<void> | null = null;
export async function ensureSchema() {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const sql = getSql();
    await sql`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      height_cm NUMERIC,
      weight_kg NUMERIC,
      age INT,
      gender TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await Promise.all([
      sql`CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS memberships (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        starts_at TIMESTAMPTZ DEFAULT NOW(),
        ends_at TIMESTAMPTZ NOT NULL,
        auto_renew BOOLEAN DEFAULT true,
        amount_inr NUMERIC,
        razorpay_payment_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS check_ins (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, day)
      )`,
      sql`CREATE TABLE IF NOT EXISTS workout_plans (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goal TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS diet_plans (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goal TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS progress_entries (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day DATE NOT NULL DEFAULT CURRENT_DATE,
        weight_kg NUMERIC,
        body_fat NUMERIC,
        muscle_mass NUMERIC,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS trainer_bookings (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trainer_slug TEXT NOT NULL,
        plan TEXT NOT NULL,
        starts_at TIMESTAMPTZ DEFAULT NOW(),
        ends_at TIMESTAMPTZ NOT NULL,
        amount_inr NUMERIC,
        razorpay_payment_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    ]);
  })().catch((err) => {
    _initPromise = null;
    throw err;
  });
  return _initPromise;
}
