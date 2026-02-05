"use client";

/**
 * LevelXPBadge Component
 * Modern tactical XP/Level display inspired by Call of Duty
 * Features: Level badge, XP bar with shimmer animation, responsive design
 */


// Aceita tanto props antigos quanto objeto progress centralizado
export default function LevelXPBadge({ level, xp, xpToNext, isVipActive = false, progress }) {
  // Se vier objeto progress, usa ele; senão, usa props antigos para compatibilidade
  const p = progress || { level, xp, xpToNext };
  const xpPercent = Math.min((p.xp / p.xpToNext) * 100, 100);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 50,
        padding: "12px 16px",
        backdropFilter: "blur(8px)",
        minWidth: "fit-content",
        height: 58,
        boxShadow: isVipActive ? "0 0 0 1px rgba(255, 215, 0, 0.35), 0 6px 22px rgba(255, 215, 0, 0.18)" : "none",
      }}
    >
      {/* Level Badge */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          background: "linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05))",
          border: isVipActive ? "1px solid rgba(255, 215, 0, 0.8)" : "1px solid rgba(255, 215, 0, 0.4)",
          borderRadius: 999,
          flexShrink: 0,
          boxShadow: isVipActive ? "0 0 0 1px rgba(255, 215, 0, 0.35), 0 4px 14px rgba(255, 215, 0, 0.25)" : "none",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255, 255, 255, 0.6)",
            letterSpacing: "0.5px",
            lineHeight: "1",
          }}
        >
          LV
        </span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#FFD700",
            lineHeight: "1",
          }}
        >
          {level}
        </span>
      </div>

      {/* XP Bar Container */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {/* XP Bar */}
        <div
          style={{
            position: "relative",
            width: 120,
            height: 6,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {/* Progress Fill */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: `${xpPercent}%`,
              background: "linear-gradient(90deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)",
              transition: "width 0.4s ease-out",
              boxShadow: "0 0 8px rgba(255, 215, 0, 0.6)",
              borderRadius: 1,
              animation: "xpShimmer 2s infinite",
            }}
          />

          {/* Scanline Effect */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.1) 0px, rgba(0, 0, 0, 0.1) 1px, transparent 1px, transparent 2px)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* XP Text */}
        <span
          style={{
            fontSize: 10,
            color: "rgba(255, 255, 255, 0.6)",
            fontWeight: 500,
            letterSpacing: "0.3px",
          }}
        >
          {xp}/{xpToNext} XP
        </span>
      </div>
    </div>
  );
}
