'use client';

import { useEffect, useState } from 'react';
import dynamic from "next/dynamic";

const PlayerStatsModal = dynamic(() => import("../../components/PlayerStatsModal"), { ssr: false });
const ShotTypeModal = dynamic(() => import("../../components/ShotTypeModal"), { ssr: false });
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PlayPage({ params }) {
  const { matchId } = params;
  const router = useRouter();
  // TAB popup state
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalTabMode, setStatsModalTabMode] = useState(false);
  
  // Shot Type Modal state
  const [shotTypeModalOpen, setShotTypeModalOpen] = useState(false);
  const [currentShipIndex, setCurrentShipIndex] = useState(1);
  const [shotPreferences, setShotPreferences] = useState({
    "1": "plasma",
    "2": "plasma",
    "3": "plasma"
  });
  
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

  // Load shot preferences from Supabase on mount
  useEffect(() => {
    const loadShotPreferences = async () => {
      if (userId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("shot_preferences")
          .eq("id", userId)
          .single();

        if (profileData?.shot_preferences) {
          setShotPreferences(profileData.shot_preferences);
          localStorage.setItem('thor_shot_preferences', JSON.stringify(profileData.shot_preferences));
        }
      }
    };

    loadShotPreferences();
  }, [userId]);

  useEffect(() => {
    console.log('[PLAY] Registering message listener...');
    
    const handleMessage = (event) => {
      console.log('[PLAY] ========================================');
      console.log('[PLAY] Message received!');
      console.log('[PLAY] Origin:', event.origin);
      console.log('[PLAY] Data:', event.data);
      console.log('[PLAY] Type:', event.data?.type);
      console.log('[PLAY] ========================================');
      
      const { type, shipIndex, currentPreferences, payload } = event.data;

      if (type === 'OPEN_SHOT_TYPE_MODAL') {
        console.log('[PLAY] ✅ Opening Shot Type Modal for ship:', shipIndex);
        setCurrentShipIndex(shipIndex || 1);
        setShotPreferences(currentPreferences || {"1":"plasma","2":"plasma","3":"plasma"});
        setShotTypeModalOpen(true);
      } else if (type === 'THOR:RETURN_TO_CHAT') {
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
    console.log('[PLAY] Message listener registered!');

    return () => {
      console.log('[PLAY] Removing message listener...');
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Track as "playing" in the shared presence channel while on game screen
  useEffect(() => {
    let ch;
    (async () => {
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

  const handleShotTypeChange = async (shotType) => {
    const newPreferences = { ...shotPreferences, [currentShipIndex.toString()]: shotType };
    setShotPreferences(newPreferences);

    // Save to Supabase
    if (userId) {
      await supabase
        .from("profiles")
        .update({ shot_preferences: newPreferences })
        .eq("id", userId);
    }

    // Save to localStorage for game
    localStorage.setItem('thor_shot_preferences', JSON.stringify(newPreferences));

    // Notify iframe
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'SHOT_PREFERENCES_UPDATED',
        preferences: newPreferences
      }, '*');
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0,
      width: "100vw", height: "100dvh",
      overflow: "hidden",
      zIndex: 9999,
    }}>
      <iframe
        src={`/game/thor.html?matchId=${encodeURIComponent(matchId)}`}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        title="Thorspace"
      />
      <PlayerStatsModal
        open={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        userId={userId}
        username={username}
        tabMode={statsModalTabMode}
      />
      
      <ShotTypeModal
        open={shotTypeModalOpen}
        onClose={() => setShotTypeModalOpen(false)}
        shipIndex={currentShipIndex}
        currentShotType={shotPreferences[currentShipIndex.toString()]}
        onConfirm={handleShotTypeChange}
      />
    </div>
  );
}
