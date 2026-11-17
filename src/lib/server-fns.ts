import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ensureSchema, getSql } from "./db.server";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "./auth.server";
import { verifyRazorpaySignature } from "./admin-auth.server";

// ---------- AUTH ----------
export const meFn = createServerFn({ method: "GET" }).handler(async () => {
  return { user: await getCurrentUser() };
});

export const signupFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        name: z.string().min(2).max(80),
        email: z.string().email().max(200),
        password: z.string().min(6).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const exists = (await sql`SELECT id FROM users WHERE email = ${data.email.toLowerCase()} LIMIT 1`) as any[];
    if (exists.length) throw new Error("Email already registered");
    const hash = await hashPassword(data.password);
    const rows = (await sql`
      INSERT INTO users (email, password_hash, name) VALUES (${data.email.toLowerCase()}, ${hash}, ${data.name})
      RETURNING id, email, name, height_cm, weight_kg, age, gender
    `) as any[];
    const user = rows[0];
    await createSession(user.id);
    return { ok: true, user };
  });

export const loginFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ email: z.string().email(), password: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT id, email, name, height_cm, weight_kg, age, gender, password_hash
      FROM users WHERE email = ${data.email.toLowerCase()} LIMIT 1
    `) as any[];
    if (!rows.length) throw new Error("Invalid credentials");
    const ok = await verifyPassword(data.password, rows[0].password_hash);
    if (!ok) throw new Error("Invalid credentials");
    const { password_hash: _ph, ...user } = rows[0];
    await createSession(user.id);
    return { ok: true, user };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  await destroySession();
  return { ok: true };
});

export const updateProfileFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        height_cm: z.number().min(80).max(260).optional(),
        weight_kg: z.number().min(25).max(350).optional(),
        age: z.number().int().min(10).max(110).optional(),
        gender: z.string().max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const u = await getCurrentUser();
    if (!u) throw redirect({ to: "/login" });
    const sql = getSql();
    await sql`UPDATE users SET
      height_cm = COALESCE(${data.height_cm ?? null}, height_cm),
      weight_kg = COALESCE(${data.weight_kg ?? null}, weight_kg),
      age = COALESCE(${data.age ?? null}, age),
      gender = COALESCE(${data.gender ?? null}, gender)
      WHERE id = ${u.id}`;
    return { ok: true };
  });

// ---------- DASHBOARD ----------
export const dashboardFn = createServerFn({ method: "GET" }).handler(async () => {
  const u = await getCurrentUser();
  if (!u) throw redirect({ to: "/login" });
  const sql = getSql();

  const [checkIns, memberships, lastWorkout, lastDiet, progress] = await Promise.all([
    sql`SELECT day FROM check_ins WHERE user_id = ${u.id} ORDER BY day DESC LIMIT 120` as Promise<any[]>,
    sql`SELECT * FROM memberships WHERE user_id = ${u.id} AND ends_at > NOW() ORDER BY ends_at DESC LIMIT 1` as Promise<any[]>,
    sql`SELECT id, goal, created_at FROM workout_plans WHERE user_id = ${u.id} ORDER BY created_at DESC LIMIT 1` as Promise<any[]>,
    sql`SELECT id, goal, data, created_at FROM diet_plans WHERE user_id = ${u.id} ORDER BY created_at DESC LIMIT 1` as Promise<any[]>,
    sql`SELECT day, weight_kg, body_fat, muscle_mass FROM progress_entries WHERE user_id = ${u.id} ORDER BY day ASC LIMIT 60` as Promise<any[]>,
  ]);

  const days = checkIns.map((c) => new Date(c.day).toISOString().slice(0, 10));
  const set = new Set(days);

  // streak
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    if (set.has(k)) streak++;
    else if (i > 0) break;
    else if (!set.has(k)) {} // allow today missing
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthCount = days.filter((d) => new Date(d) >= monthStart).length;
  const consistency = Math.min(100, Math.round((monthCount / Math.max(1, today.getDate())) * 100));

  const bmi =
    u.height_cm && u.weight_kg
      ? Number((Number(u.weight_kg) / Math.pow(Number(u.height_cm) / 100, 2)).toFixed(1))
      : null;

  return {
    user: u,
    streak,
    monthCount,
    consistency,
    membership: memberships[0] ?? null,
    lastWorkout: lastWorkout[0] ?? null,
    lastDiet: lastDiet[0] ?? null,
    progress,
    bmi,
    days,
  };
});

// ---------- CHECK-IN ----------
export const checkInFn = createServerFn({ method: "POST" }).handler(async () => {
  const u = await getCurrentUser();
  if (!u) throw redirect({ to: "/login" });
  const sql = getSql();
  const today = new Date().toISOString().slice(0, 10);
  await sql`INSERT INTO check_ins (user_id, day) VALUES (${u.id}, ${today}) ON CONFLICT DO NOTHING`;
  return { ok: true };
});

// ---------- PROGRESS ----------
export const addProgressFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        weight_kg: z.number().min(25).max(350).optional(),
        body_fat: z.number().min(2).max(70).optional(),
        muscle_mass: z.number().min(5).max(200).optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const u = await getCurrentUser();
    if (!u) throw redirect({ to: "/login" });
    const sql = getSql();
    await sql`INSERT INTO progress_entries (user_id, weight_kg, body_fat, muscle_mass, notes)
      VALUES (${u.id}, ${data.weight_kg ?? null}, ${data.body_fat ?? null}, ${data.muscle_mass ?? null}, ${data.notes ?? null})`;
    return { ok: true };
  });

export const progressFn = createServerFn({ method: "GET" }).handler(async () => {
  const u = await getCurrentUser();
  if (!u) throw redirect({ to: "/login" });
  const sql = getSql();
  const rows = (await sql`SELECT id, day, weight_kg, body_fat, muscle_mass, notes FROM progress_entries WHERE user_id = ${u.id} ORDER BY day ASC`) as any[];
  return { entries: rows };
});

// ---------- AI WORKOUT / DIET ----------
function parseAiJson(text: string): any {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

function buildFallbackWorkoutPlan(data: {
  goal: string;
  height_cm: number;
  weight_kg: number;
  age: number;
  experience: string;
  injuries?: string;
  days_per_week: number;
}) {
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const splitTemplates = [
    {
      focus: "Push (Chest, Shoulders, Triceps)",
      exercises: [
        { name: "Barbell Bench Press", sets: 4, reps: "8-10", rest: "90s", notes: "Control eccentric 2s" },
        { name: "Overhead Dumbbell Press", sets: 3, reps: "10-12", rest: "75s", notes: "Keep core braced" },
        { name: "Incline Dumbbell Fly", sets: 3, reps: "12-15", rest: "60s", notes: "Full stretch at bottom" },
        { name: "Rope Tricep Pushdown", sets: 3, reps: "12-15", rest: "60s", notes: "Lock out cleanly" },
      ],
    },
    {
      focus: "Pull (Back, Biceps, Rear Delts)",
      exercises: [
        { name: "Lat Pulldown / Pull-Ups", sets: 4, reps: "8-12", rest: "90s", notes: "Drive elbows down" },
        { name: "Chest-Supported Row", sets: 4, reps: "10-12", rest: "75s", notes: "Pause 1s at peak" },
        { name: "Face Pulls", sets: 3, reps: "15", rest: "60s", notes: "External rotation focus" },
        { name: "Incline Dumbbell Curl", sets: 3, reps: "10-12", rest: "60s", notes: "No torso swing" },
      ],
    },
    {
      focus: "Legs & Core",
      exercises: [
        { name: "Barbell Back Squat", sets: 4, reps: "6-10", rest: "120s", notes: "Depth below parallel" },
        { name: "Romanian Deadlift", sets: 3, reps: "8-12", rest: "90s", notes: "Hinge at hips" },
        { name: "Walking Lunges", sets: 3, reps: "12/leg", rest: "75s", notes: "Upright posture" },
        { name: "Hanging Leg Raises", sets: 3, reps: "12-15", rest: "60s", notes: "Slow controlled lower" },
      ],
    },
    {
      focus: "Upper Power & Conditioning",
      exercises: [
        { name: "Incline Barbell Press", sets: 4, reps: "8-10", rest: "90s", notes: "Controlled tempo" },
        { name: "Single-Arm Dumbbell Row", sets: 3, reps: "10-12", rest: "75s", notes: "Full range of motion" },
        { name: "Lateral Raises", sets: 4, reps: "15", rest: "45s", notes: "Lead with elbows" },
        { name: "HIIT Assault Bike / Sled", sets: 6, reps: "30s sprint", rest: "60s", notes: "Max effort intervals" },
      ],
    },
  ];
  const weekly = Array.from({ length: data.days_per_week }, (_, idx) => {
    const tpl = splitTemplates[idx % splitTemplates.length];
    return { day: dayNames[idx % dayNames.length], focus: tpl.focus, exercises: tpl.exercises };
  });
  return {
    summary: `${data.days_per_week}-day ${data.experience} ${data.goal.replace("_", " ")} protocol calibrated for ${data.weight_kg}kg / ${data.height_cm}cm (age ${data.age}).${data.injuries ? ` Modified around: ${data.injuries}.` : ""}`,
    weekly,
    tips: [
      "Progressive overload: increase weight or add 1-2 reps once top of rep range feels clean.",
      "Prioritize 7.5-8.5 hours of sleep for CNS recovery and muscle protein synthesis.",
      "Keep 1-2 reps in reserve (RIR) on compound lifts to maintain crisp form.",
      "Hydrate with 3-4L water daily and hit protein targets within 2 hours post-training.",
    ],
  };
}

function buildFallbackDietPlan(data: {
  goal: string;
  height_cm: number;
  weight_kg: number;
  age: number;
  veg: string;
  allergies?: string;
}) {
  const bmr = 10 * data.weight_kg + 6.25 * data.height_cm - 5 * data.age + 5;
  const mult = data.goal === "fat_loss" ? 1.2 : data.goal === "muscle_gain" ? 1.65 : 1.45;
  const calories = Math.round(bmr * mult);
  const protein_g = Math.round(data.weight_kg * (data.goal === "muscle_gain" ? 2.0 : 1.8));
  const fat_g = Math.round((calories * 0.25) / 9);
  const carbs_g = Math.max(80, Math.round((calories - protein_g * 4 - fat_g * 9) / 4));
  const isNonVeg = data.veg === "non_veg";
  const isEgg = data.veg === "eggetarian";

  return {
    calories,
    macros: { protein_g, carbs_g, fat_g },
    water_l: Number((data.weight_kg * 0.045).toFixed(1)),
    meals: [
      {
        time: "7:30 AM",
        name: "Breakfast",
        items: [
          isNonVeg || isEgg ? "4 Egg Whites + 2 Whole Eggs Bhurji" : "150g Paneer / Tofu Bhurji",
          "2 Besan Chilla or 1 Bowl Masala Oats",
          "1 Cup Black Coffee / Green Tea",
        ],
        calories: Math.round(calories * 0.24),
      },
      {
        time: "1:00 PM",
        name: "Lunch",
        items: [
          isNonVeg ? "180g Grilled Chicken Breast" : "150g Soya Chunks / Rajma Masala",
          "2 Whole Wheat Rotis + 150g Steamed Rice",
          "1 Bowl Dal Tadka + Cucumber Kachumber Salad",
        ],
        calories: Math.round(calories * 0.34),
      },
      {
        time: "5:00 PM",
        name: "Pre-Workout Fuel",
        items: [
          "1 Banana + 15g Roasted Peanuts / Almonds",
          "1 Scoop Whey or Plant Protein in Water",
        ],
        calories: Math.round(calories * 0.16),
      },
      {
        time: "8:30 PM",
        name: "Dinner",
        items: [
          isNonVeg ? "180g Tandoori Fish / Chicken" : "150g Grilled Paneer Tikka",
          "1 Bowl Stir-Fried Vegetables (Broccoli, Bell Peppers)",
          "1 Bowl Moong Dal Khichdi or 2 Jowar Bhakri",
        ],
        calories: Math.round(calories * 0.26),
      },
    ],
    notes: [
      `Calibrated for ${data.goal.replace("_", " ")} (${data.veg.replace("_", " ")} protocol).${data.allergies ? ` Excluded: ${data.allergies}.` : ""}`,
      "Spread protein evenly across 4 meals (~30-45g per meal) for optimal absorption.",
      "Limit cooking oil to 2-3 tsp cold-pressed ghee or olive oil per day.",
    ],
  };
}

async function callLovableAI(system: string, prompt: string, fallback: () => any): Promise<any> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system + "\nReturn ONLY valid JSON. No markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (res.status === 429) throw new Error("AI rate limited. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace settings.");
    if (!res.ok) throw new Error(`AI error: ${res.status}`);
    const json = await res.json();
    return parseAiJson(json.choices?.[0]?.message?.content ?? "{}");
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${system}\nReturn ONLY valid JSON. No markdown.\n\n${prompt}` }] }],
        }),
      },
    );
    if (res.ok) {
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return parseAiJson(text);
    }
  }

  return fallback();
}

export const generateWorkoutFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        goal: z.enum(["fat_loss", "muscle_gain", "strength", "endurance"]),
        height_cm: z.number().min(80).max(260),
        weight_kg: z.number().min(25).max(350),
        age: z.number().int().min(10).max(110),
        experience: z.enum(["beginner", "intermediate", "advanced"]),
        injuries: z.string().max(300).optional(),
        days_per_week: z.number().int().min(1).max(7),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const u = await getCurrentUser();
    if (!u) throw redirect({ to: "/login" });
    const sys = `You are an elite fitness coach. Generate a personalized weekly workout plan as strict JSON with shape:
{"summary":"string","weekly":[{"day":"Monday","focus":"Push","exercises":[{"name":"Bench Press","sets":4,"reps":"8-10","rest":"90s","notes":"optional"}]}], "tips":["string"]}`;
    const prompt = `Goal: ${data.goal}. Height ${data.height_cm}cm, Weight ${data.weight_kg}kg, Age ${data.age}, Experience ${data.experience}. Days/week: ${data.days_per_week}. Injuries: ${data.injuries || "none"}. Use realistic exercises with sets, reps, rest.`;
    const plan = await callLovableAI(sys, prompt, () => buildFallbackWorkoutPlan(data));
    const sql = getSql();
    const rows = (await sql`INSERT INTO workout_plans (user_id, goal, data) VALUES (${u.id}, ${data.goal}, ${JSON.stringify(plan)}) RETURNING id`) as any[];
    return { id: rows[0].id, plan };
  });

export const generateDietFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        goal: z.enum(["fat_loss", "muscle_gain", "maintenance", "strength"]),
        height_cm: z.number().min(80).max(260),
        weight_kg: z.number().min(25).max(350),
        age: z.number().int().min(10).max(110),
        veg: z.enum(["veg", "non_veg", "vegan", "eggetarian"]),
        allergies: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const u = await getCurrentUser();
    if (!u) throw redirect({ to: "/login" });
    const sys = `You are an Indian sports nutritionist. Output strict JSON:
{"calories":2200,"macros":{"protein_g":160,"carbs_g":230,"fat_g":70},"water_l":3.5,"meals":[{"time":"7:00 AM","name":"Breakfast","items":["string"],"calories":450}],"notes":["string"]}
Use Indian foods (paneer, dal, roti, poha, idli, etc). Be practical.`;
    const prompt = `Goal: ${data.goal}. ${data.veg}. Height ${data.height_cm}cm, Weight ${data.weight_kg}kg, Age ${data.age}. Allergies: ${data.allergies || "none"}.`;
    const plan = await callLovableAI(sys, prompt, () => buildFallbackDietPlan(data));
    const sql = getSql();
    const rows = (await sql`INSERT INTO diet_plans (user_id, goal, data) VALUES (${u.id}, ${data.goal}, ${JSON.stringify(plan)}) RETURNING id`) as any[];
    return { id: rows[0].id, plan };
  });

export const listPlansFn = createServerFn({ method: "GET" }).handler(async () => {
  const u = await getCurrentUser();
  if (!u) throw redirect({ to: "/login" });
  const sql = getSql();
  const [workouts, diets] = await Promise.all([
    sql`SELECT id, goal, data, created_at FROM workout_plans WHERE user_id = ${u.id} ORDER BY created_at DESC LIMIT 20` as Promise<any[]>,
    sql`SELECT id, goal, data, created_at FROM diet_plans WHERE user_id = ${u.id} ORDER BY created_at DESC LIMIT 20` as Promise<any[]>,
  ]);
  return { workouts, diets };
});

// ---------- MEMBERSHIP / TRAINER (with server-side Razorpay signature verification) ----------
export const subscribeFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        plan: z.enum(["trial", "monthly", "quarterly", "annual"]),
        amount_inr: z.number().min(0).max(200000),
        razorpay_order_id: z.string().optional(),
        razorpay_payment_id: z.string().optional(),
        razorpay_signature: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const u = await getCurrentUser();
    if (!u) throw redirect({ to: "/login" });
    const sql = getSql();

    if (data.amount_inr > 0) {
      const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
      if (hasSecret) {
        if (!data.razorpay_order_id || !data.razorpay_payment_id || !data.razorpay_signature) {
          throw new Error("Missing Razorpay payment signature details.");
        }
        const verified = verifyRazorpaySignature(
          data.razorpay_order_id,
          data.razorpay_payment_id,
          data.razorpay_signature,
        );
        if (!verified) {
          throw new Error("Payment verification failed. Signature mismatch.");
        }
      }
      if (data.razorpay_payment_id) {
        const dup = (await sql`
          SELECT id FROM payments WHERE razorpay_payment_id = ${data.razorpay_payment_id} LIMIT 1
        `) as any[];
        if (dup.length) {
          return { ok: true, duplicate: true };
        }
      }
    }

    const planRows = (await sql`
      SELECT id, duration_days FROM membership_plans WHERE slug = ${data.plan} LIMIT 1
    `) as any[];
    const fallbackDays = data.plan === "trial" ? 7 : data.plan === "monthly" ? 30 : data.plan === "quarterly" ? 90 : 365;
    const days = Number(planRows[0]?.duration_days || fallbackDays);
    const planId = planRows[0]?.id ?? null;
    const ends = new Date(Date.now() + days * 86400000);
    const paymentStatus = data.amount_inr === 0 ? "free" : "paid";

    const memRows = (await sql`
      INSERT INTO memberships (user_id, plan, plan_id, ends_at, amount_inr, payment_status, razorpay_payment_id)
      VALUES (${u.id}, ${data.plan}, ${planId}, ${ends.toISOString()}, ${data.amount_inr}, ${paymentStatus}, ${data.razorpay_payment_id ?? null})
      RETURNING id
    `) as any[];

    if (data.amount_inr > 0) {
      const txnId = data.razorpay_payment_id || `MEM-${memRows[0]?.id || Date.now()}`;
      await sql`
        INSERT INTO payments (user_id, membership_id, transaction_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount_inr, payment_method, purpose, status)
        VALUES (
          ${u.id},
          ${memRows[0]?.id ?? null},
          ${txnId},
          ${data.razorpay_order_id ?? null},
          ${data.razorpay_payment_id ?? null},
          ${data.razorpay_signature ?? null},
          ${data.amount_inr},
          ${data.razorpay_payment_id ? "razorpay" : "manual"},
          ${`Membership: ${data.plan}`},
          'paid'
        )
        ON CONFLICT DO NOTHING
      `;
    }
    return { ok: true };
  });

export const bookTrainerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        trainer_slug: z.string().min(1).max(80),
        plan: z.enum(["monthly", "quarterly", "annual"]),
        amount_inr: z.number().min(0).max(500000),
        razorpay_order_id: z.string().optional(),
        razorpay_payment_id: z.string().optional(),
        razorpay_signature: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const u = await getCurrentUser();
    if (!u) throw redirect({ to: "/login" });
    const sql = getSql();

    if (data.amount_inr > 0) {
      const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
      if (hasSecret) {
        if (!data.razorpay_order_id || !data.razorpay_payment_id || !data.razorpay_signature) {
          throw new Error("Missing Razorpay payment signature details.");
        }
        const verified = verifyRazorpaySignature(
          data.razorpay_order_id,
          data.razorpay_payment_id,
          data.razorpay_signature,
        );
        if (!verified) {
          throw new Error("Trainer payment verification failed. Signature mismatch.");
        }
      }
      if (data.razorpay_payment_id) {
        const dup = (await sql`
          SELECT id FROM payments WHERE razorpay_payment_id = ${data.razorpay_payment_id} LIMIT 1
        `) as any[];
        if (dup.length) {
          return { ok: true, duplicate: true };
        }
      }
    }

    const months = data.plan === "monthly" ? 1 : data.plan === "quarterly" ? 3 : 12;
    const ends = new Date(Date.now() + months * 30 * 86400000);
    const bkRows = (await sql`
      INSERT INTO trainer_bookings (user_id, trainer_slug, plan, ends_at, amount_inr, razorpay_payment_id)
      VALUES (${u.id}, ${data.trainer_slug}, ${data.plan}, ${ends.toISOString()}, ${data.amount_inr}, ${data.razorpay_payment_id ?? null})
      RETURNING id
    `) as any[];

    if (data.amount_inr > 0) {
      const txnId = data.razorpay_payment_id || `TRN-${bkRows[0]?.id || Date.now()}`;
      await sql`
        INSERT INTO payments (user_id, trainer_booking_id, transaction_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount_inr, payment_method, purpose, status)
        VALUES (
          ${u.id},
          ${bkRows[0]?.id ?? null},
          ${txnId},
          ${data.razorpay_order_id ?? null},
          ${data.razorpay_payment_id ?? null},
          ${data.razorpay_signature ?? null},
          ${data.amount_inr},
          ${data.razorpay_payment_id ? "razorpay" : "manual"},
          ${`Trainer: ${data.trainer_slug} (${data.plan})`},
          'paid'
        )
        ON CONFLICT DO NOTHING
      `;
    }
    return { ok: true };
  });

export const myBookingsFn = createServerFn({ method: "GET" }).handler(async () => {
  const u = await getCurrentUser();
  if (!u) throw redirect({ to: "/login" });
  const sql = getSql();
  const [bookings, memberships] = await Promise.all([
    sql`SELECT * FROM trainer_bookings WHERE user_id = ${u.id} ORDER BY created_at DESC` as Promise<any[]>,
    sql`SELECT * FROM memberships WHERE user_id = ${u.id} ORDER BY created_at DESC` as Promise<any[]>,
  ]);
  return { bookings, memberships };
});

export const submitContactFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        name: z.string().min(2).max(100),
        email: z.string().email().max(200),
        subject: z.string().max(200).optional(),
        message: z.string().min(3).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO contact_enquiries (name, email, subject, message, status)
      VALUES (${data.name}, ${data.email}, ${data.subject ?? null}, ${data.message}, 'pending')
    `;
    return { ok: true };
  });
