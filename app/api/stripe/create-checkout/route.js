import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Maps existing plan IDs to Stripe Price IDs (configure in Vercel env vars)
const PLAN_PRICE_IDS = {
  "1day":   process.env.STRIPE_PRICE_ID_1DAY,
  "7days":  process.env.STRIPE_PRICE_ID_7DAYS,
  "15days": process.env.STRIPE_PRICE_ID_15DAYS,
  "30days": process.env.STRIPE_PRICE_ID_30DAYS,
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://thorspace.vercel.app";

export async function POST(request) {
  try {
    // Validate auth token — same pattern as MP routes
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

    const { planId } = await request.json();
    const priceId = PLAN_PRICE_IDS[planId];

    if (!priceId) {
      return NextResponse.json({ error: "Plano inválido ou Stripe Price ID não configurado" }, { status: 400 });
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
      // Store user_id and plan_id so the webhook and confirm-session can activate VIP
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
    console.error("[Stripe create-checkout] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
