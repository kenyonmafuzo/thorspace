"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserHeader from "@/app/components/UserHeader";
import MobileHeader from "@/app/components/MobileHeader";
import { useUserStats } from "@/app/components/stats/UserStatsProvider";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/src/hooks/useI18n";
import { getLevelProgressFromTotalXp } from "@/lib/xpSystem";

export default function RankingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const { userStats } = useUserStats();
  const [activeTab, setActiveTab] = useState("multiplayer");
  const [multiplayerData, setMultiplayerData] = useState([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [zoomModal, setZoomModal] = useState(null); // { src, label, level? }

  useEffect(() => {
    let isMounted = true;

    async function loadRanking() {
      setLoadingRanking(true);
      setError("");
      try {
        // Buscar todos os perfis
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, avatar_preset, is_vip, vip_name_color, vip_frame_color")
          .order("username", { ascending: true });
        if (profilesError) {
          setError("Erro ao buscar perfis.");
          setLoadingRanking(false);
          return;
        }
        // Buscar stats e progress de todos os usuários
        const userIds = profiles.map(p => p.id);
        const [{ data: statsData }, { data: progressData }] = await Promise.all([
          supabase
            .from("player_stats")
            .select("user_id, matches_played, wins, draws, losses, ships_destroyed"),
          supabase
            .from("player_progress")
            .select("user_id, level, xp, xp_to_next, total_xp")
        ]);
        const statsMap = {};
        (statsData || []).forEach(s => { statsMap[s.user_id] = s; });
        const progressMap = {};
        (progressData || []).forEach(p => { progressMap[p.user_id] = p; });
        // Montar lista final - SEMPRE mostra XP real, mesmo sem partidas
        const merged = profiles.map(profile => {
          const stats = statsMap[profile.id] || {};
          const progress = progressMap[profile.id] || {};
          const matches_played = Number(stats.matches_played ?? 0);
          const wins = Number(stats.wins ?? 0);
          const total_xp = Number(progress.total_xp ?? 0);
          // Calcula level dinamicamente a partir do total_xp (consistente com header/perfil)
          const calculatedProgress = getLevelProgressFromTotalXp(total_xp);
          const level = calculatedProgress.level;
          const tier = calculatedProgress.tier;
          const material = calculatedProgress.material;
          const xp = progress.xp !== undefined ? Number(progress.xp) : 0;
          const xp_to_next = progress.xp_to_next !== undefined ? Number(progress.xp_to_next) : 300;
          return {
            user_id: profile.id,
            username: profile.username,
            avatar_preset: profile.avatar_preset,
            is_vip: profile.is_vip || false,
            vip_name_color: profile.vip_name_color || "#FFD700",
            vip_frame_color: profile.vip_frame_color || "#FFD700",
            total_xp,
            level,
            tier,
            material,
            xp,
            xp_to_next,
            wins: wins,
            losses: Number(stats.losses ?? 0),
            draws: Number(stats.draws ?? 0),
            matches_played,
            ships_destroyed: Number(stats.ships_destroyed ?? 0),
            win_rate: matches_played > 0 ? (wins / matches_played) * 100 : 0,
          };
        });
        // Ordenar: wins desc, ships_destroyed desc, matches_played desc, username asc
        merged.sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          if (b.ships_destroyed !== a.ships_destroyed) return b.ships_destroyed - a.ships_destroyed;
          if (b.matches_played !== a.matches_played) return b.matches_played - a.matches_played;
          return (a.username || '').localeCompare(b.username || '');
        });
        if (isMounted) setMultiplayerData(merged);
      } catch (err) {
        if (isMounted) setError("Erro ao carregar ranking. Tente novamente.");
      } finally {
        if (isMounted) setLoadingRanking(false);
      }
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session) {
        router.replace("/login");
        return;
      }
      setCurrentUserId(session.user.id);
      setLoading(false);
      loadRanking();
    })();

    function handleStatsUpdated() {
      loadRanking();
      // Optimistically update current user's avatar in multiplayerData for instant UI
      setMultiplayerData(prev => {
        if (!userStats || !currentUserId) return prev;
        return prev.map(player =>
          player.user_id === currentUserId
            ? { ...player, avatar_preset: userStats.avatar_preset }
            : player
        );
      });
    }
    window.addEventListener("thor_stats_updated", handleStatsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("thor_stats_updated", handleStatsUpdated);
    };
  }, [router]);

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, backgroundImage: "url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)", backgroundSize: "cover, cover", backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center center, center center", opacity: 0.35, pointerEvents: "none", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }} />
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        @media (max-width: 768px) {
          .rank-main-container { margin-top: 92px !important; }
          .rank-table-wrap { display: none !important; }
          .rank-cards-mobile { display: block !important; }
        }
        @media (min-width: 769px) {
          .rank-cards-mobile { display: none !important; }
        }
      `}</style>
      <UserHeader />
      <MobileHeader />

      {/* Zoom Modal */}
      {zoomModal && (
        <div
          onClick={() => setZoomModal(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, cursor: 'pointer',
            animation: 'rankZoomFadeIn 0.2s ease',
          }}
        >
          <style>{`@keyframes rankZoomFadeIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}`}</style>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(10,20,40,0.95)',
              border: '2px solid rgba(0,229,255,0.35)',
              borderRadius: 20,
              padding: '36px 48px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
              boxShadow: '0 0 40px rgba(0,229,255,0.2)',
              animation: 'rankZoomFadeIn 0.22s ease',
            }}
          >
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={zoomModal.src}
                alt={zoomModal.label}
                style={{ width: 220, height: 220, objectFit: 'contain', borderRadius: 16 }}
                onError={e => { e.currentTarget.src = '/game/images/ranks/rookie/rookie_bronze.png'; }}
              />
              {zoomModal.level != null && (
                <div style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00E5FF 0%, #0099CC 100%)',
                  border: '2.5px solid #001a2e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 16,
                  color: '#FFF',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                  boxShadow: '0 2px 10px rgba(0,229,255,0.5)',
                  fontFamily: "'Orbitron',sans-serif",
                }}>
                  {zoomModal.level}
                </div>
              )}
            </div>
            <span style={{ color: '#00E5FF', fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>
              {zoomModal.label}
            </span>
          </div>
        </div>
      )}
      <div className="rank-main-container" style={{ maxWidth: 900, margin: '120px auto 0 auto', padding: '0 16px', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 16,
          padding: "0 0 24px 0",
          width: "100%",
          margin: 0,
          position: "relative",
          zIndex: 1,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: "#00E5FF",
            fontFamily: "'Orbitron',sans-serif",
            letterSpacing: 1,
          }}>Ranking</h2>
        </div>
        <div
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: 24,
            backdropFilter: "blur(10px)",
          }}
        >
          {multiplayerData.length > 0 && (
            <>
            {/* ── MOBILE CARDS ── */}
            <div className="rank-cards-mobile">
              {[...multiplayerData.slice(0, 10), ...( (() => { const idx = multiplayerData.findIndex(p => p.user_id === currentUserId); return (idx >= 10) ? [{ ...multiplayerData[idx], _extraRank: idx + 1 }] : []; })() )].map((player, loopIdx) => {
                const realIndex = player._extraRank ? player._extraRank - 1 : loopIdx;
                const isCurrentUser = player.user_id === currentUserId;
                const tier = player.tier || 'Rookie';
                const material = player.material || 'Bronze';
                const tierUrl = `/game/images/ranks/${tier.toLowerCase()}/${tier.toLowerCase()}_${material.toLowerCase()}.png`;
                const avatarPreset = player.avatar_preset || 'normal';
                let avatarUrl = null;
                if (avatarPreset.startsWith('/')) avatarUrl = avatarPreset;
                else if (avatarPreset === 'normal') avatarUrl = '/game/images/nave_normal.png';
                else if (avatarPreset === 'protecao') avatarUrl = '/game/images/nave_protecao.png';
                else if (avatarPreset === 'alcance') avatarUrl = '/game/images/nave_alcance.png';
                else avatarUrl = '/game/images/nave_normal.png';
                const posColor = realIndex === 0 ? '#FFD700' : realIndex === 1 ? '#C0C0C0' : realIndex === 2 ? '#CD7F32' : '#FFF';
                const cardBg = isCurrentUser ? '#003b5c' : realIndex < 3 ? 'rgba(0,229,255,0.08)' : 'rgba(0,0,0,0.4)';
                const displayXp = isCurrentUser && userStats?.total_xp !== undefined ? userStats.total_xp : player.total_xp;
                return (
                  <div key={player.user_id} style={{
                    background: cardBg,
                    border: isCurrentUser ? '2px solid #00E5FF' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                    boxShadow: isCurrentUser ? '0 0 14px #00E5FF33' : realIndex < 3 ? '0 0 8px #00E5FF18' : 'none',
                  }}>
                    {/* Line 1: pos + tier + avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: posColor, fontFamily: "'Orbitron',sans-serif", minWidth: 26, textAlign: 'center' }}>{realIndex + 1}</span>
                      <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                        <img src={tierUrl} alt={`${tier} ${material}`} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain', background: '#181c22', border: '2px solid #222', cursor: 'pointer' }}
                          onClick={() => setZoomModal({ src: tierUrl, label: `${tier} ${material}`, level: player.level })}
                          onError={(e) => { e.currentTarget.src = '/game/images/ranks/rookie/rookie_bronze.png'; }} />
                        <div style={{ position: 'absolute', top: -3, right: -3, width: 13, height: 13, borderRadius: '50%', background: 'linear-gradient(135deg,#00E5FF 0%,#0099CC 100%)', border: '1.5px solid #001a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 8, color: '#FFF', pointerEvents: 'none' }}>{player.level}</div>
                      </div>
                      {avatarUrl && <img src={avatarUrl} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: player.is_vip ? `2px solid ${player.vip_frame_color}` : '2px solid #222', boxShadow: player.is_vip ? `0 0 6px ${player.vip_frame_color}88` : 'none' }} onClick={() => setZoomModal({ src: avatarUrl, label: player.username || 'Player' })} />}
                      <span style={{ color: player.is_vip ? player.vip_name_color : '#fff', fontSize: 13, fontFamily: "'Orbitron',sans-serif", fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: player.is_vip ? `0 0 8px ${player.vip_name_color}99` : 'none' }}>
                        {player.is_vip && <span style={{ marginRight: 3, fontSize: 11 }}>💎</span>}
                        {player.username || 'Player'}
                        {isCurrentUser && <span style={{ color: '#00E5FF', marginLeft: 6, fontSize: 10 }}>({t('multiplayer.you')})</span>}
                      </span>
                    </div>
                    {/* Line 2: stats */}
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, paddingLeft: 34, flexWrap: 'wrap' }}>
                      <span style={{ color: '#FFD700', fontFamily: "'Orbitron',sans-serif" }}>Lv {player.level}</span>
                      <span style={{ color: '#00E5FF' }}>{(displayXp ?? 0).toLocaleString('pt-BR')} XP</span>
                      <span style={{ color: '#00FF00' }}>▲ {player.wins ?? 0}</span>
                      <span style={{ color: '#FF4444' }}>▼ {player.losses ?? 0}</span>
                      <span style={{ color: '#aaa' }}>{(player.win_rate ?? 0).toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* ── DESKTOP TABLE ── */}
            <div className="rank-table-wrap" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th style={headerStyle}>#</th>
                    <th style={{ ...headerStyle, textAlign: "left" }}>{t('ranking.player')}</th>
                    <th style={headerStyle}>{t('ranking.level')}</th>
                    <th style={headerStyle}>{t('ranking.xp')}</th>
                    <th style={headerStyle}>{t('ranking.wins')}</th>
                    <th style={headerStyle}>{t('ranking.losses')}</th>
                    <th style={headerStyle}>{t('ranking.winRate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Top 10 */}
                  {multiplayerData.slice(0, 10).map((player, index) => {
                    const isCurrentUser = player.user_id === currentUserId;
                    const tier = player.tier || 'Rookie';
                    const material = player.material || 'Bronze';
                    const tierUrl = `/game/images/ranks/${tier.toLowerCase()}/${tier.toLowerCase()}_${material.toLowerCase()}.png`;
                    const avatarPreset = player.avatar_preset || 'normal';
                    let avatarUrl = null;
                    // avatar_preset can be a full path (VIP custom) or a short preset key
                    if (avatarPreset.startsWith('/')) {
                      avatarUrl = avatarPreset;
                    } else if (avatarPreset === 'normal') avatarUrl = '/game/images/nave_normal.png';
                    else if (avatarPreset === 'protecao') avatarUrl = '/game/images/nave_protecao.png';
                    else if (avatarPreset === 'alcance') avatarUrl = '/game/images/nave_alcance.png';
                    else avatarUrl = '/game/images/nave_normal.png';
                    // Destaque para top 3
                    let rowBg = "transparent";
                    if (index < 3) rowBg = "rgba(0,229,255,0.08)";
                    if (isCurrentUser) rowBg = "#003b5c";
                    return (
                      <tr
                        key={player.user_id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          background: rowBg,
                          outline: isCurrentUser ? "2px solid #00E5FF" : "none",
                          boxShadow: isCurrentUser ? "0 0 20px #00E5FF33" : (index < 3 ? "0 0 12px #00E5FF22" : "none"),
                        }}
                      >
                        <td style={{ ...cellStyle, fontSize: 24, fontWeight: 900, color: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#FFF", textShadow: "0 2px 8px rgba(0,0,0,0.25)", fontFamily: "'Orbitron', sans-serif" }}>
                          {index + 1}
                        </td>
                        <td style={{ ...cellStyle, textAlign: "left", fontWeight: isCurrentUser ? 600 : 400, display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Orbitron', sans-serif" }}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img 
                              src={tierUrl} 
                              alt={`${tier} ${material}`} 
                              title={`${tier} ${material}`} 
                              style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain', background: '#181c22', border: '2px solid #222', cursor: 'pointer' }}
                              onClick={() => setZoomModal({ src: tierUrl, label: `${tier} ${material}`, level: player.level })}
                              onError={(e) => {
                                e.currentTarget.src = '/game/images/ranks/rookie/rookie_bronze.png';
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                top: -3,
                                right: -3,
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #00E5FF 0%, #0099CC 100%)",
                                border: "1.5px solid #001a2e",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 900,
                                fontSize: 9,
                                color: "#FFF",
                                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                                boxShadow: "0 1px 4px rgba(0,229,255,0.4)",
                                pointerEvents: "none",
                              }}
                            >
                              {player.level}
                            </div>
                          </div>
                          {avatarUrl && (
                            <img src={avatarUrl} alt="avatar" onClick={() => setZoomModal({ src: avatarUrl, label: player.username || 'Player' })} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', marginRight: 6, cursor: 'pointer', border: player.is_vip ? `2px solid ${player.vip_frame_color}` : '2px solid #222', boxShadow: player.is_vip ? `0 0 8px ${player.vip_frame_color}88` : 'none' }} />
                          )}
                          <span style={{ color: player.is_vip ? player.vip_name_color : '#fff', textShadow: player.is_vip ? `0 0 8px ${player.vip_name_color}99` : 'none' }}>
                            {player.is_vip && <span style={{ marginRight: 4, fontSize: 13 }}>💎</span>}
                            {player.username || "Player"}
                          </span>
                          {isCurrentUser && <span style={{ color: "#00E5FF", marginLeft: 8 }}>({t('multiplayer.you')})</span>}
                        </td>
                        <td style={{ ...cellStyle, color: "#FFD700", fontWeight: 600 }}>
                          {player.level ?? 1}
                        </td>
                        <td style={{ ...cellStyle, color: "#00E5FF", fontSize: 12 }}
                          title={
                            isCurrentUser && userStats?.total_xp
                              ? userStats.total_xp.toLocaleString('pt-BR') + ' XP total (atualizado)'
                              : player.total_xp?.toLocaleString('pt-BR') + ' XP total'
                          }
                        >
                          {isCurrentUser && userStats?.total_xp !== undefined
                            ? userStats.total_xp.toLocaleString('pt-BR') + ' XP'
                            : player.total_xp?.toLocaleString('pt-BR') ?? 0 + ' XP'}
                        </td>
                        <td style={{ ...cellStyle, color: "#00FF00" }}>
                          {player.wins ?? 0}
                        </td>
                        <td style={{ ...cellStyle, color: "#FF4444" }}>
                          {player.losses ?? 0}
                        </td>
                        <td style={cellStyle}>
                          {(player.win_rate ?? 0).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {/* Linha do usuário logado se não está no top 10 */}
                  {(() => {
                    if (!currentUserId) return null;
                    const foundIndex = multiplayerData.findIndex(p => p.user_id === currentUserId);
                    if (foundIndex >= 0 && foundIndex < 10) return null; // já está no top 10
                    if (foundIndex === -1) return null; // não encontrado
                    const player = multiplayerData[foundIndex];
                    const tier = player.tier || 'Rookie';
                    const material = player.material || 'Bronze';
                    const tierUrl = `/game/images/ranks/${tier.toLowerCase()}/${tier.toLowerCase()}_${material.toLowerCase()}.png`;
                    const avatarPreset = player.avatar_preset || 'normal';
                    let avatarUrl = null;
                    // avatar_preset can be a full path (VIP custom) or a short preset key
                    if (avatarPreset.startsWith('/')) {
                      avatarUrl = avatarPreset;
                    } else if (avatarPreset === 'normal') avatarUrl = '/game/images/nave_normal.png';
                    else if (avatarPreset === 'protecao') avatarUrl = '/game/images/nave_protecao.png';
                    else if (avatarPreset === 'alcance') avatarUrl = '/game/images/nave_alcance.png';
                    else avatarUrl = '/game/images/nave_normal.png';
                    return (
                      <tr
                        key={currentUserId}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          background: "#003b5c",
                          outline: "2px solid #00E5FF",
                          boxShadow: "0 0 20px #00E5FF33",
                        }}
                      >
                        <td style={{ ...cellStyle, fontSize: 24, fontWeight: 900, color: "#00E5FF", textShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
                          {foundIndex + 1}
                        </td>
                        <td style={{ ...cellStyle, textAlign: "left", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img 
                              src={tierUrl} 
                              alt={`${tier} ${material}`} 
                              title={`${tier} ${material}`} 
                              style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain', background: '#181c22', border: '2px solid #222', cursor: 'pointer' }}
                              onClick={() => setZoomModal({ src: tierUrl, label: `${tier} ${material}`, level: player.level })}
                              onError={(e) => {
                                e.currentTarget.src = '/game/images/ranks/rookie/rookie_bronze.png';
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                top: -3,
                                right: -3,
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #00E5FF 0%, #0099CC 100%)",
                                border: "1.5px solid #001a2e",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 900,
                                fontSize: 9,
                                color: "#FFF",
                                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                                boxShadow: "0 1px 4px rgba(0,229,255,0.4)",
                                pointerEvents: "none",
                              }}
                            >
                              {player.level}
                            </div>
                          </div>
                          {avatarUrl && (
                            <img src={avatarUrl} alt="avatar" onClick={() => setZoomModal({ src: avatarUrl, label: player.username || 'Você' })} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', marginRight: 6, cursor: 'pointer', border: player.is_vip ? `2px solid ${player.vip_frame_color}` : '2px solid #222', boxShadow: player.is_vip ? `0 0 8px ${player.vip_frame_color}88` : 'none' }} />
                          )}
                          <span style={{ color: player.is_vip ? player.vip_name_color : '#fff', textShadow: player.is_vip ? `0 0 8px ${player.vip_name_color}99` : 'none' }}>
                            {player.is_vip && <span style={{ marginRight: 4, fontSize: 13 }}>💎</span>}
                            {player.username || "Você"}
                          </span>
                          <span style={{ color: "#00E5FF", marginLeft: 8 }}>({t('multiplayer.you')})</span>
                        </td>
                        <td style={{ ...cellStyle, color: "#FFD700", fontWeight: 600 }}>
                          {player.level ?? 1}
                        </td>
                        <td style={{ ...cellStyle, color: "#00E5FF", fontSize: 12 }}
                          title={player.total_xp?.toLocaleString('pt-BR') + ' XP total'}
                        >
                          {player.total_xp?.toLocaleString('pt-BR') ?? 0 + ' XP'}
                        </td>
                        <td style={{ ...cellStyle, color: "#00FF00" }}>
                          {player.wins ?? 0}
                        </td>
                        <td style={{ ...cellStyle, color: "#FF4444" }}>
                          {player.losses ?? 0}
                        </td>
                        <td style={cellStyle}>
                          {(player.win_rate ?? 0).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            </>
          )}

          {activeTab === "global" && (
            <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.6)" }}>
              <p style={{ fontSize: 18 }}>{t('ranking.globalComingSoon')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const headerStyle = {
  padding: "12px 8px",
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(255,255,255,0.6)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  textAlign: "center",
};

const cellStyle = {
  padding: "16px 8px",
  fontSize: 14,
  textAlign: "center",
  color: "#FFF",
  fontFamily: "'Orbitron', sans-serif",
};
