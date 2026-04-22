import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://thorspace.com.br";

// Env var names per plan — for clear error messages when one is missing
const PLAN_ENV_KEY = {
  "1day":   "STRIPE_PRICE_ID_1DAY",
  "7days":  "STRIPE_PRICE_ID_7DAYS",
  "15days": "STRIPE_PRICE_ID_15DAYS",
  "30days": "STRIPE_PRICE_ID_30DAYS",
};

export async function POST(request) {
  try {
    // Validate auth token — same pattern as MP routes
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

    const { planId } = await request.json();

    // Read env vars at request time (not module load) to avoid stale undefined values
    const envKey = PLAN_ENV_KEY[planId];
    if (!envKey) {
      return NextResponse.json({ error: `Plano desconhecido: ${planId}` }, { status: 400 });
    }

    const priceId = process.env[envKey];
    if (!priceId) {
      console.error(`[Stripe create-checkout] Env var ausente: ${envKey}`);
      return NextResponse.json(
        { error: `Stripe Price ID não configurado para o plano "${planId}" (${envKey})` },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Configuração de pagamento indisponível" }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/vip/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/vip`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          plan_id: planId,
        },
      },
    });

    console.log(`[Stripe] Checkout session criada: ${session.id} para user ${user.id}, plano ${planId}`);

    return NextResponse.json({ checkout_url: session.url });
  } catch (err) {
    console.error("[Stripe create-checkout] erro:", err?.message || err);
    const msg = err?.message || "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
