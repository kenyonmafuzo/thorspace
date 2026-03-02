"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { finalizeMatch } from "@/lib/match";
import { useProgress } from "@/lib/ProgressContext";

export default function GamePage() {
  const router = useRouter();
  const { addXp, setTotalXp } = useProgress();
  const finalizedRef = useRef(false);
  const [iframeUrl, setIframeUrl] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      const username = localStorage.getItem("thor_username");
      if (!username) {
        router.replace("/username");
        return;
      }

      // Construir URL correta uma única vez — evita double-load do iframe
      const mode = localStorage.getItem("thor_selected_mode") || "practice";
      const matchId = localStorage.getItem("thor_match_id");

      if (mode === "multiplayer" && matchId) {
        const supabaseUrl = encodeURIComponent(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
        const supabaseKey = encodeURIComponent(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
        const accessToken = encodeURIComponent(session?.access_token || '');
        const refreshToken = encodeURIComponent(session?.refresh_token || '');
        const userId = encodeURIComponent(session?.user?.id || '');
        setIframeUrl(`/game/thor.html?mode=multiplayer&matchId=${matchId}&supabaseUrl=${supabaseUrl}&supabaseKey=${supabaseKey}&access_token=${accessToken}&refresh_token=${refreshToken}&userId=${userId}`);
      } else {
        setIframeUrl("/game/thor.html");
      }
    })();
  }, [router]);

  const iframeRef = useRef(null);

  // Track as "playing" in the shared presence channel while on game screen
  useEffect(() => {
    let ch;
    (async () => {
      // Always use the live session so userId is correct even on first game session
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id;
      const username = localStorage.getItem("thor_username");
      const avatar = localStorage.getItem("thor_avatar") || "normal";
      if (!userId || !username) return;

      ch = supabase.channel("presence:online-users", {
        config: { presence: { key: userId } },
      });
      ch.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({
            user_id: userId,
            username,
            avatar,
            online_at: new Date().toISOString(),
            status: "playing",
            is_vip: localStorage.getItem("thor_is_vip") === "true",
            vip_name_color: localStorage.getItem("thor_vip_name_color") || "#FFD700",
            vip_frame_color: localStorage.getItem("thor_vip_frame_color") || "#FFD700",
            vip_avatar: localStorage.getItem("thor_vip_avatar") || null,
          });
        }
      });
    })();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, []);

  function handleIframeLoad() {
    finalizedRef.current = false;
    console.log("[GamePage] Iframe loaded");

    (async () => {
      try {
        const username = localStorage.getItem("thor_username") || "";
        const matchId = localStorage.getItem("thor_match_id") || null;
        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id || null;
        const win = iframeRef.current && iframeRef.current.contentWindow;
        if (!win) return;

        const mode = localStorage.getItem("thor_selected_mode") || "practice";
        const isMultiplayer = mode === "multiplayer" && matchId;

        if (isMultiplayer) {
          // Always fetch a FRESH session at iframe-load time so the token
          // passed to initMultiplayerMode is not stale.
          const { data: freshData } = await supabase.auth.getSession();
          const freshToken = freshData?.session?.access_token || '';
          const freshRefresh = freshData?.session?.refresh_token || '';
          win.postMessage(
            { type: "THOR:INIT", payload: { userId, username, matchId, access_token: freshToken, refresh_token: freshRefresh } },
            window.location.origin
          );
          console.log("[GamePage] Multiplayer INIT — userId:", userId, "matchId:", matchId);
        } else {
          win.postMessage(
            { type: "THOR:INIT", payload: { userId, username, mode } },
            window.location.origin
          );
          console.log("[GamePage] Solo INIT —", mode);
        }
      } catch (e) {
        console.warn("Erro ao enviar THOR:INIT:", e);
      }
    })();
  }
  
  useEffect(() => {
  const onMessage = async (event) => {
    if (event.origin !== window.location.origin) return;

    const msg = event.data;
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "THOR:SCORE") {
      const score = Number(msg.payload?.score ?? 0);
      localStorage.setItem("thor_last_score", String(score));
      return;
    }

    if (msg.type === "THOR:SCORE_UPDATE") {
      const finalScore = Number(msg.payload?.score ?? 0);
      localStorage.setItem("thor_last_score", String(finalScore));

      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (session?.user) {
          // Fetch current total_score from player_stats
          const { data: stats, error } = await supabase
            .from("player_stats")
            .select("total_score")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (error) {
            console.warn("Erro ao buscar pontos:", error);
            return;
          }

          const current = Number(stats?.total_score ?? 0);
          const next = current + finalScore;

          // Update or insert into player_stats
          if (stats) {
            const { error: updateError } = await supabase
              .from("player_stats")
              .update({ total_score: next })
              .eq("user_id", session.user.id);

            if (!updateError) {
              localStorage.setItem("thor_points", String(next));
              window.dispatchEvent(
                new CustomEvent("thor_points_updated", {
                  detail: { points: next },
                })
              );
            }
          } else {
            // Create player_stats row if missing
            const { error: insertError } = await supabase
              .from("player_stats")
              .insert({ user_id: session.user.id, total_score: next });

            if (!insertError) {
              localStorage.setItem("thor_points", String(next));
              window.dispatchEvent(
                new CustomEvent("thor_points_updated", {
                  detail: { points: next },
                })
              );
            }
          }
        }
      } catch (e) {
        console.warn("Erro ao salvar score:", e);
      }
      return;
    }

    if (msg.type === "THOR:LOGOUT") {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
      localStorage.removeItem("thor_username");
      localStorage.removeItem("thor_last_score");
      router.replace("/login");
      return;
    }

    if (msg.type === "THOR:GAME_OVER") {
      // Guard: executar apenas uma vez
      if (finalizedRef.current) {
        console.log("THOR:GAME_OVER já processado, ignorando duplicata");
        return;
      }
      finalizedRef.current = true;

      const payload = msg.payload || {};
      const { matchId, opponentName, myKills, oppKills, myLost, oppLost, xpGained } = payload;

      // Buscar userId da sessão
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id || null;

      // ❌ NÃO inserir no chat aqui - será feito via THOR:RETURN_TO_CHAT no multiplayer/page.js
      // Isso evita mensagens duplicadas no chat
      
      // Calcular resultado baseado em kills
      const kills = Number(myKills ?? oppLost ?? 0);
      const deaths = Number(oppKills ?? myLost ?? 0);
      
      let result = 'draw';
      if (kills > deaths) result = 'win';
      else if (kills < deaths) result = 'loss';

      console.log("THOR:GAME_OVER received:", { kills, deaths, result, xpGained, payload });

      // Update totalXp in context IMMEDIATELY (both multiplayer and practice)
      if (xpGained && xpGained > 0) {
        console.log("[GamePage] XP ganho: +", xpGained);
        // XP será atualizado via provider global (UserStatsProvider) após evento de finalização
      } else {
        console.warn("[GamePage] No xpGained to add:", xpGained);
      }

      // Se for match multiplayer válido, finalizar via API
      const matchSource = localStorage.getItem("thor_match_source");
      if (matchSource === "multiplayer" && matchId && opponentName && userId) {
        try {
          // 🎯 AAA ARCHITECTURE: Chamar API Route que valida e processa no backend
          const { data: session } = await supabase.auth.getSession();
          const accessToken = session?.session?.access_token;
          const refreshToken = session?.session?.refresh_token;

          if (!accessToken || !refreshToken) {
            console.error('[GamePage] Missing auth tokens');
            return;
          }

          console.log('[GamePage] Calling /api/finalize-match...');
          
          let response;
          let finalizationResult;
          
          try {
            response = await fetch('/api/finalize-match', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                matchId,
                myLost: deaths,
                oppLost: kills,
                accessToken,
                refreshToken,
              }),
            });

            finalizationResult = await response.json();
          } catch (fetchError) {
            console.error('[GamePage] Fetch error:', fetchError);
            // Continuar mesmo com erro - não bloquear UI
            window.dispatchEvent(new CustomEvent("thor_match_finalized"));
            return;
          }

          if (!response.ok) {
            console.error('[GamePage] API returned error:', finalizationResult);
            // Continuar mesmo com erro - não bloquear UI
            window.dispatchEvent(new CustomEvent("thor_match_finalized"));
            return;
          }

          if (finalizationResult.success) {
            if (finalizationResult.alreadyFinalized) {
              console.log('[GamePage] ℹ️ Match was already finalized (idempotent)');
            } else {
              console.log('[GamePage] ✅ Match finalized successfully');
            }
            
            // Disparar evento de finalização completa para refetch
            window.dispatchEvent(new CustomEvent("thor_match_finalized"));
          }
        } catch (err) {
          console.error("Error finalizing match:", err);
        }
      }

      // NÃO redirecionar automaticamente - usuário deve clicar no botão
      // Força atualização do header/tier imediatamente
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("thor_stats_updated"));
      }
      console.log("Game over processed. User must click button to continue.");
      return;
    }

    if (msg.type === "THOR:BACK_TO_MODE") {
      // Usuário clicou no botão "Voltar ao início" na tela de resultado
      console.log("THOR:BACK_TO_MODE received");
      
      // Verificar se veio de uma sessão multiplayer (ex: partida com bot)
      const selectedMode = localStorage.getItem("thor_selected_mode");
      
      // Limpar dados do jogo anterior
      localStorage.removeItem("thor_match_id");
      localStorage.removeItem("thor_match_source");
      localStorage.removeItem("thor_match_opponent_name");
      localStorage.removeItem("thor_selected_mode");
      
      if (selectedMode === "multiplayer") {
        console.log("THOR:BACK_TO_MODE — origem multiplayer, navegando para /multiplayer");
        router.replace("/multiplayer");
      } else {
        console.log("THOR:BACK_TO_MODE — navegando para /mode");
        router.replace("/mode");
      }
      return;
    }

    if (msg.type === "THOR:RETURN_TO_CHAT") {
      // Usuário clicou no botão "Return to Lobby" após uma partida multiplayer
      const payload = msg.payload || {};
      console.log("THOR:RETURN_TO_CHAT received:", payload);
      
      // Salvar resultado no localStorage para mostrar no chat
      localStorage.setItem('match_result', JSON.stringify({
        matchId: payload.matchId,
        result: payload.result,
        myKills: payload.myKills,
        oppKills: payload.oppKills,
        opponentName: payload.opponentName,
        xpGained: payload.xpGained || 0,
        timestamp: Date.now()
      }));
      
      // 🧹 CRITICAL: Limpar matchId para não recarregar o mesmo jogo
      localStorage.removeItem('thor_match_id');
      localStorage.removeItem('thor_match_source');
      localStorage.removeItem('thor_match_opponent_name');
      console.log('[GamePage] 🧹 Cleared match localStorage to prevent reload');
      
      // Navegar de volta para o multiplayer (que tem o chat)
      router.push('/multiplayer');
      return;
    }
  };

  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}, [router]);


  // Não renderiza até a URL estar pronta
  if (!iframeUrl) {
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
    <>
      {/* position:fixed cobre o header do layout — jogo verdadeiramente full-screen */}
      <div style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100vw", height: "100dvh",
        overflow: "hidden",
        zIndex: 9999,
      }}>
        <iframe
          ref={iframeRef}
          onLoad={handleIframeLoad}
          src={iframeUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
          allow="autoplay"
        />
      </div>
    </>
  );
}
