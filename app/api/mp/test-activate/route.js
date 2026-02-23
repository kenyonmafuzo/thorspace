import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isMpTestMode } from "@/lib/mpCredentials";

const PLAN_DAYS = { "1day": 1, "7days": 7, "15days": 15, "30days": 30 };
const PLAN_LABELS = { "1day": "1 Dia", "7days": "7 Dias", "15days": "15 Dias", "30days": "30 Dias" };

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// POST — simulates a complete approved payment, only works when MP_TEST_MODE=true
export async function POST(request) {
  if (!isMpTestMode()) {
    return NextResponse.json({ error: "Disponível apenas em modo teste" }, { status: 403 });
  }

  try {
    const { userId, planId = "1day" } = await request.json();
    if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

    const days = PLAN_DAYS[planId];
    if (!days) return NextResponse.json({ error: "Plano inválido" }, { status: 400 });

    const admin = getAdminClient();

    // Activate VIP
    const { data: profile } = await admin
      .from("profiles")
      .select("is_vip, vip_expires_at")
      .eq("id", userId)
      .maybeSingle();

    const now = new Date();
    const base = profile?.is_vip && profile?.vip_expires_at && new Date(profile.vip_expires_at) > now
      ? new Date(profile.vip_expires_at) : now;
    const expires = new Date(base.getTime() + days * 86400000);

    await admin.from("profiles")
      .update({ is_vip: true, vip_expires_at: expires.toISOString() })
      .eq("id", userId);

    // Inbox notification
    const fakePaymentId = `TEST-${Date.now()}`;
    const fmt = (d) => new Date(d).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo"
    });

    await admin.from("inbox").insert([{
      user_id: userId,
      type: "vip",
      title: "💎 VIP Ativado!",
      content: `Seu VIP ${PLAN_LABELS[planId]} está ativo de ${fmt(now)} até ${fmt(expires)}.`,
      cta: "Ver minha área VIP",
      cta_url: "/vip",
      lang: "pt",
      created_at: now.toISOString(),
      meta: { payment_id: fakePaymentId, plan_id: planId, test: true },
    }]);

    return NextResponse.json({
      activated: true,
      plan_id: planId,
      plan_label: PLAN_LABELS[planId],
      vip_starts: now.toISOString(),
      vip_expires: expires.toISOString(),
      fake_payment_id: fakePaymentId,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
