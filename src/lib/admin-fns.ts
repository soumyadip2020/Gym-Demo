import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  destroyAdminSession,
  getAdminSession,
  logAdminActivity,
  requireAdmin,
  verifyAdminAccessCode,
  verifyStaffLogin,
} from "./admin-auth.server";
import {
  assignMembershipToMember,
  createMemberByAdmin,
  generateCsvExport,
  getAdminMemberDetail,
  getAdminMembershipsData,
  getAdminOverview,
  getAdminPaymentsData,
  getAttendanceDashboard,
  getFinanceAndReportsData,
  getGymSettings,
  getInactiveMembersData,
  getTrainersAndStaffData,
  listAdminMembers,
  processPaymentRefund,
  saveGymStaff,
} from "./admin-ops.server";
import { getSql } from "./db.server";

// ---------- ADMIN AUTH ----------
export const adminMeFn = createServerFn({ method: "GET" }).handler(async () => {
  const admin = await getAdminSession();
  if (!admin) return { admin: null };
  const { token: _t, ...safe } = admin;
  return { admin: safe };
});

export const adminLoginFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ code: z.string().min(1).max(16) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await verifyAdminAccessCode(data.code);
    const { token: _t, ...safe } = admin;
    return { ok: true, admin: safe };
  });

export const adminStaffLoginFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ email: z.string().email(), password: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await verifyStaffLogin(data.email, data.password);
    const { token: _t, ...safe } = admin;
    return { ok: true, admin: safe };
  });

export const adminLogoutFn = createServerFn({ method: "POST" }).handler(async () => {
  await destroyAdminSession();
  return { ok: true };
});

// ---------- OVERVIEW ----------
export const adminOverviewFn = createServerFn({ method: "GET" }).handler(async () => {
  const admin = await requireAdmin("overview");
  return getAdminOverview(admin);
});

export const adminResolveEnquiryFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.number().int(), status: z.enum(["pending", "resolved"]) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin("overview");
    const sql = getSql();
    await sql`UPDATE contact_enquiries SET status = ${data.status} WHERE id = ${data.id}`;
    await logAdminActivity(admin, "enquiry_status_updated", "enquiry", data.id, { status: data.status });
    return { ok: true };
  });

// ---------- MEMBERS ----------
export const adminMembersListFn = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z
      .object({
        search: z.string().optional(),
        membershipStatus: z.string().optional(),
        paymentStatus: z.string().optional(),
        dateFilter: z.string().optional(),
        activityFilter: z.string().optional(),
        page: z.number().int().optional(),
        pageSize: z.number().int().optional(),
      })
      .optional()
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin("members");
    return listAdminMembers(data ?? {});
  });

export const adminMemberDetailFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ memberId: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin("members");
    return getAdminMemberDetail(data.memberId, admin);
  });

export const adminCreateMemberFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        name: z.string().min(2).max(100),
        email: z.string().email().max(200),
        phone: z.string().max(30).optional(),
        password: z.string().min(6).max(120),
        height_cm: z.number().min(80).max(260).optional(),
        weight_kg: z.number().min(25).max(350).optional(),
        age: z.number().int().min(10).max(110).optional(),
        gender: z.string().max(20).optional(),
        notes: z.string().max(500).optional(),
        initial_plan: z.string().optional(),
        payment_status: z.enum(["paid", "pending", "free"]).optional(),
        payment_method: z.string().optional(),
        amount_inr: z.number().min(0).max(500000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("members");
    return createMemberByAdmin(data, admin);
  });

export const adminUpdateMemberFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        memberId: z.number().int(),
        name: z.string().min(2).max(100),
        email: z.string().email().max(200),
        phone: z.string().max(30).nullable().optional(),
        height_cm: z.number().min(80).max(260).nullable().optional(),
        weight_kg: z.number().min(25).max(350).nullable().optional(),
        age: z.number().int().min(10).max(110).nullable().optional(),
        gender: z.string().max(20).nullable().optional(),
        notes: z.string().max(1000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("members");
    const sql = getSql();
    await sql`
      UPDATE users
      SET name = ${data.name.trim()},
          email = ${data.email.trim().toLowerCase()},
          phone = ${data.phone ?? null},
          height_cm = ${data.height_cm ?? null},
          weight_kg = ${data.weight_kg ?? null},
          age = ${data.age ?? null},
          gender = ${data.gender ?? null},
          notes = ${data.notes ?? null}
      WHERE id = ${data.memberId}
    `;
    await logAdminActivity(admin, "member_updated", "member", data.memberId, { name: data.name });
    return { ok: true };
  });

export const adminArchiveMemberFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        memberId: z.number().int(),
        mode: z.enum(["archive", "restore", "delete_permanent"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("members", { ownerOnly: data.mode === "delete_permanent" });
    const sql = getSql();
    if (data.mode === "archive") {
      await sql`UPDATE users SET status = 'archived' WHERE id = ${data.memberId}`;
      await sql`DELETE FROM sessions WHERE user_id = ${data.memberId}`;
      await logAdminActivity(admin, "member_archived", "member", data.memberId);
    } else if (data.mode === "restore") {
      await sql`UPDATE users SET status = 'active' WHERE id = ${data.memberId}`;
      await logAdminActivity(admin, "member_restored", "member", data.memberId);
    } else {
      await sql`DELETE FROM users WHERE id = ${data.memberId}`;
      await logAdminActivity(admin, "member_deleted_permanently", "member", data.memberId);
    }
    return { ok: true };
  });

// ---------- ATTENDANCE ----------
export const adminAttendanceFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin("attendance");
  return getAttendanceDashboard();
});

export const adminCheckInMemberFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ userId: z.number().int(), day: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin("attendance");
    const sql = getSql();
    const day = data.day || new Date().toISOString().slice(0, 10);
    const existing = (await sql`SELECT id FROM check_ins WHERE user_id = ${data.userId} AND day = ${day} LIMIT 1`) as any[];
    if (existing.length) {
      throw new Error("Member is already checked in for this date (duplicate prevented).");
    }
    await sql`
      INSERT INTO check_ins (user_id, day, checked_in_at, source, corrected_by)
      VALUES (${data.userId}, ${day}, NOW(), 'admin', ${admin.actor_name})
    `;
    await logAdminActivity(admin, "member_checked_in", "member", data.userId, { day });
    return { ok: true };
  });

export const adminCheckOutMemberFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ checkInId: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin("attendance");
    const sql = getSql();
    const rows = (await sql`
      UPDATE check_ins SET checked_out_at = NOW() WHERE id = ${data.checkInId} AND checked_out_at IS NULL RETURNING user_id, day
    `) as any[];
    if (!rows.length) throw new Error("Active check-in not found or already checked out.");
    await logAdminActivity(admin, "member_checked_out", "member", rows[0].user_id, { checkInId: data.checkInId });
    return { ok: true };
  });

export const adminCorrectAttendanceFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        action: z.enum(["add", "remove", "set_checkout"]),
        checkInId: z.number().int().optional(),
        userId: z.number().int().optional(),
        day: z.string().optional(),
        reason: z.string().min(3).max(300),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("attendance");
    const sql = getSql();
    if (data.action === "add") {
      if (!data.userId || !data.day) throw new Error("Member and date required");
      await sql`
        INSERT INTO check_ins (user_id, day, checked_in_at, source, corrected_by, correction_note)
        VALUES (${data.userId}, ${data.day}, NOW(), 'corrected', ${admin.actor_name}, ${data.reason})
        ON CONFLICT (user_id, day) DO UPDATE SET
          source = 'corrected', corrected_by = ${admin.actor_name}, correction_note = ${data.reason}
      `;
      await logAdminActivity(admin, "attendance_corrected_add", "member", data.userId, { day: data.day, reason: data.reason });
    } else if (data.action === "remove") {
      if (!data.checkInId) throw new Error("Check-in ID required");
      const rows = (await sql`DELETE FROM check_ins WHERE id = ${data.checkInId} RETURNING user_id, day`) as any[];
      await logAdminActivity(admin, "attendance_corrected_remove", "member", rows[0]?.user_id, {
        checkInId: data.checkInId,
        day: rows[0]?.day,
        reason: data.reason,
      });
    } else if (data.action === "set_checkout") {
      if (!data.checkInId) throw new Error("Check-in ID required");
      const rows = (await sql`
        UPDATE check_ins SET checked_out_at = NOW(), source = 'corrected', corrected_by = ${admin.actor_name}, correction_note = ${data.reason}
        WHERE id = ${data.checkInId} RETURNING user_id
      `) as any[];
      await logAdminActivity(admin, "attendance_corrected_checkout", "member", rows[0]?.user_id, {
        checkInId: data.checkInId,
        reason: data.reason,
      });
    }
    return { ok: true };
  });

// ---------- INACTIVE MEMBERS & FOLLOWUPS ----------
export const adminInactiveMembersFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin("inactive");
  return getInactiveMembersData();
});

export const adminAddFollowupFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        userId: z.number().int(),
        channel: z.enum(["note", "call", "whatsapp", "email"]),
        inactivityTier: z.string().optional(),
        note: z.string().min(2).max(1000),
        status: z.enum(["pending", "completed"]).default("pending"),
        scheduledFor: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("inactive");
    const sql = getSql();
    await sql`
      INSERT INTO member_followups (user_id, channel, inactivity_tier, note, status, scheduled_for, completed_at, created_by)
      VALUES (
        ${data.userId},
        ${data.channel},
        ${data.inactivityTier ?? null},
        ${data.note},
        ${data.status},
        ${data.scheduledFor || null},
        ${data.status === "completed" ? new Date().toISOString() : null},
        ${admin.actor_name}
      )
    `;
    await logAdminActivity(admin, "followup_logged", "member", data.userId, { channel: data.channel, status: data.status });
    return { ok: true };
  });

export const adminUpdateFollowupFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ id: z.number().int(), status: z.enum(["pending", "completed"]), scheduledFor: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("inactive");
    const sql = getSql();
    await sql`
      UPDATE member_followups
      SET status = ${data.status},
          scheduled_for = COALESCE(${data.scheduledFor || null}, scheduled_for),
          completed_at = CASE WHEN ${data.status} = 'completed' THEN NOW() ELSE NULL END
      WHERE id = ${data.id}
    `;
    await logAdminActivity(admin, "followup_updated", "followup", data.id, { status: data.status });
    return { ok: true };
  });

// ---------- MEMBERSHIPS & PLANS ----------
export const adminMembershipsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin("memberships");
  return getAdminMembershipsData();
});

export const adminSavePlanFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        id: z.number().int().optional(),
        slug: z.string().min(2).max(50),
        name: z.string().min(2).max(80),
        description: z.string().max(300).default(""),
        price_inr: z.number().min(0).max(500000),
        duration_days: z.number().int().min(1).max(1825),
        benefits: z.array(z.string()).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("memberships");
    const sql = getSql();
    const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    if (data.id) {
      await sql`
        UPDATE membership_plans
        SET slug = ${cleanSlug}, name = ${data.name}, description = ${data.description},
            price_inr = ${data.price_inr}, duration_days = ${data.duration_days}, benefits = ${JSON.stringify(data.benefits)}::jsonb
        WHERE id = ${data.id}
      `;
      await logAdminActivity(admin, "plan_updated", "plan", data.id, { name: data.name, price_inr: data.price_inr });
    } else {
      const rows = (await sql`
        INSERT INTO membership_plans (slug, name, description, price_inr, duration_days, benefits)
        VALUES (${cleanSlug}, ${data.name}, ${data.description}, ${data.price_inr}, ${data.duration_days}, ${JSON.stringify(data.benefits)}::jsonb)
        RETURNING id
      `) as any[];
      await logAdminActivity(admin, "plan_created", "plan", rows[0]?.id, { name: data.name, price_inr: data.price_inr });
    }
    return { ok: true };
  });

export const adminTogglePlanFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ id: z.number().int(), action: z.enum(["enable", "disable", "archive"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("memberships");
    const sql = getSql();
    if (data.action === "archive") {
      await sql`UPDATE membership_plans SET is_archived = true, is_active = false WHERE id = ${data.id}`;
    } else {
      await sql`UPDATE membership_plans SET is_active = ${data.action === "enable"} WHERE id = ${data.id}`;
    }
    await logAdminActivity(admin, `plan_${data.action}`, "plan", data.id);
    return { ok: true };
  });

export const adminAssignMembershipFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        user_id: z.number().int(),
        plan_slug: z.string().min(1),
        duration_days: z.number().int().min(1).max(1825).optional(),
        amount_inr: z.number().min(0).max(500000).optional(),
        payment_status: z.enum(["paid", "pending", "overdue", "free"]),
        payment_method: z.string().optional(),
        notes: z.string().max(400).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("memberships");
    return assignMembershipToMember(data, admin);
  });

export const adminAdjustMembershipFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        membershipId: z.number().int(),
        action: z.enum(["extend", "pause", "resume", "deactivate", "activate", "log_renewal_reminder"]),
        extendDays: z.number().int().min(1).max(730).optional(),
        markPaymentStatus: z.enum(["unchanged", "pending", "overdue"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("memberships");
    const sql = getSql();
    const rows = (await sql`SELECT * FROM memberships WHERE id = ${data.membershipId} LIMIT 1`) as any[];
    const m = rows[0];
    if (!m) throw new Error("Membership record not found");

    if (data.action === "extend") {
      const days = data.extendDays || 30;
      const base = Math.max(Date.now(), new Date(m.ends_at).getTime());
      const nextEnds = new Date(base + days * 86400000).toISOString();
      // Explicitly never auto-mark a member as paid when extending validity
      const nextPayStatus = data.markPaymentStatus && data.markPaymentStatus !== "unchanged" ? data.markPaymentStatus : m.payment_status;
      await sql`
        UPDATE memberships SET ends_at = ${nextEnds}, payment_status = ${nextPayStatus}, status = 'active'
        WHERE id = ${data.membershipId}
      `;
      await logAdminActivity(admin, "membership_extended", "member", m.user_id, {
        membershipId: m.id,
        extendDays: days,
        paymentStatus: nextPayStatus,
      });
    } else if (data.action === "pause") {
      const rem = Math.max(0, Math.ceil((new Date(m.ends_at).getTime() - Date.now()) / 86400000));
      await sql`
        UPDATE memberships SET status = 'paused', paused_at = NOW(), paused_days_remaining = ${rem}
        WHERE id = ${data.membershipId}
      `;
      await logAdminActivity(admin, "membership_paused", "member", m.user_id, { membershipId: m.id, pausedDaysRemaining: rem });
    } else if (data.action === "resume") {
      const rem = Number(m.paused_days_remaining || 0);
      const nextEnds = new Date(Date.now() + rem * 86400000).toISOString();
      await sql`
        UPDATE memberships SET status = 'active', ends_at = ${nextEnds}, paused_at = NULL, paused_days_remaining = NULL
        WHERE id = ${data.membershipId}
      `;
      await logAdminActivity(admin, "membership_resumed", "member", m.user_id, { membershipId: m.id, restoredDays: rem });
    } else if (data.action === "deactivate") {
      await sql`UPDATE memberships SET status = 'inactive' WHERE id = ${data.membershipId}`;
      await logAdminActivity(admin, "membership_deactivated", "member", m.user_id, { membershipId: m.id });
    } else if (data.action === "activate") {
      await sql`UPDATE memberships SET status = 'active' WHERE id = ${data.membershipId}`;
      await logAdminActivity(admin, "membership_activated", "member", m.user_id, { membershipId: m.id });
    } else if (data.action === "log_renewal_reminder") {
      await sql`
        INSERT INTO member_followups (user_id, channel, inactivity_tier, note, status, created_by)
        VALUES (${m.user_id}, 'whatsapp', 'renewal', ${`Renewal reminder prepared for ${m.plan} plan`}, 'completed', ${admin.actor_name})
      `;
      await logAdminActivity(admin, "renewal_reminder_logged", "member", m.user_id, { membershipId: m.id, plan: m.plan });
    }
    return { ok: true };
  });

// ---------- PAYMENTS & REFUNDS ----------
export const adminPaymentsFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ status: z.string().optional(), search: z.string().optional() }).optional().parse(d))
  .handler(async ({ data }) => {
    await requireAdmin("payments");
    return getAdminPaymentsData(data ?? {});
  });

export const adminRecordPaymentFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        paymentId: z.number().int().optional(),
        userId: z.number().int().optional(),
        amount_inr: z.number().min(1).max(500000),
        payment_method: z.enum(["cash", "upi", "card", "bank_transfer", "razorpay"]),
        purpose: z.string().min(2).max(200),
        status: z.enum(["paid", "pending", "overdue"]).default("paid"),
        notes: z.string().max(400).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("payments");
    const sql = getSql();
    if (data.paymentId) {
      const rows = (await sql`
        UPDATE payments
        SET status = ${data.status},
            payment_method = ${data.payment_method},
            notes = COALESCE(notes || ' | ', '') || ${`Updated by ${admin.actor_name}: ${data.notes || data.status}`},
            recorded_by = ${admin.actor_name}
        WHERE id = ${data.paymentId}
        RETURNING user_id, membership_id
      `) as any[];
      if (rows[0]?.membership_id && data.status === "paid") {
        await sql`UPDATE memberships SET payment_status = 'paid' WHERE id = ${rows[0].membership_id}`;
      }
      await logAdminActivity(admin, "payment_updated", "payment", data.paymentId, { status: data.status, method: data.payment_method });
    } else {
      const txnId = `OFF-${Date.now()}`;
      const rows = (await sql`
        INSERT INTO payments (user_id, transaction_id, amount_inr, payment_method, purpose, status, notes, recorded_by)
        VALUES (${data.userId ?? null}, ${txnId}, ${data.amount_inr}, ${data.payment_method}, ${data.purpose}, ${data.status}, ${data.notes ?? null}, ${admin.actor_name})
        RETURNING id
      `) as any[];
      await logAdminActivity(admin, "offline_payment_recorded", "payment", rows[0]?.id, {
        amount_inr: data.amount_inr,
        method: data.payment_method,
        status: data.status,
      });
    }
    return { ok: true };
  });

export const adminRefundPaymentFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ paymentId: z.number().int(), reason: z.string().min(3).max(300) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin("payments");
    return processPaymentRefund(data.paymentId, data.reason, admin);
  });

// ---------- TRAINERS & STAFF ----------
export const adminTrainersStaffFn = createServerFn({ method: "GET" }).handler(async () => {
  const admin = await requireAdmin("trainers");
  return getTrainersAndStaffData(admin);
});

export const adminSaveTrainerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        id: z.number().int().optional(),
        slug: z.string().min(2).max(80),
        name: z.string().min(2).max(100),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().max(30).optional(),
        photo_url: z.string().max(300).optional(),
        specialization: z.string().min(2).max(120),
        experience_years: z.number().int().min(0).max(60),
        bio: z.string().max(500).default(""),
        monthly_price: z.number().min(0).max(200000),
        quarterly_price: z.number().min(0).max(500000),
        annual_price: z.number().min(0).max(1000000),
        working_hours: z.string().max(100).default("6:00 AM - 2:00 PM"),
        availability: z.string().max(100).default("Mon - Sat"),
        compensation_type: z.enum(["salary", "commission", "hybrid"]).default("salary"),
        salary_inr: z.number().min(0).max(1000000).default(0),
        commission_pct: z.number().min(0).max(100).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("trainers");
    const sql = getSql();
    const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const salary = admin.canViewCompensation ? data.salary_inr : 0;
    const comm = admin.canViewCompensation ? data.commission_pct : 0;

    if (data.id) {
      if (admin.canViewCompensation) {
        await sql`
          UPDATE gym_trainers
          SET slug = ${cleanSlug}, name = ${data.name}, email = ${data.email || null}, phone = ${data.phone ?? null},
              photo_url = ${data.photo_url ?? null}, specialization = ${data.specialization},
              experience_years = ${data.experience_years}, bio = ${data.bio},
              monthly_price = ${data.monthly_price}, quarterly_price = ${data.quarterly_price}, annual_price = ${data.annual_price},
              working_hours = ${data.working_hours}, availability = ${data.availability},
              compensation_type = ${data.compensation_type}, salary_inr = ${salary}, commission_pct = ${comm}
          WHERE id = ${data.id}
        `;
      } else {
        await sql`
          UPDATE gym_trainers
          SET slug = ${cleanSlug}, name = ${data.name}, email = ${data.email || null}, phone = ${data.phone ?? null},
              photo_url = ${data.photo_url ?? null}, specialization = ${data.specialization},
              experience_years = ${data.experience_years}, bio = ${data.bio},
              monthly_price = ${data.monthly_price}, quarterly_price = ${data.quarterly_price}, annual_price = ${data.annual_price},
              working_hours = ${data.working_hours}, availability = ${data.availability}
          WHERE id = ${data.id}
        `;
      }
      await logAdminActivity(admin, "trainer_updated", "trainer", data.id, { name: data.name });
    } else {
      const rows = (await sql`
        INSERT INTO gym_trainers (
          slug, name, email, phone, photo_url, specialization, experience_years, bio,
          monthly_price, quarterly_price, annual_price, working_hours, availability,
          compensation_type, salary_inr, commission_pct
        ) VALUES (
          ${cleanSlug}, ${data.name}, ${data.email || null}, ${data.phone ?? null}, ${data.photo_url || "/images/trainer-1.png"},
          ${data.specialization}, ${data.experience_years}, ${data.bio},
          ${data.monthly_price}, ${data.quarterly_price}, ${data.annual_price},
          ${data.working_hours}, ${data.availability}, ${data.compensation_type}, ${salary}, ${comm}
        )
        RETURNING id
      `) as any[];
      await logAdminActivity(admin, "trainer_created", "trainer", rows[0]?.id, { name: data.name });
    }
    return { ok: true };
  });

export const adminToggleTrainerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.number().int(), is_active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin("trainers");
    const sql = getSql();
    await sql`UPDATE gym_trainers SET is_active = ${data.is_active} WHERE id = ${data.id}`;
    await logAdminActivity(admin, data.is_active ? "trainer_activated" : "trainer_deactivated", "trainer", data.id);
    return { ok: true };
  });

export const adminAssignTrainerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        trainerId: z.number().int(),
        userId: z.number().int(),
        scheduleNotes: z.string().max(300).optional(),
        pendingSessions: z.number().int().min(0).max(500).default(12),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("trainers");
    const sql = getSql();
    await sql`
      INSERT INTO trainer_assignments (trainer_id, user_id, schedule_notes, pending_sessions, status)
      VALUES (${data.trainerId}, ${data.userId}, ${data.scheduleNotes ?? null}, ${data.pendingSessions}, 'active')
      ON CONFLICT (trainer_id, user_id) DO UPDATE SET
        schedule_notes = ${data.scheduleNotes ?? null},
        pending_sessions = ${data.pendingSessions},
        status = 'active'
    `;
    await logAdminActivity(admin, "trainer_member_assigned", "trainer", data.trainerId, { userId: data.userId });
    return { ok: true };
  });

export const adminUpdateSessionCountsFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ assignmentId: z.number().int(), completed: z.number().int().min(0), pending: z.number().int().min(0) }).parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("trainers");
    const sql = getSql();
    await sql`
      UPDATE trainer_assignments
      SET completed_sessions = ${data.completed}, pending_sessions = ${data.pending}
      WHERE id = ${data.assignmentId}
    `;
    await logAdminActivity(admin, "trainer_sessions_updated", "assignment", data.assignmentId, {
      completed: data.completed,
      pending: data.pending,
    });
    return { ok: true };
  });

export const adminSaveStaffFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        id: z.number().int().optional(),
        name: z.string().min(2).max(100),
        email: z.string().email(),
        phone: z.string().max(30).optional(),
        password: z.string().optional(),
        role: z.enum(["manager", "receptionist", "supervisor", "support", "trainer"]),
        permissions: z.array(
          z.enum(["overview", "members", "attendance", "inactive", "memberships", "payments", "trainers", "finance", "reports", "settings"]),
        ),
        salary_inr: z.number().min(0).max(500000).default(0),
        shift_hours: z.string().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("trainers", { ownerOnly: true });
    return saveGymStaff(data, admin);
  });

export const adminToggleStaffFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.number().int(), is_active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin("trainers", { ownerOnly: true });
    const sql = getSql();
    await sql`UPDATE gym_staff SET is_active = ${data.is_active} WHERE id = ${data.id}`;
    await logAdminActivity(admin, data.is_active ? "staff_activated" : "staff_deactivated", "staff", data.id);
    return { ok: true };
  });

// ---------- FINANCE & REPORTS ----------
export const adminFinanceFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ startDate: z.string().optional(), endDate: z.string().optional() }).optional().parse(d))
  .handler(async ({ data }) => {
    await requireAdmin("finance");
    return getFinanceAndReportsData(data ?? {});
  });

export const adminReportsFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ startDate: z.string().optional(), endDate: z.string().optional() }).optional().parse(d))
  .handler(async ({ data }) => {
    await requireAdmin("reports");
    return getFinanceAndReportsData(data ?? {});
  });

export const adminAddExpenseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        title: z.string().min(2).max(150),
        category: z.string().min(2).max(80),
        amount_inr: z.number().min(1).max(5000000),
        expense_date: z.string().min(8),
        description: z.string().max(500).optional(),
        payment_method: z.string().max(40).default("bank_transfer"),
        receipt_url: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("finance");
    const sql = getSql();
    const rows = (await sql`
      INSERT INTO gym_expenses (title, category, amount_inr, expense_date, description, payment_method, receipt_url, recorded_by)
      VALUES (${data.title}, ${data.category}, ${data.amount_inr}, ${data.expense_date}, ${data.description ?? null}, ${data.payment_method}, ${data.receipt_url ?? null}, ${admin.actor_name})
      RETURNING id
    `) as any[];
    await logAdminActivity(admin, "expense_recorded", "expense", rows[0]?.id, { title: data.title, amount_inr: data.amount_inr });
    return { ok: true };
  });

export const adminDeleteExpenseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin("finance", { ownerOnly: true });
    const sql = getSql();
    await sql`DELETE FROM gym_expenses WHERE id = ${data.id}`;
    await logAdminActivity(admin, "expense_deleted", "expense", data.id);
    return { ok: true };
  });

export const adminExportCsvFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        kind: z.enum(["revenue", "expenses", "members", "attendance"]),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin("reports");
    const csv = await generateCsvExport(data.kind, data.startDate, data.endDate);
    return { csv, filename: `fitness365-${data.kind}-${new Date().toISOString().slice(0, 10)}.csv` };
  });

// ---------- SETTINGS & SECURITY LOGS ----------
export const adminSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin("settings", { ownerOnly: true });
  const sql = getSql();
  const [settings, logs, sessions] = await Promise.all([
    getGymSettings(),
    sql`SELECT * FROM admin_activity_logs ORDER BY created_at DESC LIMIT 80` as Promise<any[]>,
    sql`SELECT token, role, actor_name, ip_address, expires_at, created_at FROM admin_sessions WHERE revoked_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC` as Promise<any[]>,
  ]);
  return {
    settings,
    logs,
    sessions: sessions.map((s) => ({ ...s, tokenPreview: String(s.token).slice(0, 8) + "..." })),
    envStatus: {
      adminCodeConfigured: /^\d{6}$/.test((process.env.GYM_ADMIN_ACCESS_CODE || "").trim()),
      razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      webhookConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    },
  };
});

export const adminUpdateSettingsFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        gym_name: z.string().min(2).max(100),
        early_warning_days: z.number().int().min(1).max(30),
        inactive_days: z.number().int().min(2).max(60),
        high_priority_days: z.number().int().min(3).max(90),
        critical_days: z.number().int().min(5).max(180),
        expiry_alert_days: z.number().int().min(1).max(60),
        whatsapp_template: z.string().min(5).max(1000),
        renewal_template: z.string().min(5).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin("settings", { ownerOnly: true });
    const sql = getSql();
    await sql`
      UPDATE gym_settings
      SET gym_name = ${data.gym_name},
          early_warning_days = ${data.early_warning_days},
          inactive_days = ${data.inactive_days},
          high_priority_days = ${data.high_priority_days},
          critical_days = ${data.critical_days},
          expiry_alert_days = ${data.expiry_alert_days},
          whatsapp_template = ${data.whatsapp_template},
          renewal_template = ${data.renewal_template},
          updated_at = NOW()
      WHERE id = 1
    `;
    await logAdminActivity(admin, "settings_updated", "settings", 1);
    return { ok: true };
  });

export const adminRevokeSessionFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ tokenPrefix: z.string().min(4) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin("settings", { ownerOnly: true });
    const sql = getSql();
    const clean = data.tokenPrefix.replace("...", "");
    await sql`UPDATE admin_sessions SET revoked_at = NOW() WHERE token LIKE ${clean + "%"}`;
    await logAdminActivity(admin, "admin_session_revoked", "session", clean);
    return { ok: true };
  });
