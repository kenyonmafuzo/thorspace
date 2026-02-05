"use client";

import { useState } from "react";
import { getLevelProgressFromTotalXp } from "@/lib/xpSystem";

/**
 * RankBadge (standalone)
 * - Não depende de xpSystem
 * - Tooltip completo: "1 - Rookie - Gold", Total XP, Progresso (xp / xpToNext) + barra
 * - Ícone por tier/material com fallback seguro
 */

export default function RankBadge({ totalXp = null, size = 70 }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const progress = getLevelProgressFromTotalXp(totalXp);
  const displayText = `${progress.level} - ${progress.tier} - ${progress.material}`;
  const imgSrc = `/game/images/ranks/${progress.tier.toLowerCase()}/${progress.tier.toLowerCase()}_${progress.material.toLowerCase()}.png`;

  return (
    <div
      className="rank-badge-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((v) => !v)}
      style={{ position: "relative", display: "inline-block" }}
    >
      <img
        src={imgSrc}
        alt={displayText}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: "contain",
          cursor: "pointer",
        }}
        onError={(e) => {
          // Fallback pra não quebrar UI se algum tier/material ainda não tiver imagem
          e.currentTarget.src = "/game/images/ranks/rookie/rookie_bronze.png";
        }}
      />
      
      {/* Bolinha com número do NÍVEL */}
      <div
        style={{
          position: "absolute",
          top: size >= 100 ? 16 : -4,
          right: size >= 100 ? 16 : -4,
          width: size >= 100 ? 20 : `${size * 0.35}px`,
          height: size >= 100 ? 20 : `${size * 0.35}px`,
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgb(130 130 130) 0%, rgb(79 106 115) 100%)",
          border: "1px solid rgb(101 139 168)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: size >= 100 ? 10 : `${size * 0.22}px`,
          color: "#FFF",
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          boxShadow: "0 2px 8px rgba(0,229,255,0.4)",
          pointerEvents: "none",
        }}
      >
        {progress.level}
      </div>

      {showTooltip && (
        <div
          className="rank-tooltip"
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: "-5px",
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: "10px",
            fontSize: "14px",
            whiteSpace: "nowrap",
            zIndex: 1000,
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
            pointerEvents: "none",
            minWidth: 220,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{displayText}</div>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>
            Total XP: {progress.totalXp === null ? "—" : formatXp(progress.totalXp)}
          </div>
          <div style={{ fontSize: 12, color: "#888" }}>
            Progresso: {formatXp(progress.xp)} / {progress.xpToNext > 0 ? formatXp(progress.xpToNext) : "∞"}
          </div>
          {progress.xpToNext > 0 && (
            <>
              <div
                style={{
                  width: "100%",
                  height: 5,
                  backgroundColor: "rgba(255, 255, 255, 0.18)",
                  borderRadius: 999,
                  marginTop: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress.progressPercent}%`,
                    height: "100%",
                    backgroundColor: "#4ade80",
                    transition: "width 0.25s ease",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#9aa",
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                {progress.progressPercent}%
              </div>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .rank-badge-container {
          transition: transform 0.2s ease;
        }
        .rank-badge-container:hover {
          transform: scale(1.06);
        }
      `}</style>
    </div>
  );
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function formatXp(xp) {
  const n = safeNumber(xp);
  return n.toLocaleString("pt-BR");
}
