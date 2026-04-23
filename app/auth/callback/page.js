"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureProfileAndOnboarding } from "@/lib/ensureProfile";

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

        // 3) Sinalizar para o modal de boas-vindas (controlado pelo admin_news)
        setTimeout(() => {
          localStorage.setItem("thor_show_welcome", "1");
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
