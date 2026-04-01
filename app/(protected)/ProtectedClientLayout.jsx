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

  useEffect(() => {
    if (userId) hadSession.current = true;
  }, [userId]);

  // Redirecionar para login se auth resolveu sem usuário
  useEffect(() => {
    if (!isLoading && !userId) {
      // If we previously had a valid session, it expired due to inactivity
      if (hadSession.current) {
        router.replace("/login?reason=idle");
      } else {
        router.replace("/login");
      }
    }
  }, [isLoading, userId, router]);

  // Atualiza active_session_at a cada 2 minutos para manter sessão ativa no DB
  useEffect(() => {
    if (!userId) return;
    const updateSession = () => {
      supabase.from('profiles').update({ active_session_at: new Date().toISOString() }).eq('id', userId);
    };
    updateSession(); // atualiza imediatamente ao entrar
    const interval = setInterval(updateSession, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  // Enquanto carrega ou sem usuário: tela preta (sem flash de conteúdo)
  if (isLoading || !userId) {
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
