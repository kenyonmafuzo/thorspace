import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Mirrors app/api/mp/confirm/route.js — called by stripe-success page after redirect

const PLAN_DAYS = {
  "1day":   1,
  "7days":  7,
  "15days": 15,
  "30days": 30,
};

const PLAN_LABELS = {
  "1day":   "1 Dia",
  "7days":  "7 Dias",
  "15days": "15 Dias",
  "30days": "30 Dias",
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin config ausente");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function activateVip(admin, userId, planId) {
  const days = PLAN_DAYS[planId];
  if (!days) throw new Error(`Plano desconhecido: ${planId}`);

  const { data: profile } = await admin
    .from("profiles")
    .select("is_vip, vip_expires_at")
    .eq("id", userId)
    .maybeSingle();

  const now = new Date();
  const currentExpiry =
    profile?.is_vip && profile?.vip_expires_at && new Date(profile.vip_expires_at) > now
      ? new Date(profile.vip_expires_at)
      : now;

  const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);

  const { error } = await admin
    .from("profiles")
    .update({ is_vip: true, vip_expires_at: newExpiry.toISOString(), vip_plan: planId })
    .eq("id", userId);

  if (error) throw error;

  return { vip_starts: currentExpiry.toISOString(), vip_expires: newExpiry.toISOString() };
}

// POST — called by stripe-success page with { sessionId }
export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId obrigatório" }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "STRIPE_SECRET_KEY não configurado" }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ activated: false, payment_status: session.payment_status });
    }

    const { user_id, plan_id } = session.metadata || {};
    if (!user_id || !plan_id) {
      throw new Error("metadata ausente na sessão Stripe");
    }

    const admin = getAdminClient();
    const { vip_starts, vip_expires } = await activateVip(admin, user_id, plan_id);

    // Idempotent inbox notification (same check as webhook)
    const { data: existing } = await admin
      .from("inbox")
      .select("id")
      .eq("user_id", user_id)
      .contains("meta", { stripe_session_id: sessionId })
      .maybeSingle();

    if (!existing) {
      await admin.from("inbox").insert([{
        user_id,
        type: "vip",
        title: "💎 VIP Ativado!",
        content: `Seu VIP ${plan_id} está ativo até ${new Date(vip_expires).toLocaleDateString("pt-BR")}.`,
        cta: "Ver minha área VIP",
        cta_url: "/vip",
        lang: "en",
        created_at: new Date().toISOString(),
        meta: { stripe_session_id: sessionId, plan_id },
      }]);
    }

    console.log(
      `[Stripe confirm-session] ✅ VIP confirmado — user: ${user_id} | plano: ${plan_id} | expira: ${vip_expires}`
    );

    return NextResponse.json({
      activated: true,
      plan_id,
      plan_label: PLAN_LABELS[plan_id] || plan_id,
      vip_starts,
      vip_expires,
    });
  } catch (err) {
    console.error("[Stripe confirm-session] Erro:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
