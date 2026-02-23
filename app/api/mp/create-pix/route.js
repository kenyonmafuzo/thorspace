import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getMpAccessToken } from "@/lib/mpCredentials";

const PLANS = {
  "1day":   { days: 1,  price: 4.90,  title: "THORSPACE VIP — 1 Dia" },
  "7days":  { days: 7,  price: 14.90, title: "THORSPACE VIP — 7 Dias" },
  "15days": { days: 15, price: 24.90, title: "THORSPACE VIP — 15 Dias" },
  "30days": { days: 30, price: 39.90, title: "THORSPACE VIP — 30 Dias" },
};

export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

    const { planId } = await request.json();
    const plan = PLANS[planId];
    if (!plan) return NextResponse.json({ error: "Plano inválido" }, { status: 400 });

    let ACCESS_TOKEN;
    try {
      ACCESS_TOKEN = getMpAccessToken();
    } catch (e) {
      return NextResponse.json({ error: "Configuração de pagamento indisponível" }, { status: 500 });
    }

    const WEBHOOK_URL = process.env.NEXT_PUBLIC_PROD_URL || "https://thorspace.vercel.app";

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "X-Idempotency-Key": `pix-${user.id}-${planId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: plan.price,
        description: plan.title,
        payment_method_id: "pix",
        payer: {
          email: user.email,
        },
        external_reference: `${user.id}:${planId}`,
        notification_url: `${WEBHOOK_URL}/api/mp/webhook`,
        metadata: {
          user_id: user.id,
          plan_id: planId,
        },
      }),
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error("[MP create-pix] Erro:", mpResponse.status, errText);
      return NextResponse.json({ error: "Erro ao criar pagamento PIX" }, { status: 502 });
    }

    const payment = await mpResponse.json();
    const pixData = payment.point_of_interaction?.transaction_data;

    if (!pixData?.qr_code) {
      console.error("[MP create-pix] Resposta sem qr_code:", JSON.stringify(payment));
      return NextResponse.json({ error: "PIX não disponível no momento" }, { status: 502 });
    }

    console.log(`[MP create-pix] PIX criado: ${payment.id} para user ${user.id}, plano ${planId}`);

    return NextResponse.json({
      payment_id: payment.id,
      qr_code: pixData.qr_code,
      qr_code_base64: pixData.qr_code_base64,
      amount: plan.price,
      plan_title: plan.title,
      expires_at: payment.date_of_expiration,
    });
  } catch (err) {
    console.error("[MP create-pix] exception:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
