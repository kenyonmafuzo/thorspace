"use client";


import { useEffect, useState, useRef } from "react";
import { getAvatarSrc } from "@/app/lib/avatarOptions";
import TierInfo from "./TierInfo";
import { supabase } from "@/lib/supabase";
import RankBadge from "./RankBadge";
import {
  fetchFriendRequest,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from "@/lib/friends";


export default function PlayerProfileModal({ open, onClose, player, currentUserId, onChallenge, onAddFriend, hideChallengeButton }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState(null);
  const [viewerId, setViewerId] = useState(null);
  const [friendState, setFriendState] = useState(null); // { status, direction, id }
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendRow, setFriendRow] = useState(null);
  const modalRef = useRef(null);
  
  // Buscar dados do jogador quando o modal abrir
  useEffect(() => {
    if (!open || !player) return;
    
    const playerId = player.userId || player.user_id || player.id;
    if (!playerId) return;
    
    setLoading(true);
    setError("");
    
    (async () => {
      try {
        const [profileRes, statsRes, progressRes] = await Promise.all([
          supabase.from("profiles").select("username, avatar_preset, is_vip, vip_frame_color, vip_name_color").eq("id", playerId).maybeSingle().then(r => r.error
            ? supabase.from("profiles").select("username, avatar_preset, is_vip").eq("id", playerId).maybeSingle()
            : r
          ),
          supabase.from("player_stats").select("matches_played, wins, losses, draws, ships_destroyed, ships_lost").eq("user_id", playerId).maybeSingle(),
          supabase.from("player_progress").select("total_xp").eq("user_id", playerId).maybeSingle(),
        ]);
        
        if (profileRes.data) setProfile(profileRes.data);
        if (statsRes.data) setStats(statsRes.data);
        if (progressRes.data) setProgress(progressRes.data);
      } catch (e) {
        console.error("Erro ao buscar dados do jogador:", e);
        setError("Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, player]);
  
  // username seguro para exibir no modal
  const username = profile?.username || player?.username || "Player";
  // avatar seguro para exibir no modal
  const avatar = profile?.avatar_preset || player?.avatar || "normal";
  // VIP
  const isVip = profile?.is_vip === true;
  const vipFrameColor = profile?.vip_frame_color || "#FFD700";
  const vipNameColor = profile?.vip_name_color || "#FFD700";
  // total_xp seguro para exibir no modal
  const total_xp = progress?.total_xp ?? player?.total_xp ?? 0;
  // Variáveis de stats seguras para exibir no modal
  const matches = stats?.matches_played ?? stats?.matches ?? player?.matches_played ?? player?.matches ?? 0;
  const wins = stats?.wins ?? player?.wins ?? 0;
  const losses = stats?.losses ?? player?.losses ?? 0;
  const draws = stats?.draws ?? player?.draws ?? 0;
  const ships_destroyed = stats?.ships_destroyed ?? player?.ships_destroyed ?? 0;
  const ships_lost = stats?.ships_lost ?? player?.ships_lost ?? 0;
  if (!open) return null;

  // Overlay e modal: estilos modernos
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{
        position: 'fixed',
        top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      backdropFilter: 'blur(4px)',
    }}>
      <div ref={modalRef} style={{
        width: '90%',
        maxWidth: 400,
        background: 'linear-gradient(135deg, #0a0e27cc 0%, #1a1f3acc 100%)', // mais transparente
        border: isVip ? `2px solid ${vipFrameColor}` : '2px solid #00E5FF',
        borderRadius: 16,
        boxShadow: isVip ? `0 0 40px ${vipFrameColor}44` : '0 0 40px rgba(0, 229, 255, 0.3)',
        overflow: 'hidden',
        animation: 'slideIn 0.3s ease-out',
      }}>
        <div style={{
          padding: '20px 24px',
          background: 'rgba(0, 229, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src={getAvatarSrc(avatar)}
              alt="Avatar"
              style={{
                width: 38, height: 38, borderRadius: '50%',
                border: isVip ? `2px solid ${vipFrameColor}` : '2px solid #00e5ff',
                background: '#101426',
                boxShadow: isVip ? `0 0 12px ${vipFrameColor}88, 0 0 4px ${vipFrameColor}44` : '0 0 8px #00e5ff33'
              }}
            />
            <span style={{ fontSize: 18, fontWeight: 700, color: isVip ? vipNameColor : '#00E5FF', fontFamily: "'Orbitron', sans-serif", display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {isVip && <span style={{ fontSize: 14 }}>💎</span>}
              {username}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFF',
              fontSize: 28,
              fontWeight: 700,
              cursor: 'pointer',
              lineHeight: 1,
              marginLeft: 12,
              marginTop: -4,
            }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          {loading ? (
            <div style={{ color: '#FFF', textAlign: 'center', padding: 18, fontSize: 15, fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>Carregando...</div>
          ) : error ? (
            <div style={{ color: '#FF6B6B', textAlign: 'center', padding: 18, fontSize: 14, fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>{error}</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20, justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <TierInfo totalXp={total_xp ?? 0} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <StatCard label="Partidas" value={matches ?? "—"} />
                <StatCard label="Vitórias" value={wins ?? "—"} />
                <StatCard label="Empates" value={draws ?? "—"} />
                <StatCard label="Derrotas" value={losses ?? "—"} />
                <StatCard label="Naves Destr." value={ships_destroyed ?? "—"} />
                <StatCard label="Naves Perdidas" value={ships_lost ?? "—"} />
              </div>
              <div style={{ display: 'flex', gap: 36, justifyContent: 'center', marginTop: 12 }}>
                {(player?.userId || player?.id) && (player?.userId || player?.id) !== currentUserId && (
                  <>
                    <button
                      onClick={() => onAddFriend?.(player.userId || player.id, username)}
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1.5px solid rgba(0,229,255,0.18)",
                        borderRadius: "50%",
                        padding: 0,
                        width: 64,
                        height: 64,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 0 0 #00E5FF00",
                        cursor: "pointer",
                        transition: "box-shadow 0.18s, background 0.18s, border 0.18s",
                      }}
                      title="Adicionar Amigo"
                      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 12px 3px #00E5FF44"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 0 0 #00E5FF00"}
                    >
                      <img src="/game/images/add-user.png" alt="Adicionar Amigo" style={{ width: 36, height: 36, display: 'block' }} />
                    </button>
                    {!hideChallengeButton && (
                      <button
                        onClick={() => onChallenge?.(player.userId || player.id, username)}
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "1.5px solid rgba(0,229,255,0.18)",
                          borderRadius: "50%",
                          padding: 0,
                          width: 64,
                          height: 64,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 0 0 0 #00E5FF00",
                          cursor: "pointer",
                          transition: "box-shadow 0.18s, background 0.18s, border 0.18s",
                        }}
                        title="Desafiar"
                        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 12px 3px #00E5FF44"}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 0 0 #00E5FF00"}
                      >
                        <img src="/game/images/challenge.png" alt="Desafiar" style={{ width: 36, height: 36, display: 'block' }} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,#00e5ff22 60%,#1a2a3a 100%)',
      border: '1.5px solid #00e5ff33',
      borderRadius: 10,
      padding: '10px 4px 8px 4px',
      textAlign: 'center',
      color: '#fff',
      fontWeight: 800,
      fontSize: 14,
      minWidth: 54,
      minHeight: 32,
      boxShadow: '0 2px 6px #00e5ff22',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'box-shadow 0.2s',
      letterSpacing: 0.1,
      margin: 0,
    }}>
      <div style={{ fontSize: 11, color: '#7fd7ff', marginBottom: 3, fontWeight: 700, letterSpacing: 0.1, fontFamily: "'Orbitron', sans-serif" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#00E5FF', textShadow: '0 2px 4px #00e5ff33', fontFamily: "'Orbitron', sans-serif" }}>{value}</div>
    </div>
  );
}
