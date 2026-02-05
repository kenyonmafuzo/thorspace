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
