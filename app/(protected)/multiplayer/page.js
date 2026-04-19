"use client";

import { useEffect, useState, useRef } from "react";
import { useUserStats } from "@/app/components/stats/UserStatsProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/src/hooks/useI18n";
import OnlineNow from "@/app/components/OnlineNow";
import GlobalChat from "@/app/components/GlobalChat";
import InvitePopup from "@/app/components/InvitePopup";
import SocialLinksMini from "@/app/components/SocialLinksMini";
import PlayerProfileModal from "@/app/components/PlayerProfileModal";
import { checkBadgesAfterMultiplayerWin, checkAllBadgesForUser } from "@/lib/badgesIntegration";

export default function MultiplayerPage() {
    const { userStats, isLoading: statsLoading, userId: contextUserId } = useUserStats();
  const router = useRouter();
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [declinedBy, setDeclinedBy] = useState(null); // username que recusou o convite
  const pendingMatchChannelRef = useRef(null); // canal dedicado ao match pendente atual
  const [mobileTab, setMobileTab] = useState('online'); // 'online' | 'chat'
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const handleCloseProfile = () => {
  setIsProfileOpen(false);
  setSelectedPlayer(null);
};

  // Fast-path: assim que userId chega do contexto, libera a auth gate sem esperar rede
  useEffect(() => {
    if (contextUserId && !authChecked) {
      setCurrentUser((prev) => prev ?? { id: contextUserId });
      setAuthChecked(true);
    }
  }, [contextUserId, authChecked]);

  // Profile fast-path: always sync userStats → profile when profile is null.
  // This covers two cases:
  //   1. User navigates to /multiplayer and userStats is already loaded → instant profile, no fetch needed.
  //   2. Safety timeout fired before profile fetch finished → profile was null.
  //      When userStats recovers (thor_wakeup_ready), this effect fills it in immediately.
  useEffect(() => {
    if (!userStats?.username) return;
    if (profile) return; // already populated, don't overwrite
    console.log('[MP_STATE] loading end reason=userStats_context');
    setProfile({ username: userStats.username, avatar_preset: userStats.avatar_preset });
    setLoading(false);
  }, [userStats?.username, userStats?.avatar_preset]); // eslint-disable-line react-hooks/exhaustive-deps


  // Adicionar animação CSS
  useEffect(() => {
    let mounted = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
                
    // --- match_result localStorage handling ---
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("match_result");
      if (raw) {
        try {
          const result = JSON.parse(raw);
          setMatchResult(result);
          (async () => {
            try {
              // ✅ Apenas VENCEDOR envia mensagem (ou em empate, qualquer um)
              // Isso evita mensagens duplicadas no chat
              const shouldSendMessage = result.result === "VICTORY" || result.result === "DRAW";
              
              if (!shouldSendMessage) {
                console.log("[Multiplayer] Derrota - não enviar mensagem (vencedor enviará)");
                return;
              }
              
              const { data: sessionData } = await supabase.auth.getSession();
              const user = sessionData?.session?.user;
              if (user) {
                const { data: profileData } = await supabase
                  .from("profiles")
                  .select("username, language")
                  .eq("id", user.id)
                  .single();
                const username = profileData?.username || localStorage.getItem("thor_username") || "Player";
                const language = profileData?.language || localStorage.getItem("thor_language") || "en";
                
                // Formato: "jana 0x3 lenah (+30 XP)" - SEM texto de resultado
                const scoreText = `${result.myKills}x${result.oppKills}`;
                const xpGained = result.xpGained || 0;
                
                const { error: insertError } = await supabase
                  .from("chat_messages")
                  .insert({
                    user_id: user.id,
                    username: username,
                    type: "system",
                    message: `${username} ${scoreText} ${result.opponentName} (+${xpGained} XP)`,
                    avatar: null,
                    meta: {
                      match_result: result.result,
                      score: scoreText,
                      opponent: result.opponentName,
                      xp_gained: xpGained
                    }
                  });
                if (insertError) {
                  console.error("Error inserting match result:", insertError);
                } else {
                  // ✅ Notifica o GlobalChat para re-buscar mensagens (evita race condition
                  // onde o insert termina depois do fetch inicial do chat)
                  window.dispatchEvent(new CustomEvent("refresh_chat"));
                }

                // ✅ VERIFICAR BADGES APÓS VITÓRIA (apenas se ganhou)
                if (result.result === "VICTORY") {
                  console.log("[BADGES] Verificando badges após vitória...");
                  const winStreak = result.winStreak || 1;
                  const usedDiverseShips = result.usedDiverseShips || false;
                  const wasComeback = result.wasComeback || false;
                  
                  try {
                    const newBadges = await checkBadgesAfterMultiplayerWin(
                      user.id,
                      winStreak,
                      usedDiverseShips,
                      wasComeback
                    );
                    if (newBadges.length > 0) {
                      console.log(`[BADGES] ✅ ${newBadges.length} nova(s) badge(s) desbloqueada(s)!`, newBadges);
                    }
                  } catch (badgeError) {
                    console.error("[BADGES] Erro ao verificar badges:", badgeError);
                  }
                }
              }
            } catch (e) {
              console.error("Error sending match result:", e);
            }
          })();
        } catch (e) {
          console.error("Error parsing match_result:", e);
        }
        localStorage.removeItem("match_result");
      }
    }

    // Safety timeout — last resort only. Must be longer than the entire
    // profile fetch cycle (first try 5s + 1.5s wait + retry 8s = ~14.5s).
    // If it fires, the userStats fast-path effect above will fill in profile
    // as soon as UserStatsProvider has data, so the user won't be stuck.
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn("[MP_STATE] loading end reason=safety_timeout (last resort)");
        setLoading(false);
      }
    }, 20000);

    let acceptedChannel = null;
    let invitesChannel = null;

    (async () => {
      try {
        // Fast-path: se userId já veio do contexto, não precisa de getSession (rede)
        let user = null;
        if (contextUserId) {
          user = { id: contextUserId };
          if (mounted) {
            setCurrentUser(user);
            setAuthChecked(true);
          }
        } else {
        // Auth: avoid getUser() (network + AbortError risk). getSession() reads
        // localStorage only. If session is null here, user is truly not logged in.
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("getSession error:", error);
        const session = data?.session ?? null;
        const sessionUser = session?.user ?? null;
        if (!sessionUser) {
          console.warn("[Multiplayer] Sem usuário autenticado");
          if (mounted) { setLoading(false); clearTimeout(safetyTimeout); }
          router.replace("/login");
          return;
        }
        user = sessionUser;
        if (mounted) {
          console.log("[Multiplayer] Usuário autenticado:", user.id);
          setCurrentUser(user);
          setAuthChecked(true);
        }
        }

        if (!mounted) return;

        // Profile fetch — resilient to AbortError and slow wakeup connections.
        // Two-stage: 5s first try → 1.5s pause → 8s retry → localStorage fallback.
        // The safetyTimeout (20s) is always longer than this cycle (~14.5s).
        let profileData = null;

        const doProfileFetch = async (timeoutMs) => {
          const { data, error } = await Promise.race([
            supabase.from("profiles").select("username, avatar_preset").eq("id", user.id).maybeSingle(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Profile query timeout")), timeoutMs)),
          ]);
          // AbortError can come through as response.error (not thrown) — normalise to throw
          if (error?.name === "AbortError" || error?.message?.includes("aborted")) throw error;
          return data ?? null;
        };

        try {
          console.log("[MP_FETCH] profile start");
          profileData = await doProfileFetch(5000);
          if (profileData) {
            console.log("[MP_FETCH] profile success");
          } else {
            console.log("[MP_FETCH] profile returned null — will use fallback");
          }
        } catch (err) {
          const isAbort = err?.name === "AbortError" || err?.message?.includes("aborted");
          const isTimeout = err?.message === "Profile query timeout";
          if (isAbort || isTimeout) {
            console.log(`[MP_FETCH] profile ${isAbort ? 'aborted' : 'timeout'} — retrying in 1.5s`);
            await new Promise(res => setTimeout(res, 1500));
            if (!mounted) return;
            try {
              console.log("[MP_FETCH] profile retrying");
              profileData = await doProfileFetch(8000);
              console.log(`[MP_FETCH] profile retry ${profileData ? 'success' : 'returned null'}`);
            } catch (retryErr) {
              console.warn("[MP_FETCH] profile gave up", retryErr?.message);
            }
          } else {
            console.warn("[MP_FETCH] profile error", err?.message);
          }
        }

        if (!mounted) return;

        // Fallback to localStorage if both attempts returned null
        if (!profileData) {
          const fallbackUsername = localStorage.getItem("thor_username") ||
                                  user.email?.split('@')[0] ||
                                  "Player";
          profileData = { username: fallbackUsername, avatar_preset: "normal" };
          console.log("[MP_FETCH] profile fallback to localStorage:", fallbackUsername);

          // Create profile in background — don't block UI
          supabase
            .from("profiles")
            .insert({ id: user.id, username: fallbackUsername, avatar_preset: "normal", created_at: new Date().toISOString() })
            .then(({ error }) => {
              if (error) console.error("[Multiplayer] Erro ao criar profile:", error);
            });
        }

        setProfile(profileData);
        console.log("[MP_STATE] loading end reason=profile_loaded");
        if (mounted) {
          setLoading(false);
          clearTimeout(safetyTimeout);
        }

        // ✅ VERIFICAR BADGES RETROATIVAS PARA CONTAS EXISTENTES (em background)
        console.log("[BADGES] Verificando badges retroativas no login...");
        try {
          const retroactiveBadges = await checkAllBadgesForUser(user.id);
          if (retroactiveBadges.length > 0) {
            console.log(`[BADGES] 🎉 ${retroactiveBadges.length} badge(s) retroativa(s) desbloqueada(s)!`, retroactiveBadges);
          }
        } catch (badgeError) {
          console.error("[BADGES] Erro ao verificar badges retroativas:", badgeError);
        }

        // ✅ AAA PATTERN: Subscription APENAS para sync de dados
        // Lógica de navegação é responsabilidade da UI, não do DB
        acceptedChannel = supabase
          .channel(`match-accepted:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "matches",
              filter: `invite_from=eq.${user.id}`,
            },
            async (payload) => {
              // 🔍 LOGS: Debug completo do evento
              console.log("[MATCH SYNC] Match UPDATE recebido:", {
                matchId: payload.new?.id,
                state: payload.new?.state,
                phase: payload.new?.phase,
                timestamp: new Date().toISOString()
              });
              
              // ✅ VALIDAÇÃO ROBUSTA: Prevenir race conditions e estados inválidos
              const isAccepted = payload.new?.state === "accepted";
              const isCancelled = payload.new?.state === "cancelled";
              const isFinished = payload.new?.phase === "finished";
              const isPending = payload.new?.phase === "pending" || !payload.new?.phase;
              const isMultiplayer = payload.new?.mode === "multiplayer";

              // ✅ DECLINE: Oponente recusou o convite
              if (isCancelled && isMultiplayer) {
                console.log("[MATCH SYNC] ❌ Match recusado pelo oponente");
                // Fechar o popup de "aguardando" se estiver aberto
                if (typeof window !== "undefined" && window.__invitePopup) {
                  window.__invitePopup.clearInvite?.();
                }
                // Buscar username de quem recusou
                try {
                  const { data: declinerProfile } = await supabase
                    .from("profiles")
                    .select("username")
                    .eq("id", payload.new.invite_to)
                    .single();
                  setDeclinedBy(declinerProfile?.username || "Oponente");
                } catch {
                  setDeclinedBy("Oponente");
                }
                return;
              }

              // ⛔ GUARDS: Não redirecionar se match já terminou
              if (isFinished) {
                console.log("[MATCH SYNC] ⏭️ Match já finalizado, ignorando redirecionamento");
                return;
              }
              
              // ⛔ GUARD: Só processar matches multiplayer aceitos
              if (!isAccepted || !isMultiplayer) {
                console.log("[MATCH SYNC] ⏭️ Match não está em estado válido para iniciar");
                return;
              }
              
              // ⛔ GUARD: Prevenir redirecionamento duplicado
              const lastProcessedMatch = sessionStorage.getItem('last_redirected_match');
              if (lastProcessedMatch === payload.new.id) {
                console.log("[MATCH SYNC] ⏭️ Match já foi processado, ignorando duplicata");
                return;
              }
              
              // ✅ PROCESSAMENTO: Buscar dados do oponente
              try {
                const { data: opponentProfile } = await supabase
                  .from("profiles")
                  .select("username")
                  .eq("id", payload.new.invite_to)
                  .single();

                // 💾 Salvar contexto do match (necessário para /game)
                localStorage.setItem("thor_match_id", payload.new.id);
                localStorage.setItem("thor_match_opponent_name", opponentProfile?.username || "Opponent");
                localStorage.setItem("thor_match_opponent_id", payload.new.invite_to);
                localStorage.setItem("thor_match_source", "multiplayer");
                localStorage.setItem("thor_selected_mode", "multiplayer");
                
                // 🚫 Prevenir processamento duplicado
                sessionStorage.setItem('last_redirected_match', payload.new.id);

                console.log("[MATCH SYNC] ✅ Navegando para /game com matchId:", payload.new.id);
                
                // 🎮 Signal OnlineNow to flip our status to "playing" before we leave presence
                window.dispatchEvent(new CustomEvent('thor:going_to_game'));
                // Brief pause so the presence UPDATE reaches other clients before the LEAVE
                await new Promise(r => setTimeout(r, 350));

                // 🎮 NAVEGAÇÃO: Redirecionar para tela de jogo
                router.push(`/game?mode=multiplayer&matchId=${payload.new.id}`);
              } catch (error) {
                console.error("[MATCH SYNC] ❌ Erro ao processar match aceito:", error);
              }
            }
          )
          .subscribe();

        // Subscribe para convites recebidos
        invitesChannel = supabase
          .channel(`match-invites:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "matches",
              filter: `invite_to=eq.${user.id}`,
            },
            async (payload) => {
              if (payload.new?.mode === "multiplayer" && payload.new?.state === "pending") {
                console.log("Received new match invite:", payload.new);
                // Buscar username do desafiante
                const { data: fromProfile } = await supabase
                  .from("profiles")
                  .select("username")
                  .eq("id", payload.new.invite_from)
                  .single();
                
                if (typeof window !== "undefined" && window.__invitePopup) {
                  window.__invitePopup.receiveInvite({
                    matchId: payload.new.id,
                    fromUserId: payload.new.invite_from,
                    fromUsername: fromProfile?.username || "Opponent",
                  });
                }
              }
            }
          )
          .subscribe();

      } catch (err) {
        console.error("Error loading user:", err);
        if (mounted) setLoading(false);
      } finally {
        clearTimeout(safetyTimeout);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      if (acceptedChannel) supabase.removeChannel(acceptedChannel);
      if (invitesChannel) supabase.removeChannel(invitesChannel);
    };
  }, [router]);

  // Inscreve em um match específico para detectar aceite ou recusa — canal dedicado por partida
  const subscribeToPendingMatch = (matchId, opponentUsername) => {
    // Limpar canal anterior se existir
    if (pendingMatchChannelRef.current) {
      supabase.removeChannel(pendingMatchChannelRef.current);
      pendingMatchChannelRef.current = null;
    }

    const ch = supabase
      .channel(`pending-match:${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        async (payload) => {
          const newState = payload.new?.state;

          if (newState === "cancelled") {
            console.log("[MATCH SYNC] ❌ Match recusado:", matchId);
            // Fechar popup de 'aguardando'
            if (typeof window !== "undefined" && window.__invitePopup) {
              window.__invitePopup.clearInvite?.();
            }
            // Cleanup canal
            supabase.removeChannel(ch);
            pendingMatchChannelRef.current = null;
            // Mostrar modal de recusa
            setDeclinedBy(opponentUsername || "Oponente");
          } else if (newState === "accepted") {
            // Aceite é tratado pelo acceptedChannel principal; apenas limpamos o canal aqui
            supabase.removeChannel(ch);
            pendingMatchChannelRef.current = null;
          }
        }
      )
      .subscribe();

    pendingMatchChannelRef.current = ch;
  };

  const handleChallenge = async (targetUserId, targetUsername, options = {}) => {
    if (!currentUser) return;

    // Se for fake invite, simular recebimento (apenas se NEXT_PUBLIC_FAKE_PLAYERS=1)
    const allowFake = process.env.NEXT_PUBLIC_FAKE_PLAYERS === "1";
    if (options.fake && allowFake) {
      if (typeof window !== "undefined" && window.__invitePopup) {
        window.__invitePopup.receiveFakeInvite(targetUserId, targetUsername);
      }
      return;
    }

    try {
      // Buscar match pending entre os dois usuários (bidirecional)
      const { data: pendingMatches, error: pendingError } = await supabase
        .from("matches")
        .select("id, invite_from, invite_to")
        .eq("mode", "multiplayer")
        .eq("state", "pending")
        .or(`and(invite_from.eq.${currentUser.id},invite_to.eq.${targetUserId}),and(invite_from.eq.${targetUserId},invite_to.eq.${currentUser.id})`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (pendingError) {
        console.error("pending match error:", pendingError);
      }

      const pendingMatch = pendingMatches && pendingMatches.length > 0 ? pendingMatches[0] : null;

      if (pendingMatch) {
        // Se eu sou o invite_to, mostrar popup para aceitar/recusar
        if (pendingMatch.invite_to === currentUser.id) {
          if (typeof window !== "undefined" && window.__invitePopup) {
            window.__invitePopup.showPendingInvite({
              matchId: pendingMatch.id,
              otherUserId: targetUserId,
              otherUsername: targetUsername,
              direction: "received",
            });
          }
          return;
        }
        
        // Se eu sou o invite_from, mostrar popup de pending com opção de cancelar
        if (pendingMatch.invite_from === currentUser.id) {
          if (typeof window !== "undefined" && window.__invitePopup) {
            window.__invitePopup.showPendingInvite({
              matchId: pendingMatch.id,
              otherUserId: targetUserId,
              otherUsername: targetUsername,
              direction: "sent",
            });
          }
          return;
        }
      }

      // Criar match no banco
      const { data: newMatch, error: matchError } = await supabase
        .from("matches")
        .insert({
          mode: "multiplayer",
          state: "pending",
          invite_from: currentUser.id,
          invite_to: targetUserId,
          player1_id: currentUser.id,
          player2_id: targetUserId,
          player1: currentUser.id,
          player2: targetUserId,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (matchError) {
        console.error("Error creating match:", {
          message: matchError.message,
          details: matchError.details,
          hint: matchError.hint,
          code: matchError.code,
          status: matchError.status,
          name: matchError.name,
        });
        try {
          console.error("Error creating match JSON:", JSON.stringify(matchError, Object.getOwnPropertyNames(matchError)));
        } catch (e) {
          console.error("Error stringifying matchError", e);
        }
        console.error("Match payload:", {
          invite_from: currentUser.id,
          invite_to: targetUserId,
          player1: currentUser.id,
          player2: targetUserId,
        });
        if (typeof window !== "undefined" && window.__invitePopup) {
          window.__invitePopup.showInfo(t('multiplayer.failedToSend'));
        }
        return;
      }

      console.log("Match created:", newMatch.id);
      // Assinar ao match específico para detectar recusa em tempo real
      subscribeToPendingMatch(newMatch.id, targetUsername);
      if (typeof window !== "undefined" && window.__invitePopup) {
        window.__invitePopup.showSent(`${t('multiplayer.challengeSentTo')} ${targetUsername}!`);
      }
    } catch (err) {
      console.error("Exception creating challenge:", err);
      if (typeof window !== "undefined" && window.__invitePopup) {
        window.__invitePopup.showInfo(t('multiplayer.failedToSend'));
      }
    }
  };

  if (loading) {
    return (
      <div style={pageContainerStyle}>
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>{t('multiplayer.loading')}</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={pageContainerStyle}>
        <div style={{ textAlign: "center", padding: 40, color: "#FFB3B3" }}>
          {t('multiplayer.notAuthenticated')}
        </div>
      </div>
    );
  }

  // Não renderiza até verificar autenticação
  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000016',
        color: '#E6FBFF'
      }}>
        <div style={{ opacity: 0.7, fontSize: 14 }}>Carregando...</div>
      </div>
    );
  }

  return (
    <div style={isMobile ? mobilePageContainerStyle : pageContainerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
      
      <div style={isMobile ? topRowStyle : { ...topRowStyle, paddingTop: 32, paddingBottom: 20 }}>
        <Link href="/mode" style={backButtonStyle}>
          ← {t('multiplayer.back')}
        </Link>
        <h2 style={titleStyle}>{t('multiplayer.title')} Hub</h2>
      </div>

      {/* ── Mobile tab bar ── */}
      {isMobile && (
        <div style={mobileTabBarStyle}>
          {['online', 'chat'].map(tab => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              style={{
                ...mobileTabButtonStyle,
                borderBottom: mobileTab === tab ? '2px solid #00E5FF' : '2px solid transparent',
                color: mobileTab === tab ? '#00E5FF' : 'rgba(255,255,255,0.45)',
                fontWeight: mobileTab === tab ? 700 : 400,
                paddingLeft: tab === 'online' ? 16 : 0,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {tab === 'online'
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                }
                {tab === 'online' ? 'Online' : 'Chat'}
              </span>
            </button>
          ))}
        </div>
      )}

      <div style={isMobile ? mobileMainStyle : mainLayoutStyle}>
        {/* Left / Online panel */}
        <div style={isMobile
          ? { ...mobilePanelStyle, display: mobileTab === 'online' ? 'flex' : 'none' }
          : leftColumnStyle
        }>
          <OnlineNow 
          currentUserId={currentUser.id} 
          currentUsername={profile?.username ?? "Player"}
          currentAvatar={profile?.avatar_preset ?? "normal"}
          onChallenge={handleChallenge}
          onUserClick={(user) => {
            setSelectedPlayer(user);
            setIsProfileOpen(true);
          }}
        />

        <PlayerProfileModal
          open={isProfileOpen}
          onClose={handleCloseProfile}
          player={selectedPlayer}
          currentUserId={currentUser?.id}
          onChallenge={async (targetUserId, targetUsername) => {
            await handleChallenge(targetUserId, targetUsername);
            setIsProfileOpen(false);
          }}
          onAddFriend={async (targetUserId, targetUsername) => {
            if (!currentUser) return;
            // Envia solicitação de amizade
            const { error } = await import("@/lib/friends").then(m => m.sendFriendRequest(currentUser.id, targetUserId));
            // Buscar username do remetente
            let senderUsername = profile?.username || currentUser?.user_metadata?.username || null;
            // Criar notificação para o destinatário
            await import("@/lib/inbox").then(m => m.createInboxMessage({
              user_id: targetUserId,
              type: "friend_request_received",
              content: senderUsername ? `${senderUsername} enviou um pedido de amizade para você.` : "Alguém enviou um pedido de amizade para você.",
              cta: "Ver pedidos",
              cta_url: "/friends?tab=Requests",
              lang: "pt",
              meta: { username: senderUsername }
            }));
            setIsProfileOpen(false);
            // Exibe popup de sucesso igual ao de desafio enviado
            if (typeof window !== "undefined" && window.__invitePopup) {
              window.__invitePopup.showFriendRequestSent?.(targetUsername);
            } else {
              alert("Solicitação de amizade enviada!");
            }
          }}
        />

        </div>

        {/* Center / Chat panel */}
        <div style={isMobile
          ? { ...mobilePanelStyle, display: mobileTab === 'chat' ? 'flex' : 'none' }
          : centerColumnStyle
        }>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {matchResult && (
              <div style={{
                background: matchResult.result === 'VICTORY' ? 'linear-gradient(135deg, #1a4d2e 0%, #0d2818 100%)' 
                  : matchResult.result === 'DEFEAT' ? 'linear-gradient(135deg, #4d1a1a 0%, #281010 100%)'
                  : 'linear-gradient(135deg, #3d3d3d 0%, #1a1a1a 100%)',
                border: matchResult.result === 'VICTORY' ? '2px solid #00ff88' 
                  : matchResult.result === 'DEFEAT' ? '2px solid #ff4444'
                  : '2px solid #888',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 16,
              boxShadow: matchResult.result === 'VICTORY' ? '0 0 20px rgba(0, 255, 136, 0.3)'
                : matchResult.result === 'DEFEAT' ? '0 0 20px rgba(255, 68, 68, 0.3)'
                : '0 0 20px rgba(136, 136, 136, 0.2)',
              animation: 'slideDown 0.3s ease-out',
              position: 'relative'
            }}>
              <button
                onClick={() => setMatchResult(null)}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.3)',
                  border: 'none',
                  color: '#fff',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                ×
              </button>
              <div style={{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                color: matchResult.result === 'VICTORY' ? '#00ff88' 
                  : matchResult.result === 'DEFEAT' ? '#ff4444'
                  : '#aaa',
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontFamily: "'Orbitron', sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <span>
                  {matchResult.result === 'VICTORY' ? t('multiplayer.victory')
                    : matchResult.result === 'DEFEAT' ? t('multiplayer.defeat')
                    : t('multiplayer.draw')}
                </span>
                <span style={{ color: '#fff' }}>|</span>
                <span style={{ color: '#fff' }}>
                  {currentUser?.user_metadata?.username || profile?.username || 'P1'} {matchResult.myKills}×{matchResult.oppKills} {matchResult.opponentName || 'P2'}
                </span>
                {matchResult.xpGained > 0 && (
                  <>
                    <span style={{ color: '#fff' }}>|</span>
                    <span style={{ color: '#00ff88' }}>
                      +{matchResult.xpGained} XP
                    </span>
                  </>
                )}
              </div>
            </div>
            )}
          
            <GlobalChat
              currentUserId={currentUser.id}
              currentUsername={profile?.username ?? "Player"}
              currentAvatar={profile?.avatar_preset ?? "normal"}
              autoFocus={!isMobile}
            />
          </div>
        </div>
      </div>

      <InvitePopup
        currentUserId={currentUser.id}
        currentUsername={profile?.username ?? "Player"}
      />

      {/* Modal de recusa de convite — mesmo estilo visual do InvitePopup */}
      {declinedBy && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            width: '90%',
            maxWidth: 400,
            background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
            border: '2px solid #00E5FF',
            borderRadius: 16,
            boxShadow: '0 0 40px rgba(0, 229, 255, 0.3)',
            overflow: 'hidden',
            animation: 'slideDown 0.3s ease-out',
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              background: 'rgba(0, 229, 255, 0.1)',
              borderBottom: '1px solid rgba(0, 229, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>🚫</span>
              <span style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#00E5FF',
                fontFamily: "'Orbitron', sans-serif",
                letterSpacing: 1,
              }}>
                Convite Recusado
              </span>
            </div>
            {/* Body */}
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, color: '#ccc', lineHeight: 1.6 }}>
                <span style={{ color: '#fff', fontWeight: 700 }}>{declinedBy}</span>
                {' '}recusou o convite para a batalha.
              </div>
            </div>
            {/* Actions */}
            <div style={{ padding: '0 24px 24px 24px' }}>
              <button
                onClick={() => {
                  setDeclinedBy(null);
                  // Garantir que canal foi limpo
                  if (pendingMatchChannelRef.current) {
                    supabase.removeChannel(pendingMatchChannelRef.current);
                    pendingMatchChannelRef.current = null;
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontFamily: "'Orbitron', sans-serif",
                  background: 'linear-gradient(90deg, #00E5FF, #0072FF)',
                  color: '#000',
                  letterSpacing: 1,
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const pageContainerStyle = {
  width: "100%",
  height: "100vh",
  background:
    "radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)",
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  paddingTop: 64, // header fixo (desktop)
};

// Mobile: position fixed so container is exactly the visible area between
// MobileHeader bottom and viewport bottom — prevents iOS Safari 100vh issues
// and keeps input bar pinned to the bottom.
const mobilePageContainerStyle = {
  ...pageContainerStyle,
  position: "fixed",
  top: "calc(220px + env(safe-area-inset-top, 0px))",
  bottom: "env(safe-area-inset-bottom, 0px)",
  left: 0,
  right: 0,
  height: "auto",
  paddingTop: 0,
};

const topRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 16,
  padding: "12px 16px 10px 16px",
  position: "relative",
  zIndex: 1,
  flexShrink: 0,
};

const titleStyle = {
  margin: 0,
  fontSize: 22,
  fontWeight: 700,
  color: "#00E5FF",
  fontFamily: "'Orbitron',sans-serif",
};

const backButtonStyle = {
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 700,
  color: "#FFF",
  background: "rgba(255, 255, 255, 0.10)",
  border: "1px solid rgba(255, 255, 255, 0.20)",
  borderRadius: 10,
  cursor: "pointer",
  position: "relative",
  zIndex: 99999,
  pointerEvents: "auto",
  textDecoration: "none",
  display: "inline-block",
  fontFamily: "'Orbitron',sans-serif",
};

const mainLayoutStyle = {
  flex: 1,
  display: "flex",
  gap: 16,
  padding: "0 16px 16px",
  overflow: "hidden",
  minHeight: 0,
};

const leftColumnStyle = {
  width: 280,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0,
};

const centerColumnStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0,
};

// ── Mobile-only styles ──────────────────────────────────────
const mobileTabBarStyle = {
  display: 'flex',
  borderBottom: '1px solid rgba(0,229,255,0.2)',
  background: 'rgba(0,0,22,0.85)',
  flexShrink: 0,
  zIndex: 10,
  marginTop: 12,
};

const mobileTabButtonStyle = {
  flex: 1,
  padding: '10px 0',
  background: 'none',
  border: 'none',
  fontSize: 13,
  fontFamily: "'Orbitron', sans-serif",
  letterSpacing: 0.5,
  cursor: 'pointer',
  transition: 'color 0.2s, border-color 0.2s',
};

const mobileMainStyle = {
  flex: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};

const mobilePanelStyle = {
  flex: 1,
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0,
  padding: '8px 16px 12px',
};
