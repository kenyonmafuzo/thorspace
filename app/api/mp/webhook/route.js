import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const PLAN_DAYS = {
  "1day":   1,
  "7days":  7,
  "15days": 15,
  "30days": 30,
};

// Admin Supabase client — bypasses RLS
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin config ausente");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchMpPayment(paymentId) {
  const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { "Authorization": `Bearer ${ACCESS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MP payment fetch failed (${res.status}): ${errText}`);
  }
  return res.json();
}

async function activateVip(userId, planId) {
  const days = PLAN_DAYS[planId];
  if (!days) throw new Error(`Plano desconhecido: ${planId}`);

  const admin = getAdminClient();

  // Get current VIP expiry — if VIP still active, extend from current expiry
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
    .update({
      is_vip: true,
      vip_expires_at: newExpiry.toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;

  console.log(
    `[MP Webhook] ✅ VIP ativado — user: ${userId} | plano: ${planId} | expira: ${newExpiry.toISOString()}`
  );
}

async function processPaymentId(paymentId) {
  console.log(`[MP Webhook] Processando payment_id: ${paymentId}`);

  const payment = await fetchMpPayment(paymentId);

  console.log(`[MP Webhook] Status do pagamento: ${payment.status}`);

  if (payment.status !== "approved") {
    return { status: "not_approved", payment_status: payment.status };
  }

  const ref = payment.external_reference;
  if (!ref || !ref.includes(":")) {
    throw new Error(`external_reference inválido: ${ref}`);
  }

  const [userId, planId] = ref.split(":");
  await activateVip(userId, planId);

  return { status: "ok", activated: true, user_id: userId, plan: planId };
}

// POST — formato moderno de webhooks do MP
export async function POST(request) {
  try {
    let paymentId = null;

    // Tentar pegar do body (novo formato: { type: "payment", data: { id: "xxx" } })
    try {
      const body = await request.json();
      if (body?.type === "payment" && body?.data?.id) {
        paymentId = String(body.data.id);
      }
    } catch (e) {
      // body vazio ou não-JSON — OK
    }

    // Fallback: IPN antigo via query param (?topic=payment&id=xxx)
    if (!paymentId) {
      const url = new URL(request.url);
      const topic = url.searchParams.get("topic");
      const id = url.searchParams.get("id");
      if (topic === "payment" && id) {
        paymentId = id;
      }
      // Também pode vir como ?type=payment&data.id=xxx (IPN v2)
      if (!paymentId && url.searchParams.get("type") === "payment") {
        const dataId = url.searchParams.get("data.id");
        if (dataId) paymentId = dataId;
      }
    }

    if (!paymentId) {
      // merchant_order ou outro tipo — apenas confirmar recebimento
      return NextResponse.json({ status: "ignored" });
    }

    const result = await processPaymentId(paymentId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[MP Webhook] Erro:", error.message);
    // Retornar 200 para o MP não reenviar indefinidamente
    return NextResponse.json({ status: "error", message: error.message }, { status: 200 });
  }
}

// GET — IPN legado do MP (/?topic=payment&id=xxx)
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const topic = url.searchParams.get("topic");
    const id = url.searchParams.get("id");

    if (topic === "payment" && id) {
      const result = await processPaymentId(id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[MP Webhook GET] Erro:", error.message);
    return NextResponse.json({ status: "error", message: error.message }, { status: 200 });
  }
}
