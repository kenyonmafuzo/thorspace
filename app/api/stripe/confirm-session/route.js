import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// ─── READ-ONLY — does NOT activate VIP ───────────────────────────────────────
// Called by stripe-success page to verify payment status and get expiry dates
// for the success UI + LocalStorage flag.
// VIP activation is handled exclusively by /api/stripe/webhook.
// ─────────────────────────────────────────────────────────────────────────────

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

    const days = PLAN_DAYS[plan_id];
    if (!days) throw new Error(`Plano desconhecido: ${plan_id}`);

    // Read current profile to compute projected expiry for the success UI.
    // If the webhook already fired, vip_expires_at will have the real value.
    // If the webhook hasn't fired yet, we return a projected value (used only for display).
    const admin = getAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_vip, vip_expires_at, vip_stripe_session_id")
      .eq("id", user_id)
      .maybeSingle();

    let vip_starts, vip_expires;

    if (profile?.vip_stripe_session_id === sessionId) {
      // Webhook already processed this session — return actual DB values
      const now = new Date();
      const effectiveBase =
        profile.is_vip && profile.vip_expires_at && new Date(profile.vip_expires_at) > now
          ? new Date(profile.vip_expires_at)
          : now;
      vip_starts = effectiveBase.toISOString();
      vip_expires = profile.vip_expires_at;
    } else {
      // Webhook hasn't fired yet — project expiry from current DB state for display
      const now = new Date();
      const currentExpiry =
        profile?.is_vip && profile?.vip_expires_at && new Date(profile.vip_expires_at) > now
          ? new Date(profile.vip_expires_at)
          : now;
      vip_starts = currentExpiry.toISOString();
      vip_expires = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    return NextResponse.json({
      activated: true, // payment confirmed — VIP activation handled by webhook
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
  }
}
