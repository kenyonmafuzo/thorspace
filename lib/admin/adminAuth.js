// lib/admin/adminAuth.js
// Server-side admin authentication helpers.
// Uses its own admin_users + admin_sessions tables — completely separate from Supabase auth.

import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { getAdminClient } from "./adminClient";

export const ADMIN_COOKIE = "thor_admin_session";
const SESSION_HOURS = 8;

// ── Helpers ────────────────────────────────────────────────────────────────────

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function adminLogin({ email, password, ip, userAgent }) {
  const db = getAdminClient();

  const { data: admin, error } = await db
    .from("admin_users")
    .select("id, email, password_hash, role, display_name, is_active")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (error || !admin) return { ok: false, error: "Credenciais inválidas" };
  if (!admin.is_active) return { ok: false, error: "Conta desativada" };

  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) return { ok: false, error: "Credenciais inválidas" };

  // Create session
  const token = randomBytes(48).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();

  await db.from("admin_sessions").insert({
    admin_user_id: admin.id,
    token_hash: tokenHash,
    ip_address: ip,
    user_agent: userAgent,
    expires_at: expiresAt,
  });

  await db.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", admin.id);

  await auditLog({ adminUserId: admin.id, action: "auth.login", ip });

  return {
    ok: true,
    token,
    admin: { id: admin.id, email: admin.email, role: admin.role, displayName: admin.display_name },
  };
}

// ── Verify session ─────────────────────────────────────────────────────────────

export async function getAdminSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE)?.value;
    if (!token) return null;

    const db = getAdminClient();
    const tokenHash = hashToken(token);

    const { data: session } = await db
      .from("admin_sessions")
      .select("id, admin_user_id, expires_at, admin_users(id, email, role, display_name, is_active)")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!session) return null;
    if (new Date(session.expires_at) < new Date()) {
      await db.from("admin_sessions").delete().eq("id", session.id);
      return null;
    }

    const admin = session.admin_users;
    if (!admin?.is_active) return null;

    return {
      sessionId: session.id,
      id: admin.id,
      email: admin.email,
      role: admin.role,
      displayName: admin.display_name,
    };
  } catch {
    return null;
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function adminLogout(token) {
  if (!token) return;
  const db = getAdminClient();
  await db.from("admin_sessions").delete().eq("token_hash", hashToken(token));
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export async function auditLog({ adminUserId, action, targetType, targetId, oldValue, newValue, ip }) {
  try {
    const db = getAdminClient();
    await db.from("admin_audit_logs").insert({
      admin_user_id: adminUserId || null,
      action,
      target_type: targetType || null,
      target_id: targetId ? String(targetId) : null,
      old_value: oldValue || null,
      new_value: newValue || null,
      ip_address: ip || null,
    });
  } catch (e) {
    console.error("[auditLog] error:", e?.message);
  }
}

// ── Create first super_admin (use only once via seed script) ──────────────────

export async function createAdminUser({ email, password, role = "admin", displayName }) {
  const db = getAdminClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const { data, error } = await db
    .from("admin_users")
    .insert({ email: email.toLowerCase(), password_hash: passwordHash, role, display_name: displayName })
    .select("id, email, role")
    .single();
  if (error) throw error;
  return data;
}
