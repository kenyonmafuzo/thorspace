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

// ─── Tutorial modal shown once per session ──────────────────────────────────
function TutorialModal({ onClose }) {
  return (
    <div style={tutorialOverlayStyle}>
      <div style={tutorialBoxStyle}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
        <h2 style={{ margin: "0 0 12px", color: "#00E5FF", fontFamily: "'Orbitron',sans-serif", fontSize: 20, letterSpacing: 1 }}>
          Monte sua Esquadrilha
        </h2>
        <p style={{ margin: "0 0 10px", color: "#ccc", fontSize: 15, lineHeight: 1.6 }}>
          Você precisa escolher <strong style={{ color: "#00E5FF" }}>3 naves</strong> para entrar na batalha.
        </p>
        <p style={{ margin: "0 0 10px", color: "#ccc", fontSize: 15, lineHeight: 1.6 }}>
          Navegue pelo carrossel e <strong style={{ color: "#FFD700" }}>clique na nave</strong> que deseja adicionar.
          Um menu abrirá para você escolher o <strong style={{ color: "#FFD700" }}>tipo de tiro</strong> antes de confirmar.
        </p>
        <p style={{ margin: "0 0 24px", color: "#888", fontSize: 13, lineHeight: 1.6 }}>
          Pode repetir a mesma nave nos três slots se quiser. Cada slot pode ter um tipo de tiro diferente.
        </p>
        <button
          onClick={onClose}
          style={tutorialBtnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = "#00E5FF"; e.currentTarget.style.color = "#000"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#00E5FF"; }}
        >
          Entendi!
        </button>
      </div>
    </div>
  );
}

export default function SelectShipsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");

  const [loading, setLoading] = useState(true);
  // Show tutorial on every page load (sessionStorage cleared on mount so it always fires)
  const [tutorialOpen, setTutorialOpen] = useState(true);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalTabMode, setStatsModalTabMode] = useState(false);

  // Shot Type modal state
  const [shotTypeModalOpen, setShotTypeModalOpen] = useState(false);
  // Ship being configured when ShotTypeModal opens (from carousel click)
  const [pendingShipConfig, setPendingShipConfig] = useState(null);

  // 3 squad slots: each null or { shipConfig, shotType }
  const [slots, setSlots] = useState([null, null, null]);

  // VIP & level state
  const [isVip, setIsVip] = useState(false);
  const [userLevel, setUserLevel] = useState(1);

  // Ship carousel state
  const [selectedShipIdx, setSelectedShipIdx] = useState(0);

  const userId = typeof window !== "undefined" ? localStorage.getItem("thor_user_id") : null;
  const username = typeof window !== "undefined" ? localStorage.getItem("thor_username") : "";

  const handleCloseTutorial = () => {
    setTutorialOpen(false);
  };

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

      // Load VIP + level from Supabase
      if (userId) {
        const [profileRes, progressRes] = await Promise.all([
          supabase.from("profiles").select("is_vip, vip_expires_at").eq("id", userId).single().then(async r => {
            if (r.error) return supabase.from("profiles").select("is_vip").eq("id", userId).single();
            return r;
          }),
          supabase.from("player_progress").select("total_xp").eq("user_id", userId).single()
        ]);

        const profileData = profileRes.data;

        // VIP check: is_vip flag AND not expired
        const vipActive = profileData?.is_vip === true &&
          (!profileData?.vip_expires_at || new Date(profileData.vip_expires_at) > new Date());
        setIsVip(vipActive);
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
        {tutorialOpen && <TutorialModal onClose={handleCloseTutorial} />}
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

  // ── Click on ship card in carousel ──────────────────────────────────────────
  const handleShipClick = (ship) => {
    const isLocked = ship.isVip && !isVip;
    if (isLocked) return;
    const filledCount = slots.filter(Boolean).length;
    if (filledCount >= 3) return; // all slots full — user must remove one first
    setPendingShipConfig(ship);
    setShotTypeModalOpen(true);
  };

  // ── ShotTypeModal confirmed ──────────────────────────────────────────────────
  const handleShotConfirm = async (shotType) => {
    if (!pendingShipConfig) return;
    const firstEmpty = slots.findIndex(s => s === null);
    if (firstEmpty === -1) return;

    const newSlots = [...slots];
    newSlots[firstEmpty] = { shipConfig: pendingShipConfig, shotType };
    setSlots(newSlots);
    setPendingShipConfig(null);
  };

  // ── Remove a ship from a slot ────────────────────────────────────────────────
  const handleRemoveSlot = (idx) => {
    const newSlots = [...slots];
    newSlots[idx] = null;
    setSlots(newSlots);
  };

  // ── Ready for Battle ─────────────────────────────────────────────────────────
  const allFilled = slots.every(Boolean);

  const handleReadyForBattle = async () => {
    if (!allFilled) return;

    // Build shot_preferences: slot position (1-based) → shotType
    const shotPreferences = {};
    const selectedShipIds = [];
    slots.forEach((slot, i) => {
      shotPreferences[(i + 1).toString()] = slot.shotType;
      selectedShipIds.push(slot.shipConfig.id);
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("thor_shot_preferences", JSON.stringify(shotPreferences));
      localStorage.setItem("thor_selected_ships", JSON.stringify(selectedShipIds));
    }

    // Persist to Supabase
    if (userId) {
      await supabase.from("profiles").update({ shot_preferences: shotPreferences }).eq("id", userId);
    }

    router.push(`/play/${matchId}`);
  };

  const filledSlots = slots.filter(Boolean).length;

  return (
    <div style={pageStyle}>
      {/* Tutorial modal */}
      {tutorialOpen && <TutorialModal onClose={handleCloseTutorial} />}

      <div style={containerStyle}>
        <h1 style={titleStyle}>Selecione suas Naves</h1>
        <p style={subtitleStyle}>
          {filledSlots < 3
            ? `Escolha ${3 - filledSlots} nave${3 - filledSlots > 1 ? "s" : ""} para sua esquadrilha`
            : "Esquadrilha completa! Pronta para batalha."}
        </p>

        {/* ── Ship Carousel ─────────────────────────────────────────────────── */}
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
            const isLocked = ship.isVip && !isVip;
            const canAdd = !isLocked && filledSlots < 3;
            return (
              <div
                style={{
                  ...shipCardStyle,
                  opacity: isLocked ? 0.75 : 1,
                  cursor: canAdd ? "pointer" : "default",
                  border: canAdd ? "1px solid rgba(0,229,255,0.45)" : "1px solid rgba(0,229,255,0.15)",
                  transition: "border 0.2s, transform 0.15s",
                }}
                onClick={() => handleShipClick(ship)}
                title={canAdd ? "Clique para adicionar à esquadrilha" : undefined}
                onMouseEnter={e => { if (canAdd) e.currentTarget.style.transform = "scale(1.02)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                {/* VIP tag */}
                {ship.isVip && !isLocked && (
                  <div style={vipTagStyle}>💎 VIP</div>
                )}
                {/* Lock overlay */}
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
                  style={{ width: 110, height: 110, objectFit: "contain", filter: isLocked ? "grayscale(1) brightness(0.4)" : "drop-shadow(0 0 16px #00E5FF88)" }}
                  onError={e => { e.currentTarget.style.opacity = "0.3"; }}
                />
                <div style={{ color: isLocked ? "#555" : "#00E5FF", fontWeight: 700, fontSize: 18, fontFamily: "'Orbitron',sans-serif", marginTop: 12 }}>
                  {ship.name}
                </div>
                <div style={{ color: "#888", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                  {ship.desc}
                </div>

                {/* Add hint */}
                {canAdd && (
                  <div style={{ marginTop: 14, fontSize: 12, color: "rgba(0,229,255,0.65)", fontFamily: "'Orbitron',sans-serif" }}>
                    Toque para selecionar
                  </div>
                )}
                {!isLocked && filledSlots >= 3 && (
                  <div style={{ marginTop: 14, fontSize: 12, color: "#555", fontFamily: "'Orbitron',sans-serif" }}>
                    Remova um slot para trocar
                  </div>
                )}

                {/* Dots indicator */}
                <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
                  {SHIPS_CONFIG.map((_, i) => (
                    <button
                      key={i}
                      onClick={ev => { ev.stopPropagation(); setSelectedShipIdx(i); }}
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

        {/* ── Squad Slots ────────────────────────────────────────────────────── */}
        <div style={slotsRowStyle}>
          {slots.map((slot, idx) => (
            <div
              key={idx}
              style={{
                ...slotCardStyle,
                borderColor: slot ? "rgba(0,229,255,0.5)" : "rgba(0,229,255,0.15)",
                background: slot ? "rgba(0,229,255,0.07)" : "rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ fontSize: 11, color: "#555", fontFamily: "'Orbitron',sans-serif", marginBottom: 8, letterSpacing: 1 }}>
                SLOT {idx + 1}
              </div>
              {slot ? (
                <>
                  <img
                    src={slot.shipConfig.image}
                    alt={slot.shipConfig.name}
                    style={{ width: 54, height: 54, objectFit: "contain", filter: "drop-shadow(0 0 8px #00E5FF66)" }}
                    onError={e => { e.currentTarget.style.opacity = "0.3"; }}
                  />
                  <div style={{ color: "#00E5FF", fontWeight: 700, fontSize: 13, fontFamily: "'Orbitron',sans-serif", marginTop: 6, textAlign: "center" }}>
                    {slot.shipConfig.name}
                  </div>
                  <div style={{ color: "#aaa", fontSize: 11, marginTop: 3 }}>
                    🎯 {slot.shotType.toUpperCase()}
                  </div>
                  <button
                    onClick={() => handleRemoveSlot(idx)}
                    style={removeSlotBtnStyle}
                    title="Remover nave"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <div style={{ color: "rgba(0,229,255,0.25)", fontSize: 28, marginTop: 4 }}>＋</div>
              )}
            </div>
          ))}
        </div>

        {/* ── CTA buttons ────────────────────────────────────────────────────── */}
        {allFilled && (
          <button
            onClick={handleReadyForBattle}
            style={readyBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = "#00E5FF"; e.currentTarget.style.color = "#000"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#00E5FF"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            ⚔️ Pronto para Batalha!
          </button>
        )}

        <button onClick={() => router.push("/multiplayer")} style={backButtonStyle}>
          ← Voltar ao Hub
        </button>
      </div>

      {/* Shot Type Modal — opens when user clicks a ship in the carousel */}
      <ShotTypeModal
        open={shotTypeModalOpen}
        onClose={() => { setShotTypeModalOpen(false); setPendingShipConfig(null); }}
        shipIndex={pendingShipConfig?.id ?? null}
        currentShotType="plasma"
        onConfirm={handleShotConfirm}
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

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  fontSize: 28,
  fontWeight: 700,
  color: "#00E5FF",
  textShadow: "0 0 20px rgba(0, 229, 255, 0.5)",
  fontFamily: "'Orbitron', sans-serif",
  marginBottom: 8,
};

const subtitleStyle = {
  margin: "0 0 32px",
  fontSize: 14,
  color: "#888",
};

const carouselWrapStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 20,
  marginBottom: 32,
};

const shipCardStyle = {
  flex: 1,
  maxWidth: 260,
  background: "rgba(0,229,255,0.05)",
  border: "1px solid rgba(0,229,255,0.2)",
  borderRadius: 16,
  padding: "24px 18px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  minHeight: 260,
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

const slotsRowStyle = {
  display: "flex",
  gap: 16,
  justifyContent: "center",
  marginBottom: 28,
  flexWrap: "wrap",
};

const slotCardStyle = {
  width: 120,
  minHeight: 150,
  borderRadius: 14,
  border: "1px solid rgba(0,229,255,0.15)",
  background: "rgba(0,0,0,0.2)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "14px 10px",
  position: "relative",
  transition: "border-color 0.2s, background 0.2s",
};

const removeSlotBtnStyle = {
  position: "absolute",
  top: 6,
  right: 6,
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "rgba(255,50,50,0.15)",
  border: "1px solid rgba(255,50,50,0.4)",
  color: "#FF5555",
  fontSize: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const readyBtnStyle = {
  display: "block",
  width: "100%",
  padding: "16px 32px",
  marginBottom: 16,
  background: "transparent",
  border: "2px solid #00E5FF",
  borderRadius: 12,
  color: "#00E5FF",
  fontSize: 17,
  fontWeight: 700,
  fontFamily: "'Orbitron', sans-serif",
  cursor: "pointer",
  transition: "all 0.25s",
  letterSpacing: 1,
  boxShadow: "0 0 20px rgba(0,229,255,0.25)",
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

// ─── Tutorial modal styles ────────────────────────────────────────────────────

const tutorialOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.88)",
  zIndex: 10000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const tutorialBoxStyle = {
  maxWidth: 420,
  width: "100%",
  background: "rgba(0,0,20,0.97)",
  border: "1px solid rgba(0,229,255,0.4)",
  borderRadius: 20,
  padding: "36px 32px",
  textAlign: "center",
  boxShadow: "0 0 40px rgba(0,229,255,0.15)",
};

const tutorialBtnStyle = {
  padding: "14px 40px",
  borderRadius: 10,
  background: "transparent",
  border: "2px solid #00E5FF",
  color: "#00E5FF",
  fontSize: 16,
  fontWeight: 700,
  fontFamily: "'Orbitron', sans-serif",
  cursor: "pointer",
  transition: "all 0.2s",
  letterSpacing: 1,
};
