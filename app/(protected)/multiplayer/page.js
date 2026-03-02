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
    const { userStats, isLoading: statsLoading } = useUserStats();
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
  const handleCloseProfile = () => {
  setIsProfileOpen(false);
  setSelectedPlayer(null);
};


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

    // ✅ Timeout de segurança: se após 8s ainda estiver em loading, força false
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn("[Multiplayer] Loading timeout - forçando loading=false");
        setLoading(false);
      }
    }, 8000);

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("getSession error:", error);

        const session = data?.session ?? null;
        const user = session?.user ?? (await supabase.auth.getUser()).data?.user ?? null;

        if (!user) {
          console.warn("[Multiplayer] Sem usuário autenticado");
          if (mounted) {
            setLoading(false);
            clearTimeout(safetyTimeout);
          }
          router.replace("/login");
          return;
        }

        // ✅ Seta currentUser IMEDIATAMENTE para evitar "Não autenticado"
        if (mounted) {
          console.log("[Multiplayer] Usuário autenticado:", user.id);
          setCurrentUser(user);
          setAuthChecked(true);
        }

        if (!mounted) return;

        // Buscar profile com timeout próprio
        let profileData = null;
        let profileError = null;
        
        try {
          const profilePromise = supabase
            .from("profiles")
            .select("username, avatar_preset")
            .eq("id", user.id)
            .maybeSingle();
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Profile query timeout")), 4000)
          );
          
          const result = await Promise.race([profilePromise, timeoutPromise]);
          profileData = result.data;
          profileError = result.error;
        } catch (err) {
          console.error("[Multiplayer] Erro ao buscar profile:", err);
          profileError = err;
        }

        if (profileError) console.error("profile fetch error:", profileError);

        if (!mounted) return;
        
        // Se não encontrou profile, usar fallback ou tentar criar
        if (!profileData) {
          console.warn("[Multiplayer] Profile não encontrado, usando fallback");
          const fallbackUsername = localStorage.getItem("thor_username") || 
                                  user.email?.split('@')[0] || 
                                  "Player";
          profileData = { username: fallbackUsername, avatar_preset: "normal" };
          
          // Tentar criar profile em background (não bloqueia UI)
          supabase
            .from("profiles")
            .insert({
              id: user.id,
              username: fallbackUsername,
              avatar_preset: "normal",
              created_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.error("[Multiplayer] Erro ao criar profile:", error);
              else console.log("[Multiplayer] Profile criado com sucesso");
            });
        }
        
        setProfile(profileData);
        
        // ✅ SEMPRE seta loading false após buscar profile
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
        const acceptedChannel = supabase
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
        const invitesChannel = supabase
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

        return () => {
          supabase.removeChannel(acceptedChannel);
          supabase.removeChannel(invitesChannel);
        };
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
    <div style={pageContainerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
      
      <div style={topRowStyle}>
        <Link href="/mode" style={backButtonStyle}>
          ← {t('multiplayer.back')}
        </Link>
        <h2 style={titleStyle}>{t('multiplayer.title')} Hub</h2>
      </div>

      <div style={mainLayoutStyle}>
        <div style={leftColumnStyle}>
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

        <div style={centerColumnStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
  paddingTop: 90,
};

const topRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 16,
  padding: "24px 24px 18px 24px",
  marginTop: 8,
  position: "relative",
  zIndex: 1,
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
  gap: 24,
  padding: 24,
  overflow: "hidden",
};

const leftColumnStyle = {
  width: 280,
  flexShrink: 0,
};

const centerColumnStyle = {
  flex: 1,
  minWidth: 0,
  paddingTop: 8,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};
