import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// ─── THIS IS THE ONLY PLACE THAT ACTIVATES VIP FOR STRIPE PAYMENTS ───
// Idempotency: profiles.vip_stripe_session_id (set atomically with VIP update).
// confirm-session is read-only; it never writes to the DB.

const PLAN_DAYS = {
  "1day":   1,
  "7days":  7,
  "15days": 15,
  "30days": 30,
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin config ausente");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Activates VIP and stamps vip_stripe_session_id to prevent double-processing.
// Returns { vip_expires } on success.
async function activateVip(admin, userId, planId, sessionId) {
  const days = PLAN_DAYS[planId];
  if (!days) throw new Error(`Plano desconhecido: ${planId}`);

  const { data: profile } = await admin
    .from("profiles")
    .select("is_vip, vip_expires_at, vip_stripe_session_id")
    .eq("id", userId)
    .maybeSingle();

  // Idempotency guard — already processed this exact checkout session
  if (profile?.vip_stripe_session_id === sessionId) {
    console.log(`[Stripe Webhook] Idempotency hit — sessão já processada: ${sessionId}`);
    return { alreadyProcessed: true, vip_expires: profile.vip_expires_at };
  }

  const now = new Date();
  const currentExpiry =
    profile?.is_vip && profile?.vip_expires_at && new Date(profile.vip_expires_at) > now
      ? new Date(profile.vip_expires_at)
      : now;

  const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);

  const { error } = await admin
    .from("profiles")
    .update({
      is_vip: true,
      vip_expires_at: newExpiry.toISOString(),
      vip_plan: planId,
      vip_stripe_session_id: sessionId, // <-- idempotency key stamped atomically
    })
    .eq("id", userId);

  if (error) throw error;

  console.log(
    `[Stripe Webhook] ✅ VIP ativado — user: ${userId} | plano: ${planId} | expira: ${newExpiry.toISOString()}`
  );
  return { alreadyProcessed: false, vip_expires: newExpiry.toISOString() };
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

  // Must read raw body BEFORE any JSON parsing for HMAC signature verification
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
      return NextResponse.json({ status: "missing_metadata" }); // 200 — no retry value
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ status: "not_paid" });
    }

    const admin = getAdminClient();

    try {
      const { alreadyProcessed, vip_expires } = await activateVip(
        admin, user_id, plan_id, session.id
      );

      if (!alreadyProcessed) {
        // Inbox notification — for UX only, not used for idempotency
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
      }
    } catch (err) {
      console.error("[Stripe Webhook] Erro ao ativar VIP:", err.message);
      // Return 200 — prevents infinite Stripe retries for non-transient errors
      return NextResponse.json({ status: "error", message: err.message });
    }
  }

  return NextResponse.json({ status: "ok" });
}
