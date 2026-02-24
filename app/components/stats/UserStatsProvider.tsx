"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";

interface PlayerProgress {
  level: number;
  xp: number;
  xp_to_next: number;
  total_xp?: number | null;
  username?: string;
  avatar_preset?: string;
}

interface PlayerStats {
  matches?: number;
  matches_played?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  ships_destroyed?: number;
  ships_lost?: number;
}

interface UserStatsContextType {
  userStats: PlayerProgress | null;
  playerProgress: PlayerProgress | null;
  playerStats: PlayerStats | null;
  isLoading: boolean;
  statsVersion: number;
  lastUpdatedAt: number;
  refreshUserStats: (reason?: string) => Promise<void>;
}

export const UserStatsContext = createContext<UserStatsContextType | undefined>(undefined);

export function UserStatsProvider({ children }: { children: React.ReactNode }) {
      const pathname = usePathname();
      const [dailyLoginModalOpen, setDailyLoginModalOpen] = useState(false);
      // Importa o modal de daily login
      const DailyLoginModal = require("@/app/components/DailyLoginModal").default;
    // Sempre declarar todos os useState no topo
    const [userId, setUserId] = useState<string | null>(null);
    const [userStats, setUserStats] = useState<PlayerProgress | null>(null);
    const [playerProgress, setPlayerProgress] = useState<PlayerProgress | null>(null);
    const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [statsVersion, setStatsVersion] = useState(1);
    const [lastUpdatedAt, setLastUpdatedAt] = useState(Date.now());
    // Novo: armazena bootstrap temporário até userId estar disponível
    const [pendingBootstrap, setPendingBootstrap] = useState<any>(null);
    // Daily login streak state
    const [dailyLoginResult, setDailyLoginResult] = useState<any>(null);
    // Import i18n helper for daily login
    // @ts-ignore
    const { getDailyLoginText } = require("@/lib/i18n/dailyLogin");
    // Import Notification context
    // @ts-ignore
    const { pushToast } = require("@/app/components/notifications/NotificationProvider");
    // Import i18n hook (must be at top-level)
    // @ts-ignore
    const { useI18n } = require("@/src/hooks/useI18n");
    const { lang } = useI18n ? useI18n() : { lang: "en" };


    // Função de refresh precisa ser declarada após userId e antes de qualquer useEffect que a utilize
    const refreshUserStats = useCallback(async (reason?: string) => {
      if (!userId) return;
      setIsLoading(true);
      try {
        if (process.env.NODE_ENV !== "production") {
          // ...existing code...
        }
          const [progressRes, statsRes] = await Promise.all([
          supabase
            .from("player_progress")
            .select("level, xp, xp_to_next, total_xp")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("player_stats")
            .select("matches, matches_played, wins, losses, draws, ships_destroyed, ships_lost")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);
          // Busca profile separado para garantir username correto
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_preset")
            .eq("id", userId)
            .maybeSingle();
        if (process.env.NODE_ENV !== "production") {
          // ...existing code...
          // ...existing code...
            // ...existing code...
        }
        // Preenche defaults se data === null
        const progressData = progressRes.data ?? { level: 1, xp: 0, xp_to_next: 300, total_xp: 0 };
        const statsData = statsRes.data ?? { matches: 0, matches_played: 0, wins: 0, losses: 0, draws: 0, ships_destroyed: 0, ships_lost: 0 };
          const username = profile?.username ?? undefined;
          const avatarPreset = profile?.avatar_preset ?? undefined;
        if (typeof window !== "undefined") {
          const saved = localStorage.getItem("thor_username");
            if (username?.startsWith("user_") && saved) {
              const updatedUsername = saved;
              // Atualiza o banco para corrigir o username definitivamente
              supabase.from("profiles").update({ username: updatedUsername }).eq("username", username).eq("id", userId);
          }
        }
        const mergedStats = progressData ? {
          ...progressData,
            username: (username && !username.startsWith("user_")) ? username : undefined,
            avatar_preset: avatarPreset,
        } : null;
        setPlayerProgress(progressData ?? null);
        setUserStats(mergedStats);
        setPlayerStats(statsData ?? null);
        setStatsVersion(v => v + 1);
        setLastUpdatedAt(Date.now());
      } finally {
        setIsLoading(false);
      }
    }, [userId]);

    // Bootstrap inicial do localStorage (signup) - lê assim que possível e armazena até userId
    useEffect(() => {
        // (Removido: useEffect aninhado inválido para daily login result)
      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem("thor_bootstrap");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.ts && Date.now() - parsed.ts < 30000 && parsed.profile && parsed.playerProgress) {
            setPendingBootstrap(parsed);
          }
          localStorage.removeItem("thor_bootstrap");
        }
      } catch (e) {}
    }, []);

    // Aplica bootstrap assim que userId estiver disponível
    useEffect(() => {
      if (!userId || !pendingBootstrap) return;
      
      // Define dados imediatamente para exibir header
      const bootstrapStats = { 
        ...pendingBootstrap.playerProgress, 
        username: pendingBootstrap.profile.username, 
        avatar_preset: pendingBootstrap.profile.avatar_preset 
      };
      setUserStats(bootstrapStats);
      setPlayerProgress(pendingBootstrap.playerProgress);
      setIsLoading(false); // ✅ Marca como carregado para exibir header
      setPendingBootstrap(null);
      
      // Atualiza do banco em background para garantir consistência
      setTimeout(() => {
        refreshUserStats && refreshUserStats("bootstrap");
      }, 100); // delay reduzido
    }, [userId, pendingBootstrap, refreshUserStats]);




  // Fetch inicial automático assim que userId existir
  useEffect(() => {
    if (!userId) return;
    
    let isMounted = true;
    
    // Define timeout para evitar loading infinito
    const timeout = setTimeout(() => {
      if (isMounted && isLoading) {
        setIsLoading(false);
      }
    }, 3000); // 3 segundos max
    
    refreshUserStats("initial-load");
    
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Realtime: escuta updates em player_progress/player_stats do usuário logado
  useEffect(() => {
    if (!userId) return;
    const progressChannel = supabase
      .channel(`realtime:player_progress:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'player_progress',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (process.env.NODE_ENV !== "production") {
          // ...existing code...
        }
        refreshUserStats && refreshUserStats('realtime:player_progress');
      })
      .subscribe();

    const statsChannel = supabase
      .channel(`realtime:player_stats:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'player_stats',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (process.env.NODE_ENV !== "production") {
          // ...existing code...
        }
        refreshUserStats && refreshUserStats('realtime:player_stats');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(progressChannel);
      supabase.removeChannel(statsChannel);
    };
  }, [userId, refreshUserStats]);

  // Get current userId and claim daily XP after login
  useEffect(() => {
    let cancelled = false;

    // Listen for auth state changes (login/logout/refresh)
    // onAuthStateChange fires INITIAL_SESSION on page load/refresh — use it
    // instead of getUser() (which requires a network round-trip and can fail).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[UserStatsProvider] Auth state changed:', event, session?.user?.id);
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        // Page refresh / session restored from storage — set userId immediately
        const uid = session?.user?.id || null;
        if (!cancelled) setUserId(uid);
      } else if (event === 'SIGNED_IN') {
        const uid = session?.user?.id || null;
        if (!cancelled && uid) {
          setUserId(uid);
          // Claim daily XP only on explicit sign-in (not on page refresh)
          try {
            const { data: claimRes, error: claimErr } = await supabase.rpc('claim_daily_xp');
            const row = Array.isArray(claimRes) ? claimRes[0] : claimRes;
            if (!claimErr && row?.awarded_xp > 0) {
              setDailyLoginResult(row);
            }
          } catch (e) {
            console.warn('[DailyLogin] claim_daily_xp exception on auth change:', e);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (!cancelled) {
          setUserId(null);
          setUserStats(null);
          setPlayerProgress(null);
          setPlayerStats(null);
        }
      }
    });

    return () => { 
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Handle daily login result: refresh stats, create inbox, show popup
  useEffect(() => {
    if (!dailyLoginResult || !userId) return;
    
    // 🔒 Verificar se já processou daily XP hoje (evita duplicação)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const processKey = `thor_daily_processed_${today}`;
    if (sessionStorage.getItem(processKey)) {
      console.log('[DailyLogin] Daily XP já foi processado hoje, ignorando');
      return;
    }
    sessionStorage.setItem(processKey, 'true');
    
    // 🔒 Verificar se já mostrou popup hoje nesta sessão
    const lastShown = localStorage.getItem('thor_daily_popup_shown');
    if (lastShown === today) {
      console.log('[DailyLogin] Popup já foi mostrado hoje, ignorando');
      return;
    }
    
    // Always refresh stats after claim
    if (typeof refreshUserStats === 'function') {
      refreshUserStats("daily-login-claim");
    }
    const awardedXp = dailyLoginResult.awarded_xp;
    const streakDay = dailyLoginResult.new_streak || 1;
    const streakBroken = dailyLoginResult.streak_broken || false;
    const message = dailyLoginResult.message || '';
    
    if (awardedXp > 0) {
      // Se a streak foi quebrada, mostrar aviso especial
      if (streakBroken) {
        const content = message; // Mensagem já vem do backend
        const inboxNotif = {
          user_id: userId,
          type: "streak_broken",
          content,
          cta: "Entendi",
          cta_url: "/",
          created_at: new Date().toISOString(),
          lang,
        };
        console.log('[DailyLogin] Streak broken! Inserting inbox notification:', inboxNotif);
        supabase.from("inbox").insert([inboxNotif]).then(({ error }) => {
          if (error) {
            console.error('[DailyLogin] Streak broken inbox insert error:', error);
          } else {
            console.log('[DailyLogin] Streak broken notification inserted successfully.');
          }
        });
      }
      
      // Notificação normal de XP ganho
      const pluralDia = streakDay === 1 ? 'dia' : 'dias';
      const pluralSeguido = streakDay === 1 ? 'seguido' : 'seguidos';
      const titleKey = `streak${streakDay}_title`;
      const bodyKey = `streak${streakDay}_body`;
      const title = getDailyLoginText(titleKey, lang);
      const body = getDailyLoginText(bodyKey, lang);
      const badgeIncentive = streakDay < 7 ? `\n\n${getDailyLoginText('badge_incentive', lang)}` : '';
      const content = `${body}${badgeIncentive}`;
      const inboxNotif = {
        user_id: userId,
        type: "daily_login",
        title,
        content,
        cta: "Ver detalhes",
        cta_url: "/inbox",
        created_at: new Date().toISOString(),
        lang,
        meta: {
          cta_label: "Ver detalhes",
          action: "open_daily_login_popup",
          streakDay: streakDay,
          awardedXp: awardedXp
        }
      };
      console.log('[DailyLogin] Inserting inbox notification:', inboxNotif);
      supabase.from("inbox").insert([inboxNotif]).then(async ({ error }) => {
        if (error) {
          console.error('[DailyLogin] Inbox insert error:', error);
          const msg = String(error.message || '').toLowerCase();
          if (msg.includes('rls')) {
            console.warn('[DailyLogin] Inbox insert failed due to missing RLS policy. Verifique policies para tabela inbox.');
          }
          if (msg.includes("meta") && msg.includes("column")) {
            // Fallback: tentar sem meta
            const { meta, ...fallbackNotif } = inboxNotif;
            console.warn('[DailyLogin] Tentando inserir inbox novamente SEM meta (fallback).');
            const { error: err2 } = await supabase.from("inbox").insert([fallbackNotif]);
            if (err2) {
              console.error('[DailyLogin] Fallback inbox insert também falhou:', err2);
            } else {
              console.log('[DailyLogin] Inbox notification inserida com sucesso SEM meta.');
            }
          }
        } else {
          console.log('[DailyLogin] Inbox notification inserted successfully.');
        }
      });
      
      // ✅ Abrir modal de daily login
      // Se não estiver em /mode ainda, guardar para abrir quando chegar lá
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('thor_daily_popup_shown', today);
      
      if (pathname === '/mode') {
        setDailyLoginModalOpen(true);
        setTimeout(() => {
          window.dispatchEvent(new Event("thor_stats_updated"));
        }, 400);
      } else {
        console.log('[DailyLogin] XP claimed, aguardando navegação para /mode');
        // Salvar resultado para mostrar quando chegar em /mode
        sessionStorage.setItem('thor_pending_daily_modal', JSON.stringify({
          awarded_xp: awardedXp,
          new_streak: streakDay
        }));
      }
    }
  }, [dailyLoginResult, userId, refreshUserStats, getDailyLoginText, lang, pushToast, pathname]);
  
  // 🎯 Verificar se há modal pendente quando chega em /mode
  useEffect(() => {
    if (pathname !== '/mode') return;
    
    const pendingData = sessionStorage.getItem('thor_pending_daily_modal');
    if (pendingData) {
      try {
        const { awarded_xp, new_streak } = JSON.parse(pendingData);
        console.log('[DailyLogin] Abrindo modal pendente em /mode:', { awarded_xp, new_streak });
        
        // Limpar pendente
        sessionStorage.removeItem('thor_pending_daily_modal');
        
        // Abrir modal
        setDailyLoginResult({ awarded_xp, new_streak, streak_broken: false, message: '' });
        setDailyLoginModalOpen(true);
        
        setTimeout(() => {
          window.dispatchEvent(new Event("thor_stats_updated"));
        }, 400);
      } catch (e) {
        console.error('[DailyLogin] Erro ao processar modal pendente:', e);
        sessionStorage.removeItem('thor_pending_daily_modal');
      }
    }
  }, [pathname]);
  
  // Handler para fechar daily login modal e abrir welcome se necessário
  const handleCloseDailyLogin = useCallback(() => {
    console.log('[DailyLogin] Modal fechando...');
    setDailyLoginModalOpen(false);
    
    // Se estiver em /mode e tiver flag de welcome, disparar evento para abrir welcome modal
    if (pathname === '/mode' && typeof window !== 'undefined') {
      const showWelcome = localStorage.getItem("thor_show_welcome");
      console.log('[DailyLogin] pathname:', pathname, 'showWelcome flag:', showWelcome);
      if (showWelcome === "1") {
        // Aguardar um pouco para transição visual
        setTimeout(() => {
          console.log('[DailyLogin] Disparando evento thor_open_welcome');
          window.dispatchEvent(new CustomEvent("thor_open_welcome"));
        }, 300);
      }
    }
  }, [pathname]);

  // ...existing code...



  // ...existing code...


  // ...existing code...
  // Consolidated useEffect for realtime listeners
  useEffect(() => {
    if (!userId) return;
    const progressChannel = supabase
      .channel(`realtime:player_progress:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'player_progress',
        filter: `user_id=eq.${userId}`,
      }, () => {
        refreshUserStats && refreshUserStats('realtime:player_progress');
      })
      .subscribe();

    const statsChannel = supabase
      .channel(`realtime:player_stats:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'player_stats',
        filter: `user_id=eq.${userId}`,
      }, () => {
        refreshUserStats && refreshUserStats('realtime:player_stats');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(progressChannel);
      supabase.removeChannel(statsChannel);
    };
  }, [userId, refreshUserStats]);


  // ...existing code...


  // Listener global para garantir refreshUserStats em todo contexto
  useEffect(() => {
    async function handleStatsUpdated() {
      if (process.env.NODE_ENV !== "production") {
        // ...existing code...
      }
      await new Promise(res => setTimeout(res, 300));
      refreshUserStats && refreshUserStats("thor_stats_updated:provider");
    }
    window.addEventListener("thor_stats_updated", handleStatsUpdated);
    return () => window.removeEventListener("thor_stats_updated", handleStatsUpdated);
  }, [refreshUserStats]);

  // Initial load and on userId change
  useEffect(() => {
    if (userId) refreshUserStats("mount");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);


  // Refresh on tab focus
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        refreshUserStats("tab_visible");
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [refreshUserStats]);

  // Listener global para garantir refreshUserStats em todo contexto
  useEffect(() => {
    function handleStatsUpdated() {
      refreshUserStats && refreshUserStats("thor_stats_updated:provider");
    }
    window.addEventListener("thor_stats_updated", handleStatsUpdated);
    return () => window.removeEventListener("thor_stats_updated", handleStatsUpdated);
  }, [refreshUserStats]);

  const value: UserStatsContextType = {
    userStats,
    playerProgress,
    playerStats,
    isLoading,
    statsVersion,
    lastUpdatedAt,
    refreshUserStats,
  };

  return (
    <UserStatsContext.Provider value={value}>
      {children}
      <DailyLoginModal
        open={dailyLoginModalOpen}
        onClose={handleCloseDailyLogin}
        awardedXp={dailyLoginResult?.awarded_xp || 0}
        streakDay={dailyLoginResult?.new_streak || 1}
      />
    </UserStatsContext.Provider>
  );
}

export function useUserStats() {
  const ctx = useContext(UserStatsContext);
  if (!ctx) throw new Error("useUserStats must be used within a UserStatsProvider");
  return ctx;
}
