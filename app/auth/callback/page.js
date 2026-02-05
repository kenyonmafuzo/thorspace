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

          await ensureProfileAndOnboarding(user2, {
            username: localStorage.getItem("thor_username"),
          });

          if (!cancelled) router.replace("/mode");
          return;
        }

        // 3) Se já tem user, garante profile + onboarding e segue
        await ensureProfileAndOnboarding(user, {
          username: localStorage.getItem("thor_username"),
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
