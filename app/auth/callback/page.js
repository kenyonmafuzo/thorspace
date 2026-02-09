"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureProfileAndOnboarding } from "@/lib/ensureProfile";
import { createInboxMessage } from "@/lib/inbox";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      try {
        // Redireciona IMEDIATAMENTE para /mode
        // O processamento de dados acontece em background
        if (!cancelled) router.replace("/mode");

        // 1) Busca usuário real
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        if (!user) {
          console.warn("[Callback] Usuário não encontrado após OAuth");
          return;
        }

        // 2) Processar profile em background (não bloqueia navegação)
        const username = localStorage.getItem("thor_username") || 
                        user.user_metadata?.username || 
                        user.email?.split('@')[0] || 
                        `user_${user.id.slice(0, 8)}`;

        // Garantir profile de forma assíncrona
        ensureProfileAndOnboarding(user, { username }).catch(err => {
          console.error("[Callback] Erro ao garantir profile (background):", err);
        });

        // 3) Verificar mensagem de boas-vindas em background
        setTimeout(async () => {
          try {
            const { data: existingWelcome } = await supabase
              .from("inbox")
              .select("id")
              .eq("user_id", user.id)
              .eq("type", "welcome")
              .maybeSingle();
            
            if (!existingWelcome) {
              console.log("[Callback] Enviando mensagem de boas-vindas");
              await createInboxMessage({
                user_id: user.id,
                type: "welcome",
                content: `Bem-vindo(a) ao **Thorspace!**\n\nThorspace é um jogo de batalhas espaciais por turnos, focado em estratégia.\n\nAntes de cada partida, você escolhe 3 naves, cada uma com sua especialidade. A escolha certa depende da sua estratégia de jogo.\n\nDurante a partida, o jogo acontece em turnos:\n\nPrimeiro você escolhe qual nave vai se mover, depois define para onde ela vai e onde irá mirar.\nRepita esse processo até concluir as 3 jogadas do turno.\n\nVocê pode jogar contra o computador para treinar ou enfrentar outros jogadores no modo multiplayer.\n\nGanhe batalhas para acumular XP, subir de nível, conquistar badges e avançar no ranking.\n\nBoa sorte e boas batalhas.`,
                cta: null,
                cta_url: null,
                lang: "pt"
              });
              
              localStorage.setItem("thor_show_welcome", "1");
            }
          } catch (e) {
            console.warn("[Callback] Erro ao verificar/enviar mensagem de boas-vindas:", e);
          }
        }, 100);

      } catch (err) {
        console.error("[Callback] Erro no callback OAuth:", err);
        if (!cancelled) router.replace("/login");
      }
    }

    finish();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // UI minimalista - redireciona instantaneamente
  return null;
}
