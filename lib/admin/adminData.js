// lib/admin/adminData.js
// Data-fetching helpers for admin panel pages. All use service-role client.

import { getAdminClient } from "./adminClient";

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const db = getAdminClient();
  const now = new Date().toISOString();

  const [
    { count: totalUsers },
    { count: totalVips },
    { count: newUsersToday },
    { data: recentPayments },
  ] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("is_vip", true),
    db.from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    db.from("vip_payment_history")
      .select("id, email:user_id(email), amount, currency, provider, status, paid_at, created_at")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    totalVips: totalVips ?? 0,
    newUsersToday: newUsersToday ?? 0,
    recentPayments: recentPayments ?? [],
  };
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUsers({ page = 1, limit = 30, search = "", filter = "all" } = {}) {
  const db = getAdminClient();
  const offset = (page - 1) * limit;

  let query = db
    .from("profiles")
    .select(
      "id, username, avatar_preset, is_vip, vip_expires_at, vip_plan, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike("username", `%${search}%`);
  }

  if (filter === "vip") query = query.eq("is_vip", true);
  if (filter === "non_vip") query = query.eq("is_vip", false);

  const { data, count, error } = await query;
  if (error) throw error;
  return { users: data ?? [], total: count ?? 0 };
}

export async function getUserById(userId) {
  const db = getAdminClient();
  const [profileRes, statsRes, progressRes] = await Promise.all([
    db.from("profiles")
      .select("id, username, avatar_preset, is_vip, vip_expires_at, vip_plan, created_at")
      .eq("id", userId)
      .maybeSingle(),
    db.from("player_stats").select("wins, losses, matches_played, draws, multiplayer_wins, current_streak").eq("user_id", userId).maybeSingle(),
    db.from("player_progress").select("level, xp, total_xp").eq("user_id", userId).maybeSingle(),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (!profileRes.data) return null;
  return {
    ...profileRes.data,
    player_stats: statsRes.data ?? null,
    player_progress: progressRes.data ?? null,
  };
}

// ── VIP ───────────────────────────────────────────────────────────────────────

export async function getVipList({ page = 1, limit = 30, status = "active" } = {}) {
  const db = getAdminClient();
  const offset = (page - 1) * limit;

  const { data, count, error } = await db
    .from("profiles")
    .select("id, username, is_vip, vip_expires_at, vip_plan, vip_stripe_session_id, created_at", {
      count: "exact",
    })
    .eq("is_vip", status === "active")
    .order("vip_expires_at", { ascending: status === "active" })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { records: data ?? [], total: count ?? 0 };
}

export async function grantVip({ userId, durationDays, plan, adminUserId, reason, ip }) {
  const db = getAdminClient();

  const { data: profile, error: pErr } = await db
    .from("profiles")
    .select("id, is_vip, vip_expires_at")
    .eq("id", userId)
    .maybeSingle();
  if (pErr || !profile) throw new Error("Usuário não encontrado");

  const now = new Date();
  const base = profile.is_vip && profile.vip_expires_at && new Date(profile.vip_expires_at) > now
    ? new Date(profile.vip_expires_at)
    : now;
  const newExpiry = new Date(base.getTime() + durationDays * 86400 * 1000).toISOString();

  const { error: upErr } = await db
    .from("profiles")
    .update({ is_vip: true, vip_expires_at: newExpiry, vip_plan: plan ?? `${durationDays}days` })
    .eq("id", userId);
  if (upErr) throw upErr;

  await db.from("vip_status_history").insert({
    user_id: userId,
    action: "manual_extend",
    old_status: profile.is_vip ? "active" : "inactive",
    new_status: "active",
    reason: reason ?? "Admin grant",
    admin_user_id: adminUserId,
  });

  // Audit log
  const { auditLog } = await import("./adminAuth");
  await auditLog({
    adminUserId,
    action: "vip.grant",
    targetType: "user",
    targetId: userId,
    oldValue: { is_vip: profile.is_vip, vip_expires_at: profile.vip_expires_at },
    newValue: { is_vip: true, vip_expires_at: newExpiry },
    ip,
  });

  return { vip_expires_at: newExpiry };
}

export async function revokeVip({ userId, adminUserId, reason, ip }) {
  const db = getAdminClient();

  const { data: profile } = await db.from("profiles").select("is_vip, vip_expires_at").eq("id", userId).maybeSingle();

  await db.from("profiles").update({ is_vip: false, vip_expires_at: null, vip_plan: null }).eq("id", userId);

  await db.from("vip_status_history").insert({
    user_id: userId,
    action: "manual_remove",
    old_status: "active",
    new_status: "inactive",
    reason: reason ?? "Admin revoke",
    admin_user_id: adminUserId,
  });

  const { auditLog } = await import("./adminAuth");
  await auditLog({
    adminUserId,
    action: "vip.revoke",
    targetType: "user",
    targetId: userId,
    oldValue: { is_vip: profile?.is_vip, vip_expires_at: profile?.vip_expires_at },
    newValue: { is_vip: false, vip_expires_at: null },
    ip,
  });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function getPayments({ page = 1, limit = 30, status = "" } = {}) {
  const db = getAdminClient();
  const offset = (page - 1) * limit;

  let query = db
    .from("vip_payment_history")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) throw error;
  return { payments: data ?? [], total: count ?? 0 };
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export async function getAuditLogs({ page = 1, limit = 50 } = {}) {
  const db = getAdminClient();
  const offset = (page - 1) * limit;
  const { data, count, error } = await db
    .from("admin_audit_logs")
    .select("*, admin_users(display_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { logs: data ?? [], total: count ?? 0 };
}
