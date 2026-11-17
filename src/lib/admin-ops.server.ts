import bcrypt from "bcryptjs";
import Razorpay from "razorpay";
import {
  type AdminPermission,
  type AdminRole,
  type AdminSessionUser,
  ROLE_DEFAULT_PERMISSIONS,
  logAdminActivity,
} from "./admin-auth.server";
import { ensureSchema, getSql } from "./db.server";

export async function getGymSettings() {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`SELECT * FROM gym_settings WHERE id = 1 LIMIT 1`) as any[];
  return (
    rows[0] ?? {
      id: 1,
      gym_name: "Fitness 365",
      early_warning_days: 3,
      inactive_days: 5,
      high_priority_days: 7,
      critical_days: 14,
      expiry_alert_days: 7,
      whatsapp_template:
        "Hey {name}! We haven't seen you at the gym lately. Hope everything is going well. We would love to see you back. Let us know if you need any help with your fitness journey!",
      renewal_template:
        "Hi {name}, your {plan} membership at Fitness 365 expires on {expiry}. Renew now to keep your streak going!",
    }
  );
}

export async function getAdminOverview(admin: AdminSessionUser) {
  await ensureSchema();
  const sql = getSql();
  const settings = await getGymSettings();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [
    memberStats,
    todayCheckIns,
    currentlyInside,
    expiringMemberships,
    paymentSummary,
    expenseMonth,
    activeTrainers,
    pendingEnquiries,
    monthlyPayments,
    monthlyExpenses,
    registrationsByMonth,
    membershipDist,
    attendanceSeries,
    recentRegistrations,
    recentPayments,
    recentPurchases,
    recentLogs,
    absentRows,
    enquiriesList,
  ] = await Promise.all([
    sql`
      SELECT
        COUNT(*) FILTER (WHERE u.status != 'archived')::int AS total_members,
        COUNT(*) FILTER (WHERE u.status != 'archived' AND EXISTS (
          SELECT 1 FROM memberships m WHERE m.user_id = u.id AND m.status = 'active' AND m.ends_at > NOW()
        ))::int AS active_members,
        COUNT(*) FILTER (WHERE u.status != 'archived' AND u.created_at >= date_trunc('month', NOW()))::int AS new_this_month
      FROM users u
    ` as Promise<any[]>,
    sql`
      SELECT c.id, c.user_id, c.checked_in_at, c.checked_out_at, c.source, u.name, u.email
      FROM check_ins c
      JOIN users u ON u.id = c.user_id
      WHERE c.day = ${today}
      ORDER BY c.checked_in_at DESC
    ` as Promise<any[]>,
    sql`
      SELECT COUNT(*)::int AS count
      FROM check_ins
      WHERE day = ${today} AND checked_in_at IS NOT NULL AND checked_out_at IS NULL
    ` as Promise<any[]>,
    sql`
      SELECT m.id, m.user_id, m.plan, m.ends_at, m.payment_status, u.name, u.email
      FROM memberships m
      JOIN users u ON u.id = m.user_id
      WHERE u.status != 'archived'
        AND m.status = 'active'
        AND m.ends_at >= NOW()
        AND m.ends_at <= NOW() + make_interval(days => ${Number(settings.expiry_alert_days || 7)})
      ORDER BY m.ends_at ASC
      LIMIT 30
    ` as Promise<any[]>,
    sql`
      SELECT
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid' AND created_at >= date_trunc('month', NOW())), 0)::numeric AS revenue_month,
        COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue_count,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COALESCE(SUM(amount_inr) FILTER (WHERE status IN ('overdue', 'pending')), 0)::numeric AS pending_amount
      FROM payments
    ` as Promise<any[]>,
    sql`
      SELECT COALESCE(SUM(amount_inr) FILTER (WHERE expense_date >= ${monthStart}::date), 0)::numeric AS expenses_month
      FROM gym_expenses
    ` as Promise<any[]>,
    sql`SELECT COUNT(*)::int AS count FROM gym_trainers WHERE is_active = true` as Promise<any[]>,
    sql`SELECT COUNT(*)::int AS count FROM contact_enquiries WHERE status = 'pending'` as Promise<any[]>,
    sql`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS ym,
             to_char(date_trunc('month', created_at), 'Mon') AS label,
             COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid'), 0)::numeric AS revenue
      FROM payments
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY 1, 2
      ORDER BY 1 ASC
    ` as Promise<any[]>,
    sql`
      SELECT to_char(date_trunc('month', expense_date), 'YYYY-MM') AS ym,
             to_char(date_trunc('month', expense_date), 'Mon') AS label,
             COALESCE(SUM(amount_inr), 0)::numeric AS expenses
      FROM gym_expenses
      WHERE expense_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY 1, 2
      ORDER BY 1 ASC
    ` as Promise<any[]>,
    sql`
      SELECT to_char(date_trunc('month', created_at), 'Mon') AS label,
             to_char(date_trunc('month', created_at), 'YYYY-MM') AS ym,
             COUNT(*)::int AS count
      FROM users
      WHERE status != 'archived' AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY 1, 2
      ORDER BY 2 ASC
    ` as Promise<any[]>,
    sql`
      SELECT COALESCE(latest.plan, 'none') AS plan, COUNT(*)::int AS count
      FROM users u
      LEFT JOIN LATERAL (
        SELECT plan FROM memberships m
        WHERE m.user_id = u.id AND m.status = 'active' AND m.ends_at > NOW()
        ORDER BY m.ends_at DESC LIMIT 1
      ) latest ON true
      WHERE u.status != 'archived'
      GROUP BY 1
    ` as Promise<any[]>,
    sql`
      SELECT to_char(day, 'Mon DD') AS label, day::text AS day, COUNT(*)::int AS visits
      FROM check_ins
      WHERE day >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY day
      ORDER BY day ASC
    ` as Promise<any[]>,
    sql`
      SELECT id, name, email, created_at FROM users WHERE status != 'archived' ORDER BY created_at DESC LIMIT 6
    ` as Promise<any[]>,
    sql`
      SELECT p.id, p.transaction_id, p.amount_inr, p.status, p.purpose, p.payment_method, p.created_at, u.name AS member_name
      FROM payments p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC LIMIT 6
    ` as Promise<any[]>,
    sql`
      SELECT m.id, m.plan, m.amount_inr, m.payment_status, m.created_at, u.name AS member_name
      FROM memberships m
      JOIN users u ON u.id = m.user_id
      ORDER BY m.created_at DESC LIMIT 6
    ` as Promise<any[]>,
    sql`
      SELECT id, actor_name, actor_role, action, target_type, target_id, created_at
      FROM admin_activity_logs
      ORDER BY created_at DESC LIMIT 8
    ` as Promise<any[]>,
    sql`
      SELECT u.id, u.name, u.email, MAX(c.day) AS last_visit,
             COALESCE((CURRENT_DATE - MAX(c.day)), (CURRENT_DATE - u.created_at::date))::int AS days_absent
      FROM users u
      LEFT JOIN check_ins c ON c.user_id = u.id
      WHERE u.status != 'archived'
        AND EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = u.id AND m.status = 'active' AND m.ends_at > NOW())
      GROUP BY u.id
      HAVING COALESCE((CURRENT_DATE - MAX(c.day)), (CURRENT_DATE - u.created_at::date)) >= ${Number(settings.early_warning_days || 3)}
      ORDER BY days_absent DESC
      LIMIT 10
    ` as Promise<any[]>,
    sql`SELECT * FROM contact_enquiries ORDER BY created_at DESC LIMIT 20` as Promise<any[]>,
  ]);

  const totalMembers = Number(memberStats[0]?.total_members || 0);
  const activeMembers = Number(memberStats[0]?.active_members || 0);
  const inactiveMembers = Math.max(0, totalMembers - activeMembers);
  const revenueThisMonth = Number(paymentSummary[0]?.revenue_month || 0);
  const expensesThisMonth = Number(expenseMonth[0]?.expenses_month || 0);
  const canSeeFinance = admin.role === "owner" || admin.permissions.includes("finance") || admin.permissions.includes("payments");

  // Merge revenue & expenses by month for last 6 months
  const monthBuckets = new Map<string, { month: string; revenue: number; expenses: number; profit: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });
    monthBuckets.set(ym, { month: label, revenue: 0, expenses: 0, profit: 0 });
  }
  for (const r of monthlyPayments) {
    const b = monthBuckets.get(r.ym);
    if (b) b.revenue = Number(r.revenue || 0);
  }
  for (const e of monthlyExpenses) {
    const b = monthBuckets.get(e.ym);
    if (b) b.expenses = Number(e.expenses || 0);
  }
  const financialSeries = Array.from(monthBuckets.values()).map((b) => ({
    ...b,
    profit: b.revenue - b.expenses,
  }));

  const expiringToday = expiringMemberships.filter((m) => new Date(m.ends_at).toISOString().slice(0, 10) === today);

  return {
    settings,
    kpis: {
      totalMembers,
      activeMembers,
      inactiveMembers,
      newThisMonth: Number(memberStats[0]?.new_this_month || 0),
      todayCheckIns: todayCheckIns.length,
      currentlyInside: Number(currentlyInside[0]?.count || 0),
      expiringSoon: expiringMemberships.length,
      overduePayments: Number(paymentSummary[0]?.overdue_count || 0),
      pendingPayments: Number(paymentSummary[0]?.pending_count || 0),
      revenueThisMonth: canSeeFinance ? revenueThisMonth : null,
      expensesThisMonth: canSeeFinance ? expensesThisMonth : null,
      netOperatingIncome: canSeeFinance ? revenueThisMonth - expensesThisMonth : null,
      activeTrainers: Number(activeTrainers[0]?.count || 0),
      pendingEnquiries: Number(pendingEnquiries[0]?.count || 0),
    },
    charts: {
      financialSeries: canSeeFinance ? financialSeries : [],
      registrations: registrationsByMonth.map((r) => ({ month: r.label, count: Number(r.count) })),
      membershipDistribution: membershipDist.map((m) => ({ name: String(m.plan).toUpperCase(), value: Number(m.count) })),
      attendanceTrends: attendanceSeries.map((a) => ({ day: a.label, visits: Number(a.visits) })),
    },
    todayActivity: {
      checkIns: todayCheckIns,
      registrations: recentRegistrations,
      payments: canSeeFinance ? recentPayments : [],
      purchases: recentPurchases,
      logs: recentLogs,
    },
    actionCentre: {
      absentCount: absentRows.length,
      absentMembers: absentRows.slice(0, 5),
      expiringSoonCount: expiringMemberships.length,
      expiringTodayCount: expiringToday.length,
      overduePaymentsCount: Number(paymentSummary[0]?.overdue_count || 0),
      pendingPaymentsCount: Number(paymentSummary[0]?.pending_count || 0),
      newRegistrationsCount: Number(memberStats[0]?.new_this_month || 0),
      pendingEnquiriesCount: Number(pendingEnquiries[0]?.count || 0),
    },
    enquiries: enquiriesList,
  };
}

export async function listAdminMembers(filters: {
  search?: string;
  membershipStatus?: string;
  paymentStatus?: string;
  dateFilter?: string;
  activityFilter?: string;
  page?: number;
  pageSize?: number;
}) {
  await ensureSchema();
  const sql = getSql();
  const settings = await getGymSettings();

  const rows = (await sql`
    SELECT
      u.id, u.name, u.email, u.phone, u.avatar_url, u.status, u.height_cm, u.weight_kg, u.age, u.gender, u.created_at,
      lm.id AS membership_id,
      lm.plan AS membership_plan,
      lm.status AS membership_record_status,
      lm.starts_at AS membership_start,
      lm.ends_at AS membership_expiry,
      lm.payment_status AS membership_payment_status,
      (SELECT COUNT(*)::int FROM check_ins c WHERE c.user_id = u.id) AS attendance_count,
      (SELECT MAX(c.day) FROM check_ins c WHERE c.user_id = u.id) AS last_visit,
      (SELECT p.status FROM payments p WHERE p.user_id = u.id ORDER BY p.created_at DESC LIMIT 1) AS latest_payment_status
    FROM users u
    LEFT JOIN LATERAL (
      SELECT * FROM memberships m WHERE m.user_id = u.id ORDER BY m.created_at DESC LIMIT 1
    ) lm ON true
    ORDER BY u.created_at DESC
  `) as any[];

  const now = Date.now();
  const search = (filters.search || "").trim().toLowerCase();

  let enriched = rows.map((r) => {
    const expiryTime = r.membership_expiry ? new Date(r.membership_expiry).getTime() : 0;
    let membershipStatus = "none";
    if (r.status === "archived") membershipStatus = "archived";
    else if (!r.membership_id) membershipStatus = "none";
    else if (r.membership_record_status === "paused") membershipStatus = "paused";
    else if (r.membership_record_status === "cancelled" || r.membership_record_status === "inactive") membershipStatus = "inactive";
    else if (expiryTime > now) membershipStatus = "active";
    else membershipStatus = "expired";

    const payStatus = r.latest_payment_status || r.membership_payment_status || (r.membership_plan === "trial" ? "free" : "none");
    const lastVisitMs = r.last_visit ? new Date(r.last_visit).getTime() : null;
    const daysSinceVisit = lastVisitMs
      ? Math.max(0, Math.floor((now - lastVisitMs) / 86400000))
      : Math.max(0, Math.floor((now - new Date(r.created_at).getTime()) / 86400000));

    return {
      ...r,
      membershipStatus,
      paymentStatus: payStatus,
      daysSinceVisit,
      isAtRisk: membershipStatus === "active" && daysSinceVisit >= Number(settings.inactive_days || 5),
    };
  });

  if (search) {
    enriched = enriched.filter(
      (m) =>
        String(m.name || "").toLowerCase().includes(search) ||
        String(m.email || "").toLowerCase().includes(search) ||
        String(m.phone || "").toLowerCase().includes(search),
    );
  }
  if (filters.membershipStatus && filters.membershipStatus !== "all") {
    enriched = enriched.filter((m) => m.membershipStatus === filters.membershipStatus);
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    enriched = enriched.filter((m) => m.paymentStatus === filters.paymentStatus);
  }
  if (filters.dateFilter && filters.dateFilter !== "all") {
    const days = filters.dateFilter === "7d" ? 7 : filters.dateFilter === "30d" ? 30 : 90;
    const cutoff = now - days * 86400000;
    enriched = enriched.filter((m) => new Date(m.created_at).getTime() >= cutoff);
  }
  if (filters.activityFilter && filters.activityFilter !== "all") {
    if (filters.activityFilter === "active_7d") {
      enriched = enriched.filter((m) => m.last_visit && m.daysSinceVisit <= 7);
    } else if (filters.activityFilter === "inactive") {
      enriched = enriched.filter((m) => m.daysSinceVisit >= Number(settings.inactive_days || 5));
    } else if (filters.activityFilter === "never") {
      enriched = enriched.filter((m) => Number(m.attendance_count || 0) === 0);
    }
  }

  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize || 15));
  const total = enriched.length;
  const items = enriched.slice((page - 1) * pageSize, page * pageSize);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAdminMemberDetail(memberId: number, admin: AdminSessionUser) {
  await ensureSchema();
  const sql = getSql();
  const [users, memberships, attendance, payments, progress, followups, logs, assignments, plans] = await Promise.all([
    sql`SELECT id, email, name, phone, avatar_url, status, height_cm, weight_kg, age, gender, notes, created_at FROM users WHERE id = ${memberId} LIMIT 1` as Promise<any[]>,
    sql`SELECT * FROM memberships WHERE user_id = ${memberId} ORDER BY created_at DESC` as Promise<any[]>,
    sql`SELECT * FROM check_ins WHERE user_id = ${memberId} ORDER BY day DESC LIMIT 180` as Promise<any[]>,
    sql`SELECT * FROM payments WHERE user_id = ${memberId} ORDER BY created_at DESC` as Promise<any[]>,
    sql`SELECT * FROM progress_entries WHERE user_id = ${memberId} ORDER BY day ASC LIMIT 120` as Promise<any[]>,
    sql`SELECT * FROM member_followups WHERE user_id = ${memberId} ORDER BY created_at DESC` as Promise<any[]>,
    sql`SELECT * FROM admin_activity_logs WHERE target_type = 'member' AND target_id = ${String(memberId)} ORDER BY created_at DESC LIMIT 50` as Promise<any[]>,
    sql`
      SELECT ta.*, gt.name AS trainer_name, gt.specialization
      FROM trainer_assignments ta
      JOIN gym_trainers gt ON gt.id = ta.trainer_id
      WHERE ta.user_id = ${memberId}
    ` as Promise<any[]>,
    sql`SELECT * FROM membership_plans WHERE is_archived = false ORDER BY price_inr ASC` as Promise<any[]>,
  ]);

  if (!users.length) throw new Error("Member not found");

  const canViewPlans = admin.role === "owner" || admin.role === "trainer" || admin.permissions.includes("members");
  const [workouts, diets] = canViewPlans
    ? await Promise.all([
        sql`SELECT id, goal, data, created_at FROM workout_plans WHERE user_id = ${memberId} ORDER BY created_at DESC LIMIT 5` as Promise<any[]>,
        sql`SELECT id, goal, data, created_at FROM diet_plans WHERE user_id = ${memberId} ORDER BY created_at DESC LIMIT 5` as Promise<any[]>,
      ])
    : [[], []];

  return {
    member: users[0],
    memberships,
    attendance,
    payments: admin.role === "owner" || admin.permissions.includes("payments") ? payments : [],
    progress,
    workouts,
    diets,
    followups,
    logs,
    assignments,
    plans,
  };
}

export async function createMemberByAdmin(
  input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    height_cm?: number;
    weight_kg?: number;
    age?: number;
    gender?: string;
    notes?: string;
    initial_plan?: string;
    payment_status?: "paid" | "pending" | "free";
    payment_method?: string;
    amount_inr?: number;
  },
  admin: AdminSessionUser,
) {
  await ensureSchema();
  const sql = getSql();
  const email = input.email.trim().toLowerCase();
  const exists = (await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`) as any[];
  if (exists.length) throw new Error("A member with this email already exists.");

  const hash = await bcrypt.hash(input.password, 10);
  const rows = (await sql`
    INSERT INTO users (email, password_hash, name, phone, height_cm, weight_kg, age, gender, notes, status)
    VALUES (
      ${email}, ${hash}, ${input.name.trim()}, ${input.phone ?? null},
      ${input.height_cm ?? null}, ${input.weight_kg ?? null}, ${input.age ?? null}, ${input.gender ?? null},
      ${input.notes ?? null}, 'active'
    )
    RETURNING id, email, name
  `) as any[];
  const user = rows[0];

  if (input.initial_plan && input.initial_plan !== "none") {
    await assignMembershipToMember(
      {
        user_id: user.id,
        plan_slug: input.initial_plan,
        payment_status: input.payment_status ?? "pending",
        payment_method: input.payment_method ?? "cash",
        amount_inr: input.amount_inr,
      },
      admin,
    );
  }

  await logAdminActivity(admin, "member_created", "member", user.id, { email: user.email, name: user.name });
  return { ok: true, id: user.id };
}

export async function assignMembershipToMember(
  input: {
    user_id: number;
    plan_slug: string;
    duration_days?: number;
    amount_inr?: number;
    payment_status: "paid" | "pending" | "overdue" | "free";
    payment_method?: string;
    notes?: string;
  },
  admin: AdminSessionUser,
) {
  await ensureSchema();
  const sql = getSql();
  const planRows = (await sql`SELECT * FROM membership_plans WHERE slug = ${input.plan_slug} LIMIT 1`) as any[];
  const plan = planRows[0];
  const days = input.duration_days ?? Number(plan?.duration_days || 30);
  const amount = input.amount_inr ?? Number(plan?.price_inr || 0);
  const endsAt = new Date(Date.now() + days * 86400000).toISOString();

  const memRows = (await sql`
    INSERT INTO memberships (user_id, plan, plan_id, status, starts_at, ends_at, auto_renew, amount_inr, payment_status)
    VALUES (${input.user_id}, ${input.plan_slug}, ${plan?.id ?? null}, 'active', NOW(), ${endsAt}, false, ${amount}, ${input.payment_status})
    RETURNING id
  `) as any[];
  const memId = memRows[0].id;

  if (amount > 0 && input.payment_status !== "free") {
    const txnId = `ADM-${Date.now()}-${memId}`;
    await sql`
      INSERT INTO payments (user_id, membership_id, transaction_id, amount_inr, payment_method, purpose, status, notes, recorded_by)
      VALUES (
        ${input.user_id},
        ${memId},
        ${txnId},
        ${amount},
        ${input.payment_method || "cash"},
        ${`Membership: ${plan?.name || input.plan_slug}`},
        ${input.payment_status},
        ${input.notes ?? null},
        ${admin.actor_name}
      )
    `;
  }

  await logAdminActivity(admin, "membership_assigned", "member", input.user_id, {
    plan: input.plan_slug,
    days,
    amount_inr: amount,
    payment_status: input.payment_status,
  });

  return { ok: true, membershipId: memId };
}

export async function getAttendanceDashboard() {
  await ensureSchema();
  const sql = getSql();
  const today = new Date().toISOString().slice(0, 10);

  const [todayRows, monthCountRows, trendRows, peakRows, allMembers, recentAbsent] = await Promise.all([
    sql`
      SELECT c.*, u.name, u.email, u.phone
      FROM check_ins c
      JOIN users u ON u.id = c.user_id
      WHERE c.day = ${today}
      ORDER BY c.checked_in_at DESC
    ` as Promise<any[]>,
    sql`
      SELECT COUNT(*)::int AS count
      FROM check_ins
      WHERE day >= date_trunc('month', CURRENT_DATE)::date
    ` as Promise<any[]>,
    sql`
      SELECT day::text AS day, to_char(day, 'Mon DD') AS label, COUNT(*)::int AS count
      FROM check_ins
      WHERE day >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    ` as Promise<any[]>,
    sql`
      SELECT EXTRACT(HOUR FROM COALESCE(checked_in_at, created_at))::int AS hour, COUNT(*)::int AS count
      FROM check_ins
      WHERE day >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY 1
      ORDER BY 1 ASC
    ` as Promise<any[]>,
    sql`
      SELECT u.id, u.name, u.email, u.phone,
             COUNT(c.id)::int AS total_visits,
             MAX(c.day) AS last_visit,
             EXISTS(SELECT 1 FROM check_ins ct WHERE ct.user_id = u.id AND ct.day = ${today}) AS checked_in_today,
             (SELECT ct.checked_out_at FROM check_ins ct WHERE ct.user_id = u.id AND ct.day = ${today} LIMIT 1) AS today_checked_out_at
      FROM users u
      LEFT JOIN check_ins c ON c.user_id = u.id
      WHERE u.status != 'archived'
      GROUP BY u.id
      ORDER BY u.name ASC
    ` as Promise<any[]>,
    sql`
      SELECT u.id, u.name, u.email, MAX(c.day) AS last_visit,
             COALESCE((CURRENT_DATE - MAX(c.day)), (CURRENT_DATE - u.created_at::date))::int AS days_since
      FROM users u
      LEFT JOIN check_ins c ON c.user_id = u.id
      WHERE u.status != 'archived'
      GROUP BY u.id
      HAVING COALESCE((CURRENT_DATE - MAX(c.day)), (CURRENT_DATE - u.created_at::date)) >= 3
      ORDER BY days_since DESC
      LIMIT 25
    ` as Promise<any[]>,
  ]);

  const peakMap = new Map<number, number>();
  for (const p of peakRows) peakMap.set(Number(p.hour), Number(p.count));
  const peakHours = Array.from({ length: 18 }, (_, i) => {
    const h = i + 5; // 5 AM to 10 PM
    const label = `${h > 12 ? h - 12 : h}${h >= 12 ? "PM" : "AM"}`;
    return { hour: label, visits: peakMap.get(h) || 0 };
  });

  const history = (await sql`
    SELECT c.*, u.name, u.email
    FROM check_ins c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.day DESC, c.checked_in_at DESC
    LIMIT 100
  `) as any[];

  return {
    todayCheckIns: todayRows,
    currentlyInsideCount: todayRows.filter((r) => !r.checked_out_at).length,
    monthVisits: Number(monthCountRows[0]?.count || 0),
    dailyTrends: trendRows,
    peakHours,
    members: allMembers,
    notVisitedRecently: recentAbsent,
    history,
  };
}

export async function getInactiveMembersData() {
  await ensureSchema();
  const sql = getSql();
  const settings = await getGymSettings();

  const rows = (await sql`
    SELECT
      u.id, u.name, u.email, u.phone, u.created_at,
      MAX(c.day) AS last_visit,
      COUNT(c.id)::int AS total_visits,
      COUNT(c.id) FILTER (WHERE c.day >= CURRENT_DATE - INTERVAL '30 days')::int AS visits_30d,
      COALESCE((CURRENT_DATE - MAX(c.day)), (CURRENT_DATE - u.created_at::date))::int AS days_since_visit,
      lm.plan AS membership_plan,
      lm.ends_at AS membership_expiry,
      lm.payment_status,
      (SELECT f.note FROM member_followups f WHERE f.user_id = u.id ORDER BY f.created_at DESC LIMIT 1) AS latest_note,
      (SELECT f.status FROM member_followups f WHERE f.user_id = u.id ORDER BY f.created_at DESC LIMIT 1) AS latest_followup_status,
      (SELECT f.scheduled_for FROM member_followups f WHERE f.user_id = u.id ORDER BY f.created_at DESC LIMIT 1) AS next_followup_date
    FROM users u
    LEFT JOIN check_ins c ON c.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT plan, ends_at, payment_status FROM memberships m
      WHERE m.user_id = u.id AND m.status = 'active'
      ORDER BY m.ends_at DESC LIMIT 1
    ) lm ON true
    WHERE u.status != 'archived'
    GROUP BY u.id, lm.plan, lm.ends_at, lm.payment_status
    ORDER BY days_since_visit DESC
  `) as any[];

  const followups = (await sql`
    SELECT f.*, u.name AS member_name, u.email AS member_email
    FROM member_followups f
    JOIN users u ON u.id = f.user_id
    ORDER BY f.created_at DESC
    LIMIT 60
  `) as any[];

  const early = Number(settings.early_warning_days || 3);
  const inactive = Number(settings.inactive_days || 5);
  const high = Number(settings.high_priority_days || 7);
  const critical = Number(settings.critical_days || 14);

  const categorized = rows
    .filter((r) => Number(r.days_since_visit) >= early)
    .map((r) => {
      const d = Number(r.days_since_visit);
      let category: "early_warning" | "inactive" | "high_priority" | "critical" = "early_warning";
      if (d >= critical) category = "critical";
      else if (d >= high) category = "high_priority";
      else if (d >= inactive) category = "inactive";

      return {
        ...r,
        category,
        attendance_frequency: `${r.visits_30d} / 30d`,
      };
    });

  return { settings, members: categorized, followups };
}

export async function getAdminMembershipsData() {
  await ensureSchema();
  const sql = getSql();
  const [plans, memberSubs, users, renewalLogs] = await Promise.all([
    sql`SELECT * FROM membership_plans WHERE is_archived = false ORDER BY price_inr ASC` as Promise<any[]>,
    sql`
      SELECT m.*, u.name AS member_name, u.email AS member_email, u.phone AS member_phone
      FROM memberships m
      JOIN users u ON u.id = m.user_id
      WHERE u.status != 'archived'
      ORDER BY m.ends_at ASC
    ` as Promise<any[]>,
    sql`SELECT id, name, email FROM users WHERE status != 'archived' ORDER BY name ASC` as Promise<any[]>,
    sql`
      SELECT * FROM admin_activity_logs
      WHERE action IN ('membership_assigned', 'membership_extended', 'membership_paused', 'membership_resumed', 'renewal_reminder_logged')
      ORDER BY created_at DESC LIMIT 40
    ` as Promise<any[]>,
  ]);

  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);

  const categorized = memberSubs.map((m) => {
    const endsMs = new Date(m.ends_at).getTime();
    const diffDays = Math.ceil((endsMs - now) / 86400000);
    const endsDateStr = new Date(m.ends_at).toISOString().slice(0, 10);
    let expiryBucket = "active";
    if (m.status === "paused") expiryBucket = "paused";
    else if (endsMs <= now) expiryBucket = "expired";
    else if (endsDateStr === todayStr) expiryBucket = "expiring_today";
    else if (diffDays <= 3) expiryBucket = "within_3_days";
    else if (diffDays <= 7) expiryBucket = "within_7_days";
    else if (diffDays <= 30) expiryBucket = "within_30_days";

    return { ...m, diffDays, expiryBucket };
  });

  return { plans, memberships: categorized, users, renewalLogs };
}

export async function getAdminPaymentsData(filters: { status?: string; search?: string }) {
  await ensureSchema();
  const sql = getSql();
  const [summaryRows, rows, users] = await Promise.all([
    sql`
      SELECT
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid'), 0)::numeric AS total_collected,
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid' AND created_at >= date_trunc('month', NOW())), 0)::numeric AS month_revenue,
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid' AND created_at::date = CURRENT_DATE), 0)::numeric AS today_revenue,
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'pending'), 0)::numeric AS pending_amount,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'overdue'), 0)::numeric AS overdue_amount,
        COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue_count,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'refunded'), 0)::numeric AS refunded_amount,
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid' AND (membership_id IS NOT NULL OR purpose ILIKE 'Membership%')), 0)::numeric AS membership_revenue,
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid' AND (trainer_booking_id IS NOT NULL OR purpose ILIKE 'Trainer%')), 0)::numeric AS trainer_revenue
      FROM payments
    ` as Promise<any[]>,
    sql`
      SELECT p.*, u.name AS member_name, u.email AS member_email, u.phone AS member_phone
      FROM payments p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 250
    ` as Promise<any[]>,
    sql`SELECT id, name, email FROM users WHERE status != 'archived' ORDER BY name ASC` as Promise<any[]>,
  ]);

  let filtered = rows;
  if (filters.status && filters.status !== "all") {
    filtered = filtered.filter((r) => r.status === filters.status);
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        String(r.transaction_id || "").toLowerCase().includes(q) ||
        String(r.member_name || "").toLowerCase().includes(q) ||
        String(r.member_email || "").toLowerCase().includes(q) ||
        String(r.purpose || "").toLowerCase().includes(q),
    );
  }

  return {
    summary: summaryRows[0],
    payments: filtered,
    users,
    razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  };
}

export async function processPaymentRefund(paymentId: number, reason: string, admin: AdminSessionUser) {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`SELECT * FROM payments WHERE id = ${paymentId} LIMIT 1`) as any[];
  const payment = rows[0];
  if (!payment) throw new Error("Payment record not found.");
  if (payment.status === "refunded") throw new Error("Payment has already been refunded.");
  if (payment.status !== "paid") throw new Error("Only settled payments can be refunded.");

  let refundId = `RFND-MANUAL-${Date.now()}`;
  let gatewayProcessed = false;

  if (payment.razorpay_payment_id && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const rzpRefund = await rzp.payments.refund(payment.razorpay_payment_id, {
      amount: Math.round(Number(payment.amount_inr) * 100),
      notes: { reason, actor: admin.actor_name },
    });
    refundId = rzpRefund.id;
    gatewayProcessed = true;
  }

  await sql`
    UPDATE payments
    SET status = 'refunded',
        refund_id = ${refundId},
        refunded_at = NOW(),
        notes = COALESCE(notes || ' | ', '') || ${`Refund (${admin.actor_name}): ${reason}`}
    WHERE id = ${paymentId}
  `;

  await logAdminActivity(admin, "payment_refunded", "payment", paymentId, {
    amount_inr: payment.amount_inr,
    refund_id: refundId,
    gateway_processed: gatewayProcessed,
    reason,
  });

  return { ok: true, refundId, gatewayProcessed };
}

export async function getTrainersAndStaffData(admin: AdminSessionUser) {
  await ensureSchema();
  const sql = getSql();
  const [trainers, assignments, bookingsRevenue, staff, members] = await Promise.all([
    sql`SELECT * FROM gym_trainers ORDER BY is_active DESC, name ASC` as Promise<any[]>,
    sql`
      SELECT ta.*, u.name AS member_name, u.email AS member_email
      FROM trainer_assignments ta
      JOIN users u ON u.id = ta.user_id
      WHERE u.status != 'archived'
      ORDER BY ta.assigned_at DESC
    ` as Promise<any[]>,
    sql`
      SELECT trainer_slug, COUNT(*)::int AS bookings_count, COALESCE(SUM(amount_inr), 0)::numeric AS revenue
      FROM trainer_bookings
      GROUP BY trainer_slug
    ` as Promise<any[]>,
    sql`
      SELECT id, name, email, phone, role, permissions, salary_inr, shift_hours, is_active, created_at
      FROM gym_staff
      ORDER BY created_at DESC
    ` as Promise<any[]>,
    sql`SELECT id, name, email FROM users WHERE status != 'archived' ORDER BY name ASC` as Promise<any[]>,
  ]);

  const revMap = new Map(bookingsRevenue.map((r) => [r.trainer_slug, r]));
  const safeTrainers = trainers.map((t) => {
    const stats = revMap.get(t.slug);
    const assigned = assignments.filter((a) => a.trainer_id === t.id);
    return {
      ...t,
      salary_inr: admin.canViewCompensation ? t.salary_inr : null,
      commission_pct: admin.canViewCompensation ? t.commission_pct : null,
      assigned_members: assigned,
      completed_sessions: assigned.reduce((acc, a) => acc + Number(a.completed_sessions || 0), 0),
      pending_sessions: assigned.reduce((acc, a) => acc + Number(a.pending_sessions || 0), 0),
      bookings_count: Number(stats?.bookings_count || 0),
      trainer_revenue: admin.canViewCompensation || admin.permissions.includes("finance") ? Number(stats?.revenue || 0) : null,
    };
  });

  const safeStaff = staff.map((s) => ({
    ...s,
    salary_inr: admin.canViewCompensation ? s.salary_inr : null,
  }));

  return {
    trainers: safeTrainers,
    staff: safeStaff,
    members,
    canViewCompensation: admin.canViewCompensation,
    roleDefaults: ROLE_DEFAULT_PERMISSIONS,
  };
}

export async function getFinanceAndReportsData(filters: { startDate?: string; endDate?: string }) {
  await ensureSchema();
  const sql = getSql();
  const end = filters.endDate || new Date().toISOString().slice(0, 10);
  const startDateObj = new Date();
  startDateObj.setDate(startDateObj.getDate() - 90);
  const start = filters.startDate || startDateObj.toISOString().slice(0, 10);

  const [revTotals, expTotals, byPlan, byMethod, trainerRev, expenses, dailySeries] = await Promise.all([
    sql`
      SELECT
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid' AND created_at::date = CURRENT_DATE), 0)::numeric AS daily_revenue,
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid' AND created_at >= CURRENT_DATE - INTERVAL '7 days'), 0)::numeric AS weekly_revenue,
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid' AND created_at >= date_trunc('month', NOW())), 0)::numeric AS monthly_revenue,
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid' AND created_at >= date_trunc('year', NOW())), 0)::numeric AS yearly_revenue,
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid' AND created_at::date BETWEEN ${start}::date AND ${end}::date), 0)::numeric AS range_collected,
        COALESCE(SUM(amount_inr) FILTER (WHERE status IN ('pending', 'overdue') AND created_at::date BETWEEN ${start}::date AND ${end}::date), 0)::numeric AS range_pending,
        COALESCE(SUM(amount_inr) FILTER (WHERE status = 'refunded' AND created_at::date BETWEEN ${start}::date AND ${end}::date), 0)::numeric AS range_refunded
      FROM payments
    ` as Promise<any[]>,
    sql`
      SELECT COALESCE(SUM(amount_inr) FILTER (WHERE expense_date BETWEEN ${start}::date AND ${end}::date), 0)::numeric AS range_expenses,
             COALESCE(SUM(amount_inr) FILTER (WHERE expense_date >= date_trunc('month', CURRENT_DATE)::date), 0)::numeric AS monthly_expenses
      FROM gym_expenses
    ` as Promise<any[]>,
    sql`
      SELECT purpose AS plan, COALESCE(SUM(amount_inr), 0)::numeric AS revenue, COUNT(*)::int AS count
      FROM payments
      WHERE status = 'paid' AND created_at::date BETWEEN ${start}::date AND ${end}::date
      GROUP BY purpose
      ORDER BY revenue DESC
    ` as Promise<any[]>,
    sql`
      SELECT payment_method AS method, COALESCE(SUM(amount_inr), 0)::numeric AS revenue, COUNT(*)::int AS count
      FROM payments
      WHERE status = 'paid' AND created_at::date BETWEEN ${start}::date AND ${end}::date
      GROUP BY payment_method
      ORDER BY revenue DESC
    ` as Promise<any[]>,
    sql`
      SELECT COALESCE(gt.name, tb.trainer_slug) AS trainer, COALESCE(SUM(tb.amount_inr), 0)::numeric AS revenue, COUNT(*)::int AS bookings
      FROM trainer_bookings tb
      LEFT JOIN gym_trainers gt ON gt.slug = tb.trainer_slug
      WHERE tb.created_at::date BETWEEN ${start}::date AND ${end}::date
      GROUP BY 1
      ORDER BY revenue DESC
    ` as Promise<any[]>,
    sql`
      SELECT * FROM gym_expenses
      WHERE expense_date BETWEEN ${start}::date AND ${end}::date
      ORDER BY expense_date DESC, id DESC
    ` as Promise<any[]>,
    sql`
      SELECT created_at::date::text AS day,
             COALESCE(SUM(amount_inr) FILTER (WHERE status = 'paid'), 0)::numeric AS collected,
             COALESCE(SUM(amount_inr) FILTER (WHERE status IN ('pending', 'overdue')), 0)::numeric AS pending
      FROM payments
      WHERE created_at::date BETWEEN ${start}::date AND ${end}::date
      GROUP BY 1
      ORDER BY 1 ASC
    ` as Promise<any[]>,
  ]);

  const collected = Number(revTotals[0]?.range_collected || 0);
  const expRange = Number(expTotals[0]?.range_expenses || 0);

  return {
    range: { start, end },
    metrics: {
      dailyRevenue: Number(revTotals[0]?.daily_revenue || 0),
      weeklyRevenue: Number(revTotals[0]?.weekly_revenue || 0),
      monthlyRevenue: Number(revTotals[0]?.monthly_revenue || 0),
      yearlyRevenue: Number(revTotals[0]?.yearly_revenue || 0),
      rangeCollected: collected,
      rangePending: Number(revTotals[0]?.range_pending || 0),
      rangeRefunded: Number(revTotals[0]?.range_refunded || 0),
      rangeExpenses: expRange,
      monthlyExpenses: Number(expTotals[0]?.monthly_expenses || 0),
      netOperatingIncome: collected - expRange,
    },
    byPlan,
    byMethod,
    byTrainer: trainerRev,
    expenses,
    dailySeries,
  };
}

export async function generateCsvExport(kind: "revenue" | "expenses" | "members" | "attendance", start?: string, end?: string) {
  await ensureSchema();
  const sql = getSql();
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const toCsv = (headers: string[], rows: unknown[][]) =>
    [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");

  if (kind === "revenue") {
    const rows = (await sql`
      SELECT p.transaction_id, p.created_at::date::text AS date, u.name AS member_name, u.email, p.purpose, p.payment_method, p.status, p.amount_inr
      FROM payments p LEFT JOIN users u ON u.id = p.user_id
      WHERE (${start ?? null}::date IS NULL OR p.created_at::date >= ${start ?? null}::date)
        AND (${end ?? null}::date IS NULL OR p.created_at::date <= ${end ?? null}::date)
      ORDER BY p.created_at DESC
    `) as any[];
    return toCsv(
      ["Transaction ID", "Date", "Member", "Email", "Purpose", "Method", "Status", "Amount (INR)"],
      rows.map((r) => [r.transaction_id, r.date, r.member_name, r.email, r.purpose, r.payment_method, r.status, r.amount_inr]),
    );
  }
  if (kind === "expenses") {
    const rows = (await sql`
      SELECT expense_date::text AS date, title, category, payment_method, amount_inr, description, recorded_by
      FROM gym_expenses
      WHERE (${start ?? null}::date IS NULL OR expense_date >= ${start ?? null}::date)
        AND (${end ?? null}::date IS NULL OR expense_date <= ${end ?? null}::date)
      ORDER BY expense_date DESC
    `) as any[];
    return toCsv(
      ["Date", "Title", "Category", "Method", "Amount (INR)", "Description", "Recorded By"],
      rows.map((r) => [r.date, r.title, r.category, r.payment_method, r.amount_inr, r.description, r.recorded_by]),
    );
  }
  if (kind === "members") {
    const rows = (await sql`
      SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at::date::text AS joined,
             lm.plan, lm.ends_at::date::text AS expiry, lm.payment_status
      FROM users u
      LEFT JOIN LATERAL (SELECT plan, ends_at, payment_status FROM memberships m WHERE m.user_id = u.id ORDER BY m.created_at DESC LIMIT 1) lm ON true
      ORDER BY u.id DESC
    `) as any[];
    return toCsv(
      ["ID", "Name", "Email", "Phone", "Status", "Joined", "Plan", "Expiry", "Payment Status"],
      rows.map((r) => [r.id, r.name, r.email, r.phone, r.status, r.joined, r.plan, r.expiry, r.payment_status]),
    );
  }
  const rows = (await sql`
    SELECT c.day::text AS day, u.name, u.email, c.checked_in_at, c.checked_out_at, c.source, c.correction_note
    FROM check_ins c JOIN users u ON u.id = c.user_id
    WHERE (${start ?? null}::date IS NULL OR c.day >= ${start ?? null}::date)
      AND (${end ?? null}::date IS NULL OR c.day <= ${end ?? null}::date)
    ORDER BY c.day DESC
  `) as any[];
  return toCsv(
    ["Date", "Member", "Email", "Checked In", "Checked Out", "Source", "Note"],
    rows.map((r) => [r.day, r.name, r.email, r.checked_in_at, r.checked_out_at, r.source, r.correction_note]),
  );
}

export async function saveGymStaff(
  input: {
    id?: number;
    name: string;
    email: string;
    phone?: string;
    password?: string;
    role: AdminRole;
    permissions: AdminPermission[];
    salary_inr: number;
    shift_hours?: string;
  },
  admin: AdminSessionUser,
) {
  await ensureSchema();
  const sql = getSql();
  const email = input.email.trim().toLowerCase();
  // Never allow trainer or non-owner staff to hold owner settings permission
  const sanitizedPerms = input.permissions.filter((p) =>
    input.role === "trainer" ? ["overview", "members", "attendance"].includes(p) : p !== "settings",
  );

  if (input.id) {
    if (input.password && input.password.length >= 6) {
      const hash = await bcrypt.hash(input.password, 10);
      await sql`
        UPDATE gym_staff
        SET name = ${input.name}, email = ${email}, phone = ${input.phone ?? null}, password_hash = ${hash},
            role = ${input.role}, permissions = ${JSON.stringify(sanitizedPerms)}::jsonb,
            salary_inr = ${input.salary_inr}, shift_hours = ${input.shift_hours ?? null}
        WHERE id = ${input.id}
      `;
    } else {
      await sql`
        UPDATE gym_staff
        SET name = ${input.name}, email = ${email}, phone = ${input.phone ?? null},
            role = ${input.role}, permissions = ${JSON.stringify(sanitizedPerms)}::jsonb,
            salary_inr = ${input.salary_inr}, shift_hours = ${input.shift_hours ?? null}
        WHERE id = ${input.id}
      `;
    }
    await logAdminActivity(admin, "staff_updated", "staff", input.id, { role: input.role, name: input.name });
  } else {
    if (!input.password || input.password.length < 6) {
      throw new Error("Password (min 6 characters) is required for new staff.");
    }
    const hash = await bcrypt.hash(input.password, 10);
    const rows = (await sql`
      INSERT INTO gym_staff (name, email, phone, password_hash, role, permissions, salary_inr, shift_hours)
      VALUES (${input.name}, ${email}, ${input.phone ?? null}, ${hash}, ${input.role}, ${JSON.stringify(sanitizedPerms)}::jsonb, ${input.salary_inr}, ${input.shift_hours ?? "9:00 AM - 6:00 PM"})
      RETURNING id
    `) as any[];
    await logAdminActivity(admin, "staff_created", "staff", rows[0]?.id, { role: input.role, name: input.name });
  }
  return { ok: true };
}
