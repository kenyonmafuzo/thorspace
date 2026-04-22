import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const PLAN_DAYS = {
  "1day":   1,
  "7days":  7,
  "15days": 15,
  "30days": 30,
};

// Admin Supabase client — bypasses RLS (same pattern as MP webhook)
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin config ausente");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// VIP activation — same logic as MP webhook/confirm routes
async function activateVip(userId, planId) {
  const days = PLAN_DAYS[planId];
  if (!days) throw new Error(`Plano desconhecido: ${planId}`);

  const admin = getAdminClient();

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

  console.log(
    `[Stripe Webhook] ✅ VIP ativado — user: ${userId} | plano: ${planId} | expira: ${newExpiry.toISOString()}`
  );
  return { vip_starts: currentExpiry.toISOString(), vip_expires: newExpiry.toISOString() };
}

export async function POST(request) {
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET não configurado");
    return NextResponse.json({ error: "Webhook secret não configurado" }, { status: 500 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY não configurado" }, { status: 500 });
  }

  // IMPORTANT: must read raw body BEFORE any JSON parsing for signature verification
  let event;
  try {
    const rawBody = await request.text();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Assinatura inválida:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { user_id, plan_id } = session.metadata || {};

    if (!user_id || !plan_id) {
      console.error("[Stripe Webhook] metadata ausente na sessão:", session.id);
      // Return 200 — no point retrying without metadata
      return NextResponse.json({ status: "missing_metadata" });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ status: "not_paid" });
    }

    // Idempotency: skip if this session was already processed (same pattern as MP confirm)
    const admin = getAdminClient();
    const { data: existing } = await admin
      .from("inbox")
      .select("id")
      .eq("user_id", user_id)
      .contains("meta", { stripe_session_id: session.id })
      .maybeSingle();

    if (existing) {
      console.log(`[Stripe Webhook] Sessão já processada: ${session.id} — skip`);
      return NextResponse.json({ status: "already_processed" });
    }

    try {
      const { vip_expires } = await activateVip(user_id, plan_id);

      // Send inbox notification
      await admin.from("inbox").insert([{
        user_id,
        type: "vip",
        title: "💎 VIP Ativado!",
        content: `Seu VIP ${plan_id} está ativo até ${new Date(vip_expires).toLocaleDateString("pt-BR")}.`,
        cta: "Ver minha área VIP",
        cta_url: "/vip",
        lang: "en",
        created_at: new Date().toISOString(),
        meta: { stripe_session_id: session.id, plan_id },
      }]);
    } catch (err) {
      console.error("[Stripe Webhook] Erro ao ativar VIP:", err.message);
      // Return 200 to prevent Stripe from retrying infinitely (same as MP webhook)
      return NextResponse.json({ status: "error", message: err.message });
    }
  }

  // All other event types: acknowledge and ignore
  return NextResponse.json({ status: "ok" });
}
