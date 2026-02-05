"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureProfileAndOnboarding } from "@/lib/ensureProfile";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function finish() {
      // Busca usuário real
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      // Se não houver usuário, redireciona para login
      if (!user) {
        router.replace("/login");
        try {
          const { data: userData } = await supabase.auth.getUser();
          const user = userData?.user;
          if (user) {
            await ensureProfileAndOnboarding(user, { username: localStorage.getItem("thor_username") });
            router.replace("/mode");
          } else {
            router.replace("/login");
          }
        } catch (err) {
          console.error("Error finishing OAuth callback:", err);
          router.replace("/login");
        }
      }

  return (
    <main style={{ minHeight: "100dvh", padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: `url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)`, backgroundSize: 'cover, auto', backgroundRepeat: 'no-repeat', backgroundPosition: 'center center' }}>
      <div style={{ color: '#E6FBFF', backdropFilter: 'blur(4px)', padding: 18, borderRadius: 8 }}>Finalizando login...</div>
    </main>
  );
}
