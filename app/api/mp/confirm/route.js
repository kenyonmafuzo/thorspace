import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getMpAccessToken } from "@/lib/mpCredentials";

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

async function fetchMpPayment(paymentId) {
  const ACCESS_TOKEN = getMpAccessToken();
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MP fetch falhou (${res.status}): ${errText}`);
  }
  return res.json();
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
    profile?.is_vip &&
    profile?.vip_expires_at &&
    new Date(profile.vip_expires_at) > now
      ? new Date(profile.vip_expires_at)
      : now;

  const newExpiry = new Date(
    currentExpiry.getTime() + days * 24 * 60 * 60 * 1000
  );

  const { error } = await admin
    .from("profiles")
    .update({ is_vip: true, vip_expires_at: newExpiry.toISOString() })
    .eq("id", userId);

  if (error) throw error;

  return { vip_starts: currentExpiry.toISOString(), vip_expires: newExpiry.toISOString() };
}

async function sendInboxNotification(admin, userId, planId, vipStarts, vipExpires, paymentId) {
  // Idempotency: skip if already notified for this payment
  const { data: existing } = await admin
    .from("inbox")
    .select("id")
    .eq("user_id", userId)
    .contains("meta", { payment_id: paymentId })
    .maybeSingle();

  if (existing) {
    console.log(`[MP Confirm] Inbox já enviado para payment ${paymentId} — skip`);
    return;
  }

  const fmt = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  };

  const planLabel = PLAN_LABELS[planId] || planId;

  await admin.from("inbox").insert([
    {
      user_id: userId,
      type: "vip",
      title: "� VIP Ativado!",
      content: `Seu VIP ${planLabel} está ativo de ${fmt(vipStarts)} até ${fmt(vipExpires)}.`,
      cta: "Ver minha área VIP",
      cta_url: "/vip",
      lang: "pt",
      created_at: new Date().toISOString(),
      meta: { payment_id: paymentId, plan_id: planId },
    },
  ]);
}

// POST — chamado pelo success page com { paymentId }
export async function POST(request) {
  try {
    const body = await request.json();
    const paymentId = body?.paymentId ? String(body.paymentId) : null;

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId obrigatório" }, { status: 400 });
    }

    const payment = await fetchMpPayment(paymentId);

    if (payment.status !== "approved") {
      return NextResponse.json({
        activated: false,
        payment_status: payment.status,
      });
    }

    const ref = payment.external_reference;
    if (!ref || !ref.includes(":")) {
      throw new Error(`external_reference inválido: ${ref}`);
    }

    const [userId, planId] = ref.split(":");
    const admin = getAdminClient();
    const { vip_starts, vip_expires } = await activateVip(admin, userId, planId);

    await sendInboxNotification(admin, userId, planId, vip_starts, vip_expires, paymentId);

    const planLabel = PLAN_LABELS[planId] || planId;

    console.log(
      `[MP Confirm] ✅ VIP confirmado — user: ${userId} | plano: ${planId} | expira: ${vip_expires}`
    );

    return NextResponse.json({
      activated: true,
      plan_id: planId,
      plan_label: planLabel,
      vip_starts,
      vip_expires,
    });
  } catch (error) {
    console.error("[MP Confirm] Erro:", error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// GET — para testes manuais via browser (/api/mp/confirm?payment_id=xxx)
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const paymentId = url.searchParams.get("payment_id");

    if (!paymentId) {
      return NextResponse.json({ error: "payment_id obrigatório" }, { status: 400 });
    }

    const payment = await fetchMpPayment(paymentId);

    if (payment.status !== "approved") {
      return NextResponse.json({
        activated: false,
        payment_status: payment.status,
      });
    }

    const ref = payment.external_reference;
    if (!ref || !ref.includes(":")) {
      throw new Error(`external_reference inválido: ${ref}`);
    }

    const [userId, planId] = ref.split(":");
    const admin = getAdminClient();
    const { vip_starts, vip_expires } = await activateVip(admin, userId, planId);

    await sendInboxNotification(admin, userId, planId, vip_starts, vip_expires, paymentId);

    const planLabel = PLAN_LABELS[planId] || planId;

    return NextResponse.json({
      activated: true,
      plan_id: planId,
      plan_label: planLabel,
      vip_starts,
      vip_expires,
    });
  } catch (error) {
    console.error("[MP Confirm GET] Erro:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
