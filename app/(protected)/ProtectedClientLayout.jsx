"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import UserHeader from "../components/UserHeader";
import MobileHeader from "../components/MobileHeader";
import NotificationsClientRoot from "../components/notifications/NotificationsClientRoot";
import NotificationProvider from "../components/notifications/NotificationProvider";
import OnlineNow from "../components/OnlineNow";
import { useUserStats } from "../components/stats/UserStatsProvider";
import { supabase } from "@/lib/supabase";

export default function ProtectedClientLayout({ children }) {
  const { userId, userStats, isLoading } = useUserStats();
  const router = useRouter();
  const isReady = !!(userStats && (userStats.user_id || userStats.id) && userStats.username);
  // Track whether we ever had an authenticated session in this page lifecycle
  const hadSession = useRef(false);
  // Timestamp of last wakeup — suppresses premature logout redirect during recovery
  const wakeupTs = useRef(0);

  useEffect(() => {
    if (userId) hadSession.current = true;
  }, [userId]);

  // Record wakeup timestamp so the redirect below knows to wait
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        wakeupTs.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  // Redirecionar para login se auth resolveu sem usuário
  // BUT: skip redirect for 6s after wakeup to let UserStatsProvider recover session
  useEffect(() => {
    if (!isLoading && !userId) {
      const msSinceWakeup = Date.now() - wakeupTs.current;
      if (msSinceWakeup < 6000) {
        // Just woke up — give UserStatsProvider time to restore session from localStorage
        return;
      }
      // If we previously had a valid session, it expired due to inactivity
      if (hadSession.current) {
        router.replace("/login?reason=idle");
      } else {
        router.replace("/login");
      }
    }
  }, [isLoading, userId, router]);

  // Atualiza active_session_at e valida session_token a cada 30s para detectar sessão tomada por outro browser
  useEffect(() => {
    if (!userId) return;

    const updateSession = async () => {
      await supabase.from('profiles')
        .update({ active_session_at: new Date().toISOString() })
        .eq('id', userId);
    };

    const checkSessionToken = async () => {
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('thor_session_token') : null;
      if (!localToken) return; // sessão sem token (login antigo) — não verifica
      const { data } = await supabase.from('profiles').select('session_token').eq('id', userId).single();
      if (data && data.session_token && data.session_token !== localToken) {
        // Outro browser tomou conta — deslogar
        localStorage.removeItem('thor_session_token');
        await supabase.auth.signOut();
        router.replace('/login?reason=kicked');
      }
    };

    updateSession();
    checkSessionToken();
    const updateInterval = setInterval(updateSession, 2 * 60 * 1000);
    const checkInterval = setInterval(checkSessionToken, 30 * 1000);
    return () => {
      clearInterval(updateInterval);
      clearInterval(checkInterval);
    };
  }, [userId, router]);

  // Tela preta apenas enquanto userId não foi confirmado (autenticação pendente).
  // isLoading=true apenas significa que os dados do DB ainda estão chegando —
  // o usuário JÁ está autenticado (userId vem do localStorage via getSession em ~10ms).
  // Cada componente (UserHeader, etc.) lida com seu próprio esqueleto de carregamento.
  // Exception: wakeup (within 6s) também passa.
  const msSinceWakeup = Date.now() - wakeupTs.current;
  const isWakingUp = msSinceWakeup < 6000 && hadSession.current;
  if (!userId && !isWakingUp) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        background: "#000010",
        zIndex: 9999,
      }} />
    );
  }

  return (
    <NotificationProvider>
      <NotificationsClientRoot>
        {/* Mantém presença global invisível para amigos */}
        {isReady && (
          <OnlineNow
            currentUserId={userStats.user_id}
            currentUsername={userStats.username}
            currentAvatar={userStats.avatar_preset}
          />
        )}
        {/* Desktop header */}
        <UserHeader />
        {/* Mobile header — only visible on ≤768px via CSS */}
        <MobileHeader />
        <main className="mobile-page-content">{children}</main>
      </NotificationsClientRoot>
    </NotificationProvider>
  );
}
