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
        // 1) Busca usuário real
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        // 2) Se não houver usuário, tenta de novo rapidinho (às vezes o callback demora a “assentar”)
        if (!user) {
          const { data: userData2 } = await supabase.auth.getUser();
          const user2 = userData2?.user;

          if (!user2) {
            if (!cancelled) router.replace("/login");
            return;
          }

          // Fallback: pega username do localStorage OU do user_metadata
          const username2 = localStorage.getItem("thor_username") || 
                           user2.user_metadata?.username || 
                           user2.email?.split('@')[0] || 
                           `user_${user2.id.slice(0, 8)}`;

          await ensureProfileAndOnboarding(user2, {
            username: username2,
          });

          if (!cancelled) router.replace("/mode");
          return;
        }

        // 3) Se já tem user, garante profile + onboarding e segue
        // Fallback: pega username do localStorage OU do user_metadata
        const username = localStorage.getItem("thor_username") || 
                        user.user_metadata?.username || 
                        user.email?.split('@')[0] || 
                        `user_${user.id.slice(0, 8)}`;

        await ensureProfileAndOnboarding(user, {
          username: username,
        });

        // ⏳ Aguardar propagação dos dados no banco (crítico para Vercel)
        console.log("[Callback] Aguardando propagação dos dados...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // ✅ Verificar se dados realmente existem
        let dataReady = false;
        let isNewUser = false;
        for (let i = 0; i < 5; i++) {
          const [profileCheck, statsCheck, progressCheck] = await Promise.all([
            supabase.from("profiles").select("id, created_at").eq("id", user.id).maybeSingle(),
            supabase.from("player_stats").select("user_id").eq("user_id", user.id).maybeSingle(),
            supabase.from("player_progress").select("user_id").eq("user_id", user.id).maybeSingle(),
          ]);
          
          if (profileCheck.data && statsCheck.data && progressCheck.data) {
            console.log("[Callback] ✅ Todos os dados confirmados!");
            dataReady = true;
            
            // Verifica se é novo usuário (criado nos últimos 60 segundos)
            const createdAt = new Date(profileCheck.data.created_at);
            const now = new Date();
            const diffSeconds = (now - createdAt) / 1000;
            isNewUser = diffSeconds < 60;
            
            break;
          }
          
          console.log(`[Callback] Tentativa ${i + 1}/5 - aguardando...`);
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Enviar mensagem de boas-vindas se for novo usuário
        if (isNewUser) {
          console.log("[Callback] Novo usuário detectado, enviando mensagem de boas-vindas");
          try {
            await createInboxMessage({
              user_id: user.id,
              type: "welcome",
              content: `Bem-vindo(a) ao **Thorspace!**\n\nThorspace é um jogo de batalhas espaciais por turnos, focado em estratégia.\n\nAntes de cada partida, você escolhe 3 naves, cada uma com sua especialidade. A escolha certa depende da sua estratégia de jogo.\n\nDurante a partida, o jogo acontece em turnos:\n\nPrimeiro você escolhe qual nave vai se mover, depois define para onde ela vai e onde irá mirar.\nRepita esse processo até concluir as 3 jogadas do turno.\n\nVocê pode jogar contra o computador para treinar ou enfrentar outros jogadores no modo multiplayer.\n\nGanhe batalhas para acumular XP, subir de nível, conquistar badges e avançar no ranking.\n\nBoa sorte e boas batalhas.`,
              cta: null,
              cta_url: null,
              lang: "pt"
            });
          } catch (e) {
            console.warn("[Callback] Erro ao enviar mensagem de boas-vindas:", e);
          }
        }

        if (!cancelled) router.replace("/mode");
      } catch (err) {
        console.error("Error finishing OAuth callback:", err);
        if (!cancelled) router.replace("/login");
      }
    }

    finish();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)`,
        backgroundSize: "cover, auto",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
      }}
    >
      <div
        style={{
          color: "#E6FBFF",
          backdropFilter: "blur(4px)",
          padding: 18,
          borderRadius: 8,
        }}
      >
        Finalizando login...
      </div>
    </main>
  );
}
