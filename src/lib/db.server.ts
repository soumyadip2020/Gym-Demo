import { neon } from "@neondatabase/serverless";
import { TRAINERS } from "./trainers";

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

    if (/^(CREATE|ALTER|INSERT INTO (gym_settings|membership_plans|gym_trainers|payments))/i.test(query)) {
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
      const user = db.users.find((u) => u.id === sess.user_id && (u.status ?? "active") !== "archived");
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
    if (/^SELECT .* FROM users WHERE email/i.test(query)) {
      const [email] = values;
      const u = db.users.find((x) => x.email === email);
      return u ? [u] : [];
    }
    if (/^INSERT INTO users/i.test(query)) {
      const [email, password_hash, name] = values;
      const id = db.nextId++;
      const row = {
        id,
        email,
        password_hash,
        name,
        height_cm: null,
        weight_kg: null,
        age: null,
        gender: null,
        phone: null,
        avatar_url: null,
        status: "active",
        created_at: new Date().toISOString(),
      };
      db.users.push(row);
      return [row];
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
        db.check_ins.push({
          id: db.nextId++,
          user_id,
          day,
          checked_in_at: new Date().toISOString(),
          checked_out_at: null,
          source: "member",
          created_at: new Date().toISOString(),
        });
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
      const id = db.nextId++;
      db.memberships.push({
        id,
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
      return [{ id }];
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
      const id = db.nextId++;
      db.trainer_bookings.push({
        id,
        user_id,
        trainer_slug,
        plan,
        starts_at: new Date().toISOString(),
        ends_at,
        amount_inr,
        razorpay_payment_id,
        created_at: new Date().toISOString(),
      });
      return [{ id }];
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

export function hasRealDatabase(): boolean {
  return Boolean(
    (
      process.env.DATABASE_URL ||
      (import.meta as any).env?.DATABASE_URL ||
      (import.meta as any).env?.VITE_DATABASE_URL ||
      ""
    ).trim(),
  );
}

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

const DEFAULT_PLANS = [
  {
    slug: "trial",
    name: "Free Trial",
    description: "7-day introductory ecosystem pass.",
    price_inr: 0,
    duration_days: 7,
    benefits: ["Full AI Dashboard", "Basic Workout Plan", "Community Access"],
  },
  {
    slug: "monthly",
    name: "Monthly",
    description: "Flexible month-to-month performance access.",
    price_inr: 999,
    duration_days: 30,
    benefits: ["Everything in Trial", "Direct Trainer Chat", "Priority AI Processing"],
  },
  {
    slug: "quarterly",
    name: "Quarterly",
    description: "90-day transformation protocol.",
    price_inr: 2499,
    duration_days: 90,
    benefits: ["Save 16%", "Custom Bio-Metrics", "Priority Support Hub"],
  },
  {
    slug: "annual",
    name: "Annual",
    description: "365-day complete athletic membership.",
    price_inr: 7999,
    duration_days: 365,
    benefits: ["Save 33%", "All Feature Unlocks", "Free Trainer Sessions"],
  },
];

let _initPromise: Promise<void> | null = null;
export async function ensureSchema() {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const sql = getSql();

    // Base tables
    await sql`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      height_cm NUMERIC,
      weight_kg NUMERIC,
      age INT,
      gender TEXT,
      phone TEXT,
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
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
        plan_id INT,
        payment_status TEXT NOT NULL DEFAULT 'paid',
        paused_at TIMESTAMPTZ,
        paused_days_remaining INT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS check_ins (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day DATE NOT NULL,
        checked_in_at TIMESTAMPTZ DEFAULT NOW(),
        checked_out_at TIMESTAMPTZ,
        source TEXT NOT NULL DEFAULT 'member',
        corrected_by TEXT,
        correction_note TEXT,
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
      sql`CREATE TABLE IF NOT EXISTS gym_settings (
        id INT PRIMARY KEY DEFAULT 1,
        gym_name TEXT NOT NULL DEFAULT 'Fitness 365',
        early_warning_days INT NOT NULL DEFAULT 3,
        inactive_days INT NOT NULL DEFAULT 5,
        high_priority_days INT NOT NULL DEFAULT 7,
        critical_days INT NOT NULL DEFAULT 14,
        expiry_alert_days INT NOT NULL DEFAULT 7,
        whatsapp_template TEXT NOT NULL DEFAULT 'Hey {name}! We haven''t seen you at the gym lately. Hope everything is going well. We would love to see you back. Let us know if you need any help with your fitness journey!',
        renewal_template TEXT NOT NULL DEFAULT 'Hi {name}, your {plan} membership at Fitness 365 expires on {expiry}. Renew now to keep your streak going!',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS membership_plans (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        price_inr NUMERIC NOT NULL DEFAULT 0,
        duration_days INT NOT NULL DEFAULT 30,
        benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_archived BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS gym_trainers (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        photo_url TEXT,
        specialization TEXT NOT NULL,
        experience_years INT NOT NULL DEFAULT 1,
        bio TEXT DEFAULT '',
        monthly_price NUMERIC NOT NULL DEFAULT 2500,
        quarterly_price NUMERIC NOT NULL DEFAULT 6500,
        annual_price NUMERIC NOT NULL DEFAULT 22000,
        working_hours TEXT DEFAULT '6:00 AM - 2:00 PM',
        availability TEXT DEFAULT 'Mon - Sat',
        compensation_type TEXT NOT NULL DEFAULT 'salary',
        salary_inr NUMERIC NOT NULL DEFAULT 0,
        commission_pct NUMERIC NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS gym_staff (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'receptionist',
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        salary_inr NUMERIC NOT NULL DEFAULT 0,
        shift_hours TEXT DEFAULT '9:00 AM - 6:00 PM',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS admin_rate_limits (
        key TEXT PRIMARY KEY,
        attempts INT NOT NULL DEFAULT 0,
        window_started_at TIMESTAMPTZ DEFAULT NOW(),
        locked_until TIMESTAMPTZ
      )`,
      sql`CREATE TABLE IF NOT EXISTS gym_expenses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        amount_inr NUMERIC NOT NULL,
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        description TEXT,
        payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
        receipt_url TEXT,
        recorded_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS contact_enquiries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id SERIAL PRIMARY KEY,
        actor_name TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    ]);

    // Dependent tables & safe column migrations on pre-existing tables
    await Promise.all([
      sql`CREATE TABLE IF NOT EXISTS admin_sessions (
        token TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        staff_id INT REFERENCES gym_staff(id) ON DELETE CASCADE,
        actor_name TEXT NOT NULL,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        ip_address TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        membership_id INT REFERENCES memberships(id) ON DELETE SET NULL,
        trainer_booking_id INT REFERENCES trainer_bookings(id) ON DELETE SET NULL,
        transaction_id TEXT UNIQUE NOT NULL,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT UNIQUE,
        razorpay_signature TEXT,
        amount_inr NUMERIC NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'razorpay',
        purpose TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'paid',
        notes TEXT,
        refund_id TEXT,
        refunded_at TIMESTAMPTZ,
        recorded_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`CREATE TABLE IF NOT EXISTS trainer_assignments (
        id SERIAL PRIMARY KEY,
        trainer_id INT NOT NULL REFERENCES gym_trainers(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        schedule_notes TEXT,
        completed_sessions INT NOT NULL DEFAULT 0,
        pending_sessions INT NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(trainer_id, user_id)
      )`,
      sql`CREATE TABLE IF NOT EXISTS member_followups (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel TEXT NOT NULL DEFAULT 'note',
        inactivity_tier TEXT,
        note TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        scheduled_for DATE,
        completed_at TIMESTAMPTZ,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`,
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`,
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT`,
      sql`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS plan_id INT`,
      sql`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid'`,
      sql`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ`,
      sql`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS paused_days_remaining INT`,
      sql`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ DEFAULT NOW()`,
      sql`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ`,
      sql`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'member'`,
      sql`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS corrected_by TEXT`,
      sql`ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS correction_note TEXT`,
      sql`ALTER TABLE admin_activity_logs ADD COLUMN IF NOT EXISTS actor_name TEXT`,
      sql`ALTER TABLE admin_activity_logs ADD COLUMN IF NOT EXISTS actor_role TEXT`,
      sql`ALTER TABLE admin_activity_logs ADD COLUMN IF NOT EXISTS target_type TEXT`,
      sql`ALTER TABLE admin_activity_logs ADD COLUMN IF NOT EXISTS target_id TEXT`,
      sql`ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS actor_name TEXT NOT NULL DEFAULT 'Gym Owner'`,
      sql`ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb`,
      sql`ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ`,
      sql`ALTER TABLE gym_staff ADD COLUMN IF NOT EXISTS password_hash TEXT`,
      sql`ALTER TABLE gym_staff ADD COLUMN IF NOT EXISTS salary_inr NUMERIC NOT NULL DEFAULT 0`,
      sql`ALTER TABLE gym_staff ADD COLUMN IF NOT EXISTS shift_hours TEXT DEFAULT '9:00 AM - 6:00 PM'`,
      sql`ALTER TABLE gym_trainers ADD COLUMN IF NOT EXISTS experience_years INT NOT NULL DEFAULT 1`,
      sql`ALTER TABLE gym_trainers ADD COLUMN IF NOT EXISTS monthly_price NUMERIC NOT NULL DEFAULT 2500`,
      sql`ALTER TABLE gym_trainers ADD COLUMN IF NOT EXISTS quarterly_price NUMERIC NOT NULL DEFAULT 6500`,
      sql`ALTER TABLE gym_trainers ADD COLUMN IF NOT EXISTS annual_price NUMERIC NOT NULL DEFAULT 22000`,
      sql`ALTER TABLE gym_trainers ADD COLUMN IF NOT EXISTS compensation_type TEXT NOT NULL DEFAULT 'salary'`,
      sql`ALTER TABLE gym_trainers ADD COLUMN IF NOT EXISTS salary_inr NUMERIC NOT NULL DEFAULT 0`,
      sql`ALTER TABLE member_followups ADD COLUMN IF NOT EXISTS inactivity_tier TEXT`,
      sql`ALTER TABLE member_followups ADD COLUMN IF NOT EXISTS scheduled_for DATE`,
      sql`ALTER TABLE member_followups ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`,
      sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS membership_id INT`,
      sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS trainer_booking_id INT`,
      sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id TEXT`,
      sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ`,
      sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by TEXT`,
      sql`ALTER TABLE trainer_assignments ADD COLUMN IF NOT EXISTS schedule_notes TEXT`,
    ]);

    // Indexes & seed defaults (only when real database is active)
    if (hasRealDatabase()) {
      await Promise.all([
        sql`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
        sql`CREATE INDEX IF NOT EXISTS idx_memberships_user_ends ON memberships(user_id, ends_at DESC)`,
        sql`CREATE INDEX IF NOT EXISTS idx_checkins_user_day ON check_ins(user_id, day DESC)`,
        sql`CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC)`,
        sql`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`,
        sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id) WHERE transaction_id IS NOT NULL`,
        sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_rzp_payment_id ON payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL`,
        sql`CREATE INDEX IF NOT EXISTS idx_admin_sessions_exp ON admin_sessions(expires_at)`,
        sql`CREATE INDEX IF NOT EXISTS idx_followups_user ON member_followups(user_id, status)`,
        sql`CREATE INDEX IF NOT EXISTS idx_logs_created ON admin_activity_logs(created_at DESC)`,
        sql`INSERT INTO gym_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
        sql`DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gym_trainers' AND column_name = 'years_experience') THEN
            UPDATE gym_trainers
            SET experience_years = COALESCE(years_experience, experience_years),
                monthly_price = COALESCE(price_monthly_inr, monthly_price),
                quarterly_price = COALESCE(price_quarterly_inr, quarterly_price),
                annual_price = COALESCE(price_annual_inr, annual_price)
            WHERE experience_years = 1 OR monthly_price = 2500;
          END IF;
        END $$`,
      ]);

      await Promise.all([
        ...DEFAULT_PLANS.map(
          (p) =>
            sql`INSERT INTO membership_plans (slug, name, description, price_inr, duration_days, benefits)
              VALUES (${p.slug}, ${p.name}, ${p.description}, ${p.price_inr}, ${p.duration_days}, ${JSON.stringify(p.benefits)}::jsonb)
              ON CONFLICT (slug) DO NOTHING`,
        ),
        ...TRAINERS.map(
          (t, idx) =>
            sql`INSERT INTO gym_trainers (slug, name, photo_url, specialization, experience_years, bio, monthly_price, quarterly_price, annual_price)
              VALUES (${t.slug}, ${t.name}, ${`/images/trainer-${(idx % 3) + 1}.png`}, ${t.spec}, ${t.years}, ${t.bio}, ${t.prices.monthly}, ${t.prices.quarterly}, ${t.prices.annual})
              ON CONFLICT (slug) DO NOTHING`,
        ),
      ]);

      // Backfill payments once for any pre-existing paid memberships/trainer bookings without duplicating
      await Promise.all([
        sql`INSERT INTO payments (user_id, membership_id, transaction_id, razorpay_payment_id, amount_inr, payment_method, purpose, status, created_at)
          SELECT m.user_id, m.id, COALESCE(m.razorpay_payment_id, 'MEM-' || m.id), m.razorpay_payment_id, COALESCE(m.amount_inr, 0),
                 CASE WHEN m.razorpay_payment_id IS NOT NULL THEN 'razorpay' ELSE 'manual' END,
                 'Membership: ' || m.plan, COALESCE(m.payment_status, 'paid'), m.created_at
          FROM memberships m
          WHERE COALESCE(m.amount_inr, 0) > 0
            AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.membership_id = m.id)
          ON CONFLICT DO NOTHING`,
        sql`INSERT INTO payments (user_id, trainer_booking_id, transaction_id, razorpay_payment_id, amount_inr, payment_method, purpose, status, created_at)
          SELECT tb.user_id, tb.id, COALESCE(tb.razorpay_payment_id, 'TRN-' || tb.id), tb.razorpay_payment_id, COALESCE(tb.amount_inr, 0),
                 CASE WHEN tb.razorpay_payment_id IS NOT NULL THEN 'razorpay' ELSE 'manual' END,
                 'Trainer: ' || tb.trainer_slug || ' (' || tb.plan || ')', 'paid', tb.created_at
          FROM trainer_bookings tb
          WHERE COALESCE(tb.amount_inr, 0) > 0
            AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.trainer_booking_id = tb.id)
          ON CONFLICT DO NOTHING`,
      ]);
    }
  })().catch((err) => {
    _initPromise = null;
    throw err;
  });
  return _initPromise;
}
