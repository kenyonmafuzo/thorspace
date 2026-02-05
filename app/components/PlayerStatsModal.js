"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getLevelFromTotalXp, formatRankDisplay, getRankAssetKey } from "@/lib/xpSystem";

export default function PlayerStatsModal({ open, onClose, userId, username, tabMode = false }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    setError("");
    setProfile(null);
    (async () => {
      try {
        // Fetch profile, stats, and progress
        const [profileRes, statsRes, progressRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, username, avatar_preset")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("player_stats")
            .select("matches_played, wins, draws, losses, ships_destroyed, ships_lost")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("player_progress")
            .select("total_xp")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

        if (profileRes.error || statsRes.error || progressRes.error) {
          setError("Erro ao carregar stats do jogador.");
          setLoading(false);
          return;
        }

        const stats = statsRes.data || {};
        const progress = progressRes.data || { total_xp: 0 };
        const rankInfo = getLevelFromTotalXp(progress.total_xp || 0);
        setProfile({
          ...profileRes.data,
          ...stats,
          total_xp: progress.total_xp || 0,
          rankInfo,
        });
        setLoading(false);
      } catch (e) {
        setError("Erro inesperado ao carregar stats.");
        setLoading(false);
      }
    })();
  }, [open, userId]);

  if (!open) return null;

  // Close on overlay click (só se não for tabMode)
  const handleOverlayClick = (e) => {
    if (tabMode) return;
    if (e.target === e.currentTarget) onClose();
  };

  // Overlay e modal: estilos condicionais para tabMode
  const overlayCustomStyle = tabMode
    ? { ...overlayStyle, background: "none", backdropFilter: "none" }
    : overlayStyle;
  const modalCustomStyle = tabMode
    ? { ...modalStyle, background: "rgba(10,14,39,0.7)", border: "2px solid #00E5FF" }
    : modalStyle;

  return (
    <div style={overlayCustomStyle} onClick={handleOverlayClick}>
      <div style={modalCustomStyle}>
        <div style={headerStyle}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#00E5FF" }}>
            {username || "Player"}
          </span>
          {!tabMode && (
            <button onClick={onClose} style={closeButtonStyle}>&times;</button>
          )}
        </div>
        <div style={bodyStyle}>
          {loading ? (
            <p style={{ color: "#FFF", textAlign: "center" }}>Carregando...</p>
          ) : error ? (
            <p style={{ color: "#FF6B6B", textAlign: "center" }}>{error}</p>
          ) : profile ? (
            <>
              <div
                style={
                  tabMode
                    ? {
                        display: "flex",
                        alignItems: "center",
                        gap: 28,
                        marginBottom: 32,
                        justifyContent: "center",
                        padding: "8px 0 0 0",
                      }
                    : {
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        marginBottom: 20,
                        justifyContent: "center",
                      }
                }
              >
                <img
                  src={getRankAssetKey(profile.rankInfo?.tier ?? 1, profile.rankInfo?.subTier ?? 1)}
                  alt="Rank"
                  style={
                    tabMode
                      ? { width: 120, height: 120, objectFit: "contain", filter: "drop-shadow(0 0 16px #00E5FF88)" }
                      : { width: 48, height: 48, objectFit: "contain" }
                  }
                  onError={e => {
                    const src = e.target.src;
                    if (src.endsWith('.png')) e.target.src = src.replace('.png', '.svg');
                  }}
                />
                <div style={tabMode ? { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 } : {}}>
                  <div
                    style={
                      tabMode
                        ? { fontSize: 22, color: "#FFD700", fontWeight: 800, letterSpacing: 1, lineHeight: 1.1, textShadow: "0 2px 8px #000" }
                        : { fontSize: 14, color: "#FFD700" }
                    }
                  >
                    {formatRankDisplay(profile.rankInfo?.tier ?? 1, profile.rankInfo?.subTier ?? 1)}
                  </div>
                  <div
                    style={
                      tabMode
                        ? { fontSize: 18, color: "#00E5FF", fontWeight: 700, marginTop: 2, textShadow: "0 2px 8px #000" }
                        : { fontSize: 12, color: "#00E5FF" }
                    }
                  >
                    XP: {(profile.total_xp ?? 0).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <Stat label="Partidas" value={profile.matches_played} color="#FFD700" />
                <Stat label="Vitórias" value={profile.wins} color="#00FF00" />
                <Stat label="Empates" value={profile.draws} color="#00E5FF" />
                <Stat label="Derrotas" value={profile.losses} color="#FF4444" />
                <Stat label="Naves Destr." value={profile.ships_destroyed} color="#00FF00" />
                <Stat label="Naves Perdidas" value={profile.ships_lost} color="#FF8800" />
              </div>
              {!tabMode && (
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button style={challengeButtonStyle}>Desafiar</button>
                  <button style={reportButtonStyle}>Reportar</button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 10, textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#00E5FF" }}>{Number(value ?? 0)}</div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999,
  backdropFilter: "blur(4px)",
};

const modalStyle = {
  width: "90%",
  maxWidth: 400,
  background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)",
  border: "2px solid #00E5FF",
  borderRadius: 16,
  boxShadow: "0 0 40px rgba(0, 229, 255, 0.3)",
  overflow: "hidden",
  animation: "slideIn 0.3s ease-out",
};

const headerStyle = {
  padding: "20px 24px",
  background: "rgba(0, 229, 255, 0.1)",
}
const closeButtonStyle = {
  background: "none",
  border: "none",
  color: "#FFF",
  fontSize: 28,
  fontWeight: 700,
  cursor: "pointer",
  lineHeight: 1,
  marginLeft: 12,
  marginTop: -4,
};

const bodyStyle = {
  padding: "24px",
  textAlign: "center",
};

const challengeButtonStyle = {
  background: "linear-gradient(90deg, #00E5FF, #0072FF)",
  color: "#001018",
  border: "none",
  borderRadius: 8,
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Orbitron',sans-serif",
};

const reportButtonStyle = {
  background: "rgba(255, 80, 80, 0.2)",
  color: "#FF5050",
  border: "none",
  borderRadius: 8,
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Orbitron',sans-serif",
};
