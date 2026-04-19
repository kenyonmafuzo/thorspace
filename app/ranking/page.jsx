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
  const [mainTab, setMainTab] = useState("geral");
  const [confrontosFilter, setConfrontosFilter] = useState("recentes");
  const [confrontosSearch, setConfrontosSearch] = useState("");
  const [selectedConfronto, setSelectedConfronto] = useState(null);
  const [confrontosData, setConfrontosData] = useState([]);
  const [loadingConfrontos, setLoadingConfrontos] = useState(false);

  function formatRelativeDate(date) {
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'hoje';
    if (days === 1) return 'há 1 dia';
    if (days < 7) return `há ${days} dias`;
    if (days < 14) return 'há 1 semana';
    if (days < 30) return `há ${Math.floor(days / 7)} semanas`;
    return date.toLocaleDateString('pt-BR');
  }

  function resolveAvatarUrl(avatarPreset) {
    if (!avatarPreset) return '/game/images/nave_normal.png';
    if (avatarPreset.startsWith('/')) return avatarPreset;
    if (avatarPreset === 'protecao') return '/game/images/nave_protecao.png';
    if (avatarPreset === 'alcance') return '/game/images/nave_alcance.png';
    return '/game/images/nave_normal.png';
  }

  async function loadConfrontos(userId) {
    setLoadingConfrontos(true);
    try {
      // Query uses winner_id/loser_id which always exist.
      // After applying 20260419_draw_support.sql, also include player1_id/player2_id for draws.
      const { data: results, error } = await supabase
        .from('match_results')
        .select('match_id, winner_id, loser_id, winner_score, loser_score, processed_at, player1_id, player2_id, is_draw')
        .or(`winner_id.eq.${userId},loser_id.eq.${userId}`)
        .order('processed_at', { ascending: false });

      if (error || !results?.length) {
        setConfrontosData([]);
        return;
      }

      // Identify opponents — handle both draws (player1/player2) and normal results
      const opponentIds = [...new Set(results.map(r => {
        if (r.is_draw && r.player1_id && r.player2_id) {
          return r.player1_id === userId ? r.player2_id : r.player1_id;
        }
        if (r.winner_id === userId) return r.loser_id;
        if (r.loser_id === userId) return r.winner_id;
        return null;
      }).filter(Boolean))];

      if (!opponentIds.length) {
        setConfrontosData([]);
        return;
      }

      const [{ data: profiles }, { data: progressData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, avatar_preset, is_vip, vip_name_color, vip_frame_color')
          .in('id', opponentIds),
        supabase
          .from('player_progress')
          .select('user_id, total_xp')
          .in('user_id', opponentIds),
      ]);

      const profileMap = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
      const progressMap = {};
      (progressData || []).forEach(p => { progressMap[p.user_id] = p; });

      // Agrupar por oponente — suporte completo a vitória, derrota e empate
      const h2hMap = {};
      results.forEach(r => {
        const isDraw = r.is_draw;
        const opponentId = isDraw
          ? (r.player1_id === userId ? r.player2_id : r.player1_id)
          : (r.winner_id === userId ? r.loser_id : r.winner_id);
        if (!opponentId) return;

        // Para empates: winner_score = player1 kills, loser_score = player2 kills
        const iAmPlayer1 = r.player1_id === userId;
        let myScore, oppScore, result; // result: 'win' | 'loss' | 'draw'
        if (isDraw) {
          myScore  = iAmPlayer1 ? r.winner_score : r.loser_score;
          oppScore = iAmPlayer1 ? r.loser_score  : r.winner_score;
          result = 'draw';
        } else {
          const iWon = r.winner_id === userId;
          myScore  = iWon ? r.winner_score : r.loser_score;
          oppScore = iWon ? r.loser_score  : r.winner_score;
          result = iWon ? 'win' : 'loss';
        }

        if (!h2hMap[opponentId]) {
          h2hMap[opponentId] = { opponentId, matches: [], youWins: 0, opponentWins: 0, draws: 0 };
        }
        h2hMap[opponentId].matches.push({ date: r.processed_at, myScore, oppScore, result });
        if (result === 'win')       h2hMap[opponentId].youWins++;
        else if (result === 'loss') h2hMap[opponentId].opponentWins++;
        else                        h2hMap[opponentId].draws++;
      });

      const data = Object.values(h2hMap).map(h2h => {
        const profile = profileMap[h2h.opponentId] || {};
        const progress = progressMap[h2h.opponentId] || {};
        const total_xp = Number(progress.total_xp ?? 0);
        const calcProg = getLevelProgressFromTotalXp(total_xp);

        const sortedMatches = [...h2h.matches].sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastMatch = sortedMatches[0];
        const lastFive = sortedMatches.slice(0, 5);

        const avgScoreYou = Math.round(h2h.matches.reduce((s, m) => s + (m.myScore || 0), 0) / h2h.matches.length);
        const avgScoreOpp = Math.round(h2h.matches.reduce((s, m) => s + (m.oppScore || 0), 0) / h2h.matches.length);

        // Melhor sequência de vitórias consecutivas
        let bestStreak = 0, curStreak = 0;
        sortedMatches.forEach(m => {
          if (m.result === 'win') { curStreak++; bestStreak = Math.max(bestStreak, curStreak); }
          else curStreak = 0;
        });

        const lastDate = lastMatch ? new Date(lastMatch.date) : null;
        const lastResultLabel = lastMatch
          ? `${lastMatch.myScore ?? 0} x ${lastMatch.oppScore ?? 0}${lastMatch.result === 'draw' ? ' (E)' : ''}`
          : null;

        return {
          opponentId: h2h.opponentId,
          name: profile.username || 'Jogador',
          avatar: resolveAvatarUrl(profile.avatar_preset),
          tier: calcProg.tier?.toLowerCase() || 'rookie',
          material: calcProg.material?.toLowerCase() || 'bronze',
          rank: `${calcProg.tier} ${calcProg.material}`,
          partidas: h2h.matches.length,
          youWins: h2h.youWins,
          opponentWins: h2h.opponentWins,
          draws: h2h.draws,
          lastMatchLabel: lastDate ? formatRelativeDate(lastDate) : null,
          lastMatchTimestamp: lastDate ? lastDate.getTime() : 0,
          winrate: h2h.matches.length > 0 ? (h2h.youWins / h2h.matches.length) * 100 : 0,
          lastResults: lastFive.map(m => ({ myScore: m.myScore ?? 0, oppScore: m.oppScore ?? 0, result: m.result })),
          avgScoreYou,
          avgScoreOpp,
          bestStreak,
          lastEncounterDate: lastDate ? lastDate.toLocaleDateString('pt-BR') : null,
          lastEncounterResult: lastResultLabel,
          is_vip: profile.is_vip || false,
          vip_name_color: profile.vip_name_color || '#FFD700',
          vip_frame_color: profile.vip_frame_color || '#FFD700',
        };
      });

      setConfrontosData(data);
    } catch (err) {
      console.error('[loadConfrontos]', err);
      setConfrontosData([]);
    } finally {
      setLoadingConfrontos(false);
    }
  }

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
      loadConfrontos(session.user.id);
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
    <div style={{ overflowX: 'hidden' }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)", backgroundSize: "cover, cover", backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center center, center center", opacity: 0.35, pointerEvents: "none" }} />
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        @media (max-width: 768px) {
          .rank-main-container { margin-top: 220px !important; }
          .rank-table-wrap { display: none !important; }
          .rank-cards-mobile { display: block !important; }
        }
        @media (min-width: 769px) {
          .rank-cards-mobile { display: none !important; }
        }
        @keyframes confrontosFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .confrontos-section { animation: confrontosFadeIn 0.25s ease; }
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
      <div className="rank-main-container" style={{ maxWidth: 900, margin: '120px auto 0 auto', padding: '0 16px 60px', position: 'relative', zIndex: 1 }}>
        <div style={{ padding: "0 0 24px 0", width: "100%", margin: 0, position: "relative", zIndex: 1 }}>
          <h2 style={{
            margin: 0,
            marginBottom: 20,
            fontSize: 28,
            fontWeight: 800,
            color: "#00E5FF",
            fontFamily: "'Orbitron',sans-serif",
            letterSpacing: 1,
          }}>Ranking</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { key: 'geral', label: 'Ranking Geral' },
              { key: 'confrontos', label: 'Confrontos Diretos' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setMainTab(tab.key); setSelectedConfronto(null); }}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: mainTab === tab.key ? '1.5px solid #00E5FF' : '1.5px solid rgba(255,255,255,0.15)',
                  background: mainTab === tab.key ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.04)',
                  color: mainTab === tab.key ? '#00E5FF' : 'rgba(255,255,255,0.6)',
                  fontFamily: "'Orbitron',sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: 0.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {mainTab === 'geral' && (
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
            <div className="rank-cards-mobile" style={{ display: 'none' }}>
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
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, paddingLeft: 34, flexWrap: 'wrap', alignItems: 'center', fontFamily: "'Orbitron',sans-serif" }}>
                      <span style={{ color: '#FFD700' }}>Lv {player.level}</span>
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
                        <td style={{ ...cellStyle, textAlign: "left", fontWeight: isCurrentUser ? 600 : 400, fontFamily: "'Orbitron', sans-serif" }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                          </div>
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
                        <td style={{ ...cellStyle, textAlign: "left", fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Orbitron', sans-serif" }}>
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
                          </div>
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
        )}

        {mainTab === 'confrontos' && (
          <div className="confrontos-section" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 24, backdropFilter: 'blur(10px)' }}>
            {!selectedConfronto ? (
              <>
                {/* Search */}
                <div style={{ marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder="Buscar jogador..."
                    value={confrontosSearch}
                    onChange={e => setConfrontosSearch(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1.5px solid rgba(0,229,255,0.25)',
                      borderRadius: 8, padding: '10px 16px',
                      color: '#fff', fontSize: 13,
                      fontFamily: "'Orbitron',sans-serif",
                      outline: 'none',
                    }}
                  />
                </div>
                {/* Filter chips */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  {[
                    { key: 'recentes', label: 'Recentes' },
                    { key: 'mais_enfrentados', label: 'Mais enfrentados' },
                    { key: 'rivalidades', label: 'Maiores rivalidades' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setConfrontosFilter(f.key)}
                      style={{
                        padding: '5px 14px',
                        borderRadius: 20,
                        border: confrontosFilter === f.key ? '1.5px solid #00E5FF' : '1.5px solid rgba(255,255,255,0.15)',
                        background: confrontosFilter === f.key ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.04)',
                        color: confrontosFilter === f.key ? '#00E5FF' : 'rgba(255,255,255,0.5)',
                        fontFamily: "'Orbitron',sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        letterSpacing: 0.3,
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {/* Cards */}
                {loadingConfrontos ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)', fontFamily: "'Orbitron',sans-serif", fontSize: 13 }}>Carregando confrontos...</div>
                ) : (() => {
                  const filtered = confrontosData
                    .filter(p => p.name.toLowerCase().includes(confrontosSearch.toLowerCase()))
                    .slice();

                  if (confrontosFilter === 'recentes') {
                    filtered.sort((a, b) => b.lastMatchTimestamp - a.lastMatchTimestamp);
                  } else if (confrontosFilter === 'mais_enfrentados') {
                    filtered.sort((a, b) => b.partidas - a.partidas);
                  } else if (confrontosFilter === 'rivalidades') {
                    // Maiores rivalidades = mais equilibrado (menor diferença) com mais partidas
                    filtered.sort((a, b) => {
                      const diffA = Math.abs(a.youWins - a.opponentWins);
                      const diffB = Math.abs(b.youWins - b.opponentWins);
                      if (diffA !== diffB) return diffA - diffB;
                      return b.partidas - a.partidas;
                    });
                  }

                  if (!filtered.length) {
                    return (
                      <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.35)', fontFamily: "'Orbitron',sans-serif", fontSize: 13 }}>
                        Nenhum confronto encontrado.
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {filtered.map(player => {
                        const tierUrl = `/game/images/ranks/${player.tier}/${player.tier}_${player.material}.png`;
                        const isWinning = player.youWins > player.opponentWins;
                        const isTied = player.youWins === player.opponentWins;
                        return (
                          <div
                            key={player.opponentId}
                            onClick={() => setSelectedConfronto(player)}
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1.5px solid rgba(255,255,255,0.1)',
                              borderRadius: 12,
                              padding: '14px 18px',
                              cursor: 'pointer',
                              transition: 'border-color 0.2s, background 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 14,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)';
                              e.currentTarget.style.background = 'rgba(0,229,255,0.06)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            }}
                          >
                            <img
                              src={player.avatar}
                              alt={player.name}
                              style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: player.is_vip ? `2px solid ${player.vip_frame_color}` : '2px solid rgba(0,229,255,0.3)', flexShrink: 0 }}
                              onError={e => { e.currentTarget.src = '/game/images/nave_normal.png'; }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <span style={{ color: player.is_vip ? player.vip_name_color : '#fff', fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 14 }}>
                                  {player.is_vip && <span style={{ marginRight: 3, fontSize: 11 }}>💎</span>}
                                  {player.name}
                                </span>
                                <img src={tierUrl} alt={player.rank} style={{ width: 18, height: 18, objectFit: 'contain' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: "'Orbitron',sans-serif" }}>{player.rank}</span>
                              </div>
                              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: "'Orbitron',sans-serif", marginBottom: 6 }}>
                                {player.partidas} partidas
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: '#00FF00', fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 13 }}>Você {player.youWins}</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>x</span>
                                <span style={{ color: '#FF4444', fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 13 }}>{player.opponentWins}</span>
                                {player.draws > 0 && (
                                  <span style={{ color: '#FFD700', fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 11, marginLeft: 2 }}>({player.draws}E)</span>
                                )}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: 12,
                                background: isWinning ? 'rgba(0,255,0,0.12)' : isTied ? 'rgba(255,200,0,0.12)' : 'rgba(255,68,68,0.12)',
                                border: `1px solid ${isWinning ? 'rgba(0,255,0,0.3)' : isTied ? 'rgba(255,200,0,0.3)' : 'rgba(255,68,68,0.3)'}`,
                                color: isWinning ? '#00FF00' : isTied ? '#FFD700' : '#FF4444',
                                fontSize: 10,
                                fontFamily: "'Orbitron',sans-serif",
                                fontWeight: 700,
                                marginBottom: 8,
                              }}>
                                {isWinning ? 'Vencendo' : isTied ? 'Empatado' : 'Perdendo'}
                              </div>
                              {player.lastMatchLabel && (
                                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: "'Orbitron',sans-serif" }}>
                                  Última: {player.lastMatchLabel}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            ) : (
              /* ── Stats Panel ── */
              <div>
                <button
                  onClick={() => setSelectedConfronto(null)}
                  style={{
                    background: 'none',
                    border: '1.5px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: "'Orbitron',sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '6px 14px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    letterSpacing: 0.3,
                  }}
                >
                  ← Voltar
                </button>
                {/* Player header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: 16, background: 'rgba(0,229,255,0.05)', borderRadius: 12, border: '1px solid rgba(0,229,255,0.15)' }}>
                  <img
                    src={selectedConfronto.avatar}
                    alt={selectedConfronto.name}
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: selectedConfronto.is_vip ? `2px solid ${selectedConfronto.vip_frame_color}` : '2px solid rgba(0,229,255,0.4)' }}
                    onError={e => { e.currentTarget.src = '/game/images/nave_normal.png'; }}
                  />
                  <div>
                    <div style={{ color: selectedConfronto.is_vip ? selectedConfronto.vip_name_color : '#00E5FF', fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: 18 }}>
                      {selectedConfronto.is_vip && <span style={{ marginRight: 4 }}>💎</span>}
                      {selectedConfronto.name}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Orbitron',sans-serif", fontSize: 12, marginTop: 2 }}>{selectedConfronto.rank} • {selectedConfronto.partidas} partidas</div>
                  </div>
                </div>
                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(0,255,0,0.06)', border: '1px solid rgba(0,255,0,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: "'Orbitron',sans-serif", letterSpacing: 0.5, marginBottom: 8 }}>CONFRONTO DIRETO</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                      <span style={{ color: '#00FF00', fontSize: 22, fontWeight: 900, fontFamily: "'Orbitron',sans-serif" }}>{selectedConfronto.youWins}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>–</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>x</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>–</span>
                      <span style={{ color: '#FF4444', fontSize: 22, fontWeight: 900, fontFamily: "'Orbitron',sans-serif" }}>{selectedConfronto.opponentWins}</span>
                    </div>
                    {selectedConfronto.draws > 0 && (
                      <div style={{ color: '#FFD700', fontSize: 12, fontFamily: "'Orbitron',sans-serif", fontWeight: 700, marginBottom: 2 }}>{selectedConfronto.draws} empate{selectedConfronto.draws > 1 ? 's' : ''}</div>
                    )}
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: "'Orbitron',sans-serif", marginTop: 2 }}>Você x Oponente</div>
                  </div>
                  <div style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: "'Orbitron',sans-serif", letterSpacing: 0.5, marginBottom: 8 }}>WINRATE</div>
                    <div style={{ color: '#00E5FF', fontSize: 24, fontWeight: 900, fontFamily: "'Orbitron',sans-serif" }}>{selectedConfronto.winrate.toFixed(1)}%</div>
                  </div>
                  <div style={{ background: 'rgba(255,165,0,0.06)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: "'Orbitron',sans-serif", letterSpacing: 0.5, marginBottom: 8 }}>SCORE MÉDIO</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ color: '#FFA500', fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron',sans-serif" }}>{selectedConfronto.avgScoreYou}</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>x</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron',sans-serif" }}>{selectedConfronto.avgScoreOpp}</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: "'Orbitron',sans-serif", marginTop: 4 }}>kills por partida</div>
                  </div>
                  <div style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: "'Orbitron',sans-serif", letterSpacing: 0.5, marginBottom: 8 }}>MELHOR SEQUÊNCIA</div>
                    <div style={{ color: '#FFD700', fontSize: 24, fontWeight: 900, fontFamily: "'Orbitron',sans-serif" }}>{selectedConfronto.bestStreak}x</div>
                  </div>
                </div>
                {/* Últimos resultados */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: "'Orbitron',sans-serif", letterSpacing: 0.5, marginBottom: 10 }}>ÚLTIMOS RESULTADOS</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedConfronto.lastResults.map((r, i) => {
                      const isW = r.result === 'win';
                      const isD = r.result === 'draw';
                      const bg    = isD ? 'rgba(255,215,0,0.12)' : isW ? 'rgba(0,255,0,0.12)'  : 'rgba(255,68,68,0.12)';
                      const bdr   = isD ? 'rgba(255,215,0,0.35)' : isW ? 'rgba(0,255,0,0.35)'  : 'rgba(255,68,68,0.35)';
                      const color = isD ? '#FFD700'              : isW ? '#00FF00'             : '#FF4444';
                      return (
                      <div key={i} style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: bg,
                        border: `1.5px solid ${bdr}`,
                        color,
                        fontFamily: "'Orbitron',sans-serif",
                        fontWeight: 700,
                        fontSize: 12,
                        minWidth: 44,
                        textAlign: 'center',
                      }}>
                        {r.myScore} x {r.oppScore}
                      </div>
                      );
                    })}
                  </div>
                </div>
                {/* Último encontro */}
                {selectedConfronto.lastEncounterDate && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: "'Orbitron',sans-serif", letterSpacing: 0.5, marginBottom: 6 }}>ÚLTIMO ENCONTRO</div>
                    <div style={{ color: '#fff', fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 600 }}>
                      {selectedConfronto.lastEncounterDate}
                      {selectedConfronto.lastEncounterResult && (
                        <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400, fontSize: 12, marginLeft: 10 }}>
                          • {selectedConfronto.lastEncounterResult}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {/* Compartilhar */}
                <button
                  onClick={() => {
                    const text = `Confronto direto vs ${selectedConfronto.name}\nVocê ${selectedConfronto.youWins} x ${selectedConfronto.opponentWins}\nWinrate: ${selectedConfronto.winrate.toFixed(1)}%\nMelhor sequência: ${selectedConfronto.bestStreak}x${selectedConfronto.lastEncounterDate ? `\nÚltimo encontro: ${selectedConfronto.lastEncounterDate} • ${selectedConfronto.lastEncounterResult}` : ''}`;
                    if (navigator.share) {
                      navigator.share({ title: 'Confronto Direto - ThorSpace', text });
                    } else {
                      navigator.clipboard.writeText(text).then(() => alert('Stats copiados!'));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(0,229,255,0.4)',
                    background: 'rgba(0,229,255,0.1)',
                    color: '#00E5FF',
                    fontFamily: "'Orbitron',sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    letterSpacing: 0.5,
                  }}
                >
                  ⬆ Compartilhar Stats
                </button>
              </div>
            )}
          </div>
        )}
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
