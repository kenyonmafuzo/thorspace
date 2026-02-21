"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ShotTypeModal from "../components/ShotTypeModal";
import { getLevelProgressFromTotalXp } from "@/lib/xpSystem";

/**
 * SHIPS_CONFIG — AAA Design Pattern
 * To add a new ship: push a new entry to this array. That's it.
 * Fields:
 *   id        — unique numeric id (used as ship slot)
 *   name      — display name
 *   desc      — short description shown in carousel
 *   image     — path to ship PNG in /public/game/images/
 *   isVip     — if true, shows VIP badge and requires VIP to select (future gate)
 */
const SHIPS_CONFIG = [
  {
    id: 1,
    name: "Corveta",
    desc: "Nave padrão. Balanceada e confiável.",
    image: "/game/images/nave_normal.png",
    isVip: false,
  },
  {
    id: 2,
    name: "Escudeira",
    desc: "Alta resistência. Lenta, quase indestrutível.",
    image: "/game/images/nave_protecao.png",
    isVip: false,
  },
  {
    id: 3,
    name: "Alcance VIP",
    desc: "Nave VIP — vermelho sangue. Alcance devastador.",
    image: "/game/images/nave_alcance_red_vip.png",
    isVip: true,
  },
  {
    id: 4,
    name: "Alcance VIP Blue",
    desc: "Nave VIP — azul gélido. Alcance máximo.",
    image: "/game/images/nave_alcance_vip.png",
    isVip: true,
  },
  // — Adicione novas naves aqui —
];

const PlayerStatsModal = dynamic(() => import("../components/PlayerStatsModal"), { ssr: false });

export default function SelectShipsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");

  const [loading, setLoading] = useState(true);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalTabMode, setStatsModalTabMode] = useState(false);

  // Shot Type selection state
  const [shotTypeModalOpen, setShotTypeModalOpen] = useState(false);
  const [currentShipIndex, setCurrentShipIndex] = useState(null);
  const [shotPreferences, setShotPreferences] = useState({
    "1": "plasma",
    "2": "plasma",
    "3": "plasma"
  });

  // VIP & level state
  const [isVip, setIsVip] = useState(false);
  const [userLevel, setUserLevel] = useState(1);

  // Ship carousel state
  const [selectedShipIdx, setSelectedShipIdx] = useState(0); // index in SHIPS_CONFIG

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

    const removeTabIndex = () => {
      document.querySelectorAll('button, [tabindex="0"]').forEach((el) => {
        el.setAttribute("tabindex", "-1");
      });
    };
    removeTabIndex();

    return () => {
      window.removeEventListener("keydown", handleTabDown, true);
      window.removeEventListener("keyup", handleTabUp, true);
    };
  }, [statsModalOpen]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        router.replace("/login");
        return;
      }

      // Load shot preferences + VIP + level from Supabase
      if (userId) {
        const [profileRes, progressRes] = await Promise.all([
          supabase.from("profiles").select("shot_preferences, is_vip, vip_expires_at").eq("id", userId).single().then(async r => {
            if (r.error) return supabase.from("profiles").select("shot_preferences, is_vip").eq("id", userId).single();
            return r;
          }),
          supabase.from("player_progress").select("total_xp").eq("user_id", userId).single()
        ]);

        const profileData = profileRes.data;
        if (profileData?.shot_preferences) {
          setShotPreferences(profileData.shot_preferences);
        }

        // VIP check: is_vip flag AND not expired
        const vipActive = profileData?.is_vip === true &&
          (!profileData?.vip_expires_at || new Date(profileData.vip_expires_at) > new Date());
        setIsVip(vipActive);
        // Store in localStorage for game (thor.html)
        if (typeof window !== "undefined") {
          localStorage.setItem("thor_is_vip", vipActive ? "true" : "false");
        }

        // Level from total_xp
        if (progressRes.data?.total_xp !== undefined) {
          const { level } = getLevelProgressFromTotalXp(progressRes.data.total_xp);
          setUserLevel(level);
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, [router, userId]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: "center", color: "#999" }}>Loading...</div>
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

  const handleShotTypeChange = async (shotType) => {
    // Use the currently selected ship index (SHIPS_CONFIG[selectedShipIdx].id)
    const shipId = SHIPS_CONFIG[selectedShipIdx]?.id ?? currentShipIndex;
    const newPreferences = { ...shotPreferences, [shipId.toString()]: shotType };
    setShotPreferences(newPreferences);

    // Save to Supabase
    if (userId) {
      await supabase
        .from("profiles")
        .update({ shot_preferences: newPreferences })
        .eq("id", userId);
    }
  };

  const handleReadyForBattle = () => {
    // Store shot preferences in localStorage for game to read
    if (typeof window !== "undefined") {
      localStorage.setItem("thor_shot_preferences", JSON.stringify(shotPreferences));
    }
    router.push(`/play/${matchId}`);
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>Select Your Ships</h1>
        <p style={subtitleStyle}>Match ID: {matchId || "N/A"}</p>

        {/* Ship Carousel */}
        <div style={carouselWrapStyle}>
          {/* Left Arrow */}
          <button
            onClick={() => setSelectedShipIdx(i => (i - 1 + SHIPS_CONFIG.length) % SHIPS_CONFIG.length)}
            style={arrowBtnStyle}
            aria-label="Nave anterior"
          >
            ←
          </button>

          {/* Ship Card */}
          {(() => {
            const ship = SHIPS_CONFIG[selectedShipIdx];
            const currentShotKey = ship.id.toString();
            const isLocked = ship.isVip && !isVip;
            return (
              <div style={{ ...shipCardStyle, opacity: isLocked ? 0.75 : 1 }}>
                {/* VIP tag — visible when user IS vip */}
                {ship.isVip && !isLocked && (
                  <div style={vipTagStyle}>💎 VIP</div>
                )}
                {/* Lock overlay — visible when user is NOT vip */}
                {isLocked && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: 16,
                    background: "rgba(0,0,0,0.62)",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 8,
                    zIndex: 5,
                  }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="11" width="14" height="10" rx="2" stroke="#FFD700" strokeWidth="2"/>
                      <path d="M8 11V7a4 4 0 118 0v4" stroke="#FFD700" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize: 11, fontWeight: 900, color: "#FFD700", fontFamily: "'Orbitron',sans-serif", letterSpacing: 1 }}>💎 EXCLUSIVO VIP</span>
                  </div>
                )}
                <img
                  src={ship.image}
                  alt={ship.name}
                  style={{ width: 120, height: 120, objectFit: "contain", filter: isLocked ? "grayscale(1) brightness(0.4)" : "drop-shadow(0 0 16px #00E5FF88)" }}
                  onError={e => { e.currentTarget.style.opacity = "0.3"; }}
                />
                <div style={{ color: isLocked ? "#555" : "#00E5FF", fontWeight: 700, fontSize: 18, fontFamily: "'Orbitron',sans-serif", marginTop: 12 }}>
                  {ship.name}
                </div>
                <div style={{ color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                  {ship.desc}
                </div>
                {!isLocked && (
                <div style={{ color: "#555", fontSize: 11, marginTop: 8, fontFamily: "'Orbitron',sans-serif" }}>
                  Tiro: <span style={{ color: "#00E5FF" }}>{(shotPreferences[currentShotKey] || "plasma").toUpperCase()}</span>
                </div>
                )}

                {/* Dots indicator */}
                <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
                  {SHIPS_CONFIG.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedShipIdx(i)}
                      style={{
                        width: i === selectedShipIdx ? 18 : 8,
                        height: 8,
                        borderRadius: 4,
                        background: i === selectedShipIdx ? "#00E5FF" : "rgba(0,229,255,0.2)",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Right Arrow */}
          <button
            onClick={() => setSelectedShipIdx(i => (i + 1) % SHIPS_CONFIG.length)}
            style={arrowBtnStyle}
            aria-label="Próxima nave"
          >
            →
          </button>
        </div>

        {/* Shot Type Modal Trigger — hidden for locked VIP ships */}
        {!(SHIPS_CONFIG[selectedShipIdx]?.isVip && !isVip) && (
        <button
          onClick={() => {
            const ship = SHIPS_CONFIG[selectedShipIdx];
            setCurrentShipIndex(ship.id);
            setShotTypeModalOpen(true);
          }}
          style={shotTypeButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,229,255,0.5)';
            e.currentTarget.style.borderColor = '#00E5FF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,229,255,0.3)';
            e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)';
          }}
        >
          🎨 Trocar Tipo de Tiro
        </button>
        )}

        <button onClick={() => router.push("/multiplayer")} style={backButtonStyle}>
          ← Back to Multiplayer Hub
        </button>
      </div>

      {/* Shot Type Modal */}
      <ShotTypeModal
        open={shotTypeModalOpen}
        onClose={() => setShotTypeModalOpen(false)}
        shipIndex={currentShipIndex}
        currentShotType={currentShipIndex ? shotPreferences[currentShipIndex.toString()] : 'plasma'}
        onConfirm={handleShotTypeChange}
        isVip={isVip}
        userLevel={userLevel}
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

const pageStyle = {
  width: "100%",
  minHeight: "100vh",
  background: "radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const containerStyle = {
  maxWidth: 800,
  width: "100%",
  background: "rgba(0, 0, 0, 0.4)",
  border: "1px solid rgba(0, 229, 255, 0.3)",
  borderRadius: 16,
  padding: 40,
  textAlign: "center",
};

const titleStyle = {
  margin: 0,
  fontSize: 32,
  fontWeight: 700,
  color: "#00E5FF",
  textShadow: "0 0 20px rgba(0, 229, 255, 0.5)",
  marginBottom: 10,
};

const subtitleStyle = {
  margin: 0,
  fontSize: 14,
  color: "#888",
  marginBottom: 40,
};

const contentStyle = {
  padding: 40,
  background: "rgba(255, 255, 255, 0.02)",
  borderRadius: 12,
  marginBottom: 30,
};

const shotTypeButtonStyle = {
  width: '100%',
  padding: '16px 32px',
  marginBottom: 20,
  background: 'rgba(0,229,255,0.1)',
  border: '2px solid rgba(0,229,255,0.4)',
  borderRadius: 12,
  color: '#00E5FF',
  fontSize: 16,
  fontWeight: 700,
  fontFamily: "'Orbitron', sans-serif",
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'translateY(0)',
  boxShadow: '0 4px 12px rgba(0,229,255,0.3)',
  letterSpacing: 1
};

const backButtonStyle = {
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 600,
  color: "#FFF",
  background: "rgba(255, 255, 255, 0.1)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: 8,
  cursor: "pointer",
  transition: "all 0.2s",
};

const carouselWrapStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 20,
  marginBottom: 28,
};

const shipCardStyle = {
  flex: 1,
  maxWidth: 280,
  background: "rgba(0,229,255,0.05)",
  border: "1px solid rgba(0,229,255,0.2)",
  borderRadius: 16,
  padding: "28px 20px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  minHeight: 280,
};

const arrowBtnStyle = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  background: "rgba(0,229,255,0.1)",
  border: "2px solid rgba(0,229,255,0.3)",
  color: "#00E5FF",
  fontSize: 22,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "all 0.2s",
};

const vipTagStyle = {
  position: "absolute",
  top: 12,
  right: 12,
  fontSize: 10,
  fontWeight: 900,
  padding: "3px 8px",
  borderRadius: 20,
  background: "rgba(255,215,0,0.15)",
  border: "1px solid rgba(255,215,0,0.5)",
  color: "#FFD700",
  fontFamily: "'Orbitron', sans-serif",
  letterSpacing: 1,
};
