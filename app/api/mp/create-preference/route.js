import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getMpAccessToken, isMpTestMode } from "@/lib/mpCredentials";

const PLANS = {
  "1day":   { days: 1,  price: 4.90,  title: "THORSPACE VIP — 1 Dia" },
  "7days":  { days: 7,  price: 14.90, title: "THORSPACE VIP — 7 Dias" },
  "15days": { days: 15, price: 24.90, title: "THORSPACE VIP — 15 Dias" },
  "30days": { days: 30, price: 39.90, title: "THORSPACE VIP — 30 Dias" },
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://thorspace.vercel.app";

export async function POST(request) {
  try {
    // Validate auth token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const body = await request.json();
    const { planId } = body;
    const plan = PLANS[planId];

    if (!plan) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }

    let ACCESS_TOKEN;
    try {
      ACCESS_TOKEN = getMpAccessToken();
    } catch (e) {
      console.error("[MP create-preference]", e.message);
      return NextResponse.json({ error: "Configuração de pagamento indisponível" }, { status: 500 });
    }
    const isTestMode = isMpTestMode();
    if (isTestMode) console.log("[MP create-preference] 🧪 MODO TESTE ativo");

    // Create Mercado Pago preference
    const idempotencyKey = `${user.id}-${planId}-${Date.now()}`;

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        items: [
          {
            id: planId,
            title: plan.title,
            description: `Acesso VIP ao Thorspace por ${plan.days} ${plan.days === 1 ? "dia" : "dias"}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: plan.price,
            category_id: "services",
          },
        ],
        payer: {
          email: user.email,
        },
        back_urls: {
          success: `${BASE_URL}/vip/success`,
          failure: `${BASE_URL}/vip/failure`,
          pending: `${BASE_URL}/vip/pending`,
        },
        auto_return: "approved",
        notification_url: `${BASE_URL}/api/mp/webhook`,
        external_reference: `${user.id}:${planId}`,
        statement_descriptor: "THORSPACE VIP",
        payment_methods: {
          installments: 12,
        },
        metadata: {
          user_id: user.id,
          plan_id: planId,
          plan_days: plan.days,
        },
      }),
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error("[MP] Erro ao criar preferência:", mpResponse.status, errText);
      return NextResponse.json({ error: "Erro ao iniciar pagamento" }, { status: 502 });
    }

    const preference = await mpResponse.json();

    console.log(`[MP] Preferência criada: ${preference.id} para user ${user.id}, plano ${planId}`);

    return NextResponse.json({
      init_point: preference.init_point,
      preference_id: preference.id,
    });
  } catch (error) {
    console.error("[MP] create-preference exception:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
