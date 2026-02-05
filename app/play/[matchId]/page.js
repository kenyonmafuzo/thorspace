'use client';

import { useEffect, useState } from 'react';
import dynamic from "next/dynamic";

const PlayerStatsModal = dynamic(() => import("../../components/PlayerStatsModal"), { ssr: false });
import { useRouter } from 'next/navigation';

export default function PlayPage({ params }) {
  const { matchId } = params;
  const router = useRouter();
  // TAB popup state
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalTabMode, setStatsModalTabMode] = useState(false);
  // Pega userId/username do localStorage (ajuste conforme seu auth)
  const userId = typeof window !== "undefined" ? localStorage.getItem("thor_user_id") : null;
  const username = typeof window !== "undefined" ? localStorage.getItem("thor_username") : "";

  useEffect(() => {
    const handleTabDown = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!statsModalOpen) {
          setStatsModalTabMode(true);
          setStatsModalOpen(true);
        }
      }
    };
    const handleTabUp = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (statsModalOpen) {
          setStatsModalOpen(false);
          setStatsModalTabMode(false);
        }
      }
    };
    window.addEventListener("keydown", handleTabDown, true);
    window.addEventListener("keyup", handleTabUp, true);
    // Remove tabIndex de todos os botões
    const removeTabIndex = () => {
      document.querySelectorAll('button, [tabindex="0"]').forEach(el => {
        el.setAttribute('tabindex', '-1');
      });
    };
    removeTabIndex();
    return () => {
      window.removeEventListener("keydown", handleTabDown, true);
      window.removeEventListener("keyup", handleTabUp, true);
    };
  }, [statsModalOpen]);

  useEffect(() => {
    const handleMessage = (event) => {
      // Verificar origem
      if (event.origin !== window.location.origin) return;

      const { type, payload } = event.data;

      if (type === 'THOR:RETURN_TO_CHAT') {
        console.log('[PLAY] Recebido THOR:RETURN_TO_CHAT:', payload);
        
        // Salvar resultado no localStorage para mostrar no chat
        localStorage.setItem('match_result', JSON.stringify({
          matchId: payload.matchId,
          result: payload.result,
          myKills: payload.myKills,
          oppKills: payload.oppKills,
          opponentName: payload.opponentName,
          timestamp: Date.now()
        }));
        
        // Navegar de volta para o multiplayer (que tem o chat)
        router.push('/multiplayer');
      } else if (type === 'THOR:GAME_OVER') {
        console.log('[PLAY] Recebido THOR:GAME_OVER (modo solo)');
        // Voltar para seleção de modo
        router.push('/mode');
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [matchId, router]);

  return (
    <div style={{ width: "100vw", height: "100vh", margin: 0 }}>
      <iframe
        src={`/game/thor.html?matchId=${encodeURIComponent(matchId)}`}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="Thorspace"
      />
      <PlayerStatsModal
        open={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        userId={userId}
        username={username}
        tabMode={statsModalTabMode}
      />
    </div>
  );
}
