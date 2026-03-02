import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Cron job: detecta VIPs expirados, envia notificação no inbox e desativa is_vip.
 *
 * Chamado automaticamente pelo Vercel Cron (vercel.json) a cada hora.
 * Também pode ser chamado manualmente:
 *   GET /api/cron/vip-expiry
 *   Authorization: Bearer <CRON_SECRET>
 */

const PLAN_LABELS = {
  "1day":   { pt: "1 Dia",    en: "1 Day",    es: "1 Día"    },
  "7days":  { pt: "7 Dias",   en: "7 Days",   es: "7 Días"   },
  "15days": { pt: "15 Dias",  en: "15 Days",  es: "15 Días"  },
  "30days": { pt: "30 Dias",  en: "30 Days",  es: "30 Días"  },
};

const MESSAGES = {
  pt: {
    title:   (label) => `Seu pacote VIP ${label} chegou ao fim.`,
    content: `Durante esse período você teve acesso a benefícios exclusivos, bônus especiais e vantagens estratégicas no campo de batalha.\n\n⚠️ Sua conta voltou ao modo padrão.\n\nNão deixe suas vantagens escaparem.\n\n🔥 Renove agora e continue dominando o universo.`,
    cta:     "Renovar VIP",
  },
  en: {
    title:   (label) => `Your VIP ${label} package has ended.`,
    content: `During this period you had access to exclusive benefits, special bonuses and strategic advantages on the battlefield.\n\n⚠️ Your account is back to standard mode.\n\nDon't let your advantages slip away.\n\n🔥 Renew now and keep dominating the universe.`,
    cta:     "Renew VIP",
  },
  es: {
    title:   (label) => `Tu paquete VIP ${label} ha llegado a su fin.`,
    content: `Durante este período tuviste acceso a beneficios exclusivos, bonos especiales y ventajas estratégicas en el campo de batalla.\n\n⚠️ Tu cuenta volvió al modo estándar.\n\nNo dejes que tus ventajas se escapen.\n\n🔥 Renueva ahora y sigue dominando el universo.`,
    cta:     "Renovar VIP",
  },
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin config ausente");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request) {
  // Segurança: verificar CRON_SECRET (definido no painel Vercel + vercel.json)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();

  // Buscar todos os perfis com VIP expirado (+ settings para saber o idioma)
  const { data: expiredUsers, error } = await admin
    .from("profiles")
    .select("id, vip_plan, settings")
    .eq("is_vip", true)
    .lt("vip_expires_at", new Date().toISOString());

  if (error) {
    console.error("[VIP Cron] Erro ao buscar VIPs expirados:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expiredUsers || expiredUsers.length === 0) {
    console.log("[VIP Cron] Nenhum VIP expirado encontrado.");
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  let skipped = 0;

  for (const user of expiredUsers) {
    try {
      // Idempotência: não enviar notificação duas vezes para o mesmo vencimento
      const { data: existing } = await admin
        .from("inbox")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "vip_expired")
        .maybeSingle();

      if (!existing) {
        const planId = user.vip_plan || "1day";

        // Determinar idioma do usuário a partir de profiles.settings (ui.language)
        let userLang = "pt";
        try {
          const settingsObj = typeof user.settings === "string"
            ? JSON.parse(user.settings)
            : user.settings;
          const detected = settingsObj?.ui?.language;
          if (detected && MESSAGES[detected]) userLang = detected;
        } catch (_) {}

        const msg = MESSAGES[userLang];
        const planLabels = PLAN_LABELS[planId] || PLAN_LABELS["1day"];
        const planLabel = planLabels[userLang] || planLabels.pt;

        await admin.from("inbox").insert([{
          user_id: user.id,
          type: "vip_expired",
          title: msg.title(planLabel),
          content: msg.content,
          cta: msg.cta,
          cta_url: "/vip",
          lang: userLang,
          created_at: new Date().toISOString(),
        }]);

        console.log(`[VIP Cron] 📨 Notificação enviada → user: ${user.id} | plano: ${planId} | lang: ${userLang}`);
      } else {
        skipped++;
      }

      // Desativar VIP
      await admin
        .from("profiles")
        .update({ is_vip: false })
        .eq("id", user.id);

      processed++;
    } catch (err) {
      console.error(`[VIP Cron] Erro ao processar user ${user.id}:`, err.message);
    }
  }

  console.log(`[VIP Cron] ✅ Processados: ${processed} | Notificações puladas (já enviadas): ${skipped}`);
  return NextResponse.json({ processed, skipped });
}
