"use client";
import React from "react";
import Link from "next/link";
import { useI18n } from "@/src/hooks/useI18n";
import { getDailyLoginText } from "@/lib/i18n/dailyLogin";

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

const popupStyle = {
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
  padding: "20px 24px 10px 24px",
  background: "rgba(0, 229, 255, 0.1)",
  borderBottom: "1px solid rgba(0, 229, 255, 0.3)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const bodyStyle = {
  padding: "24px",
  textAlign: "center",
  color: "#FFF",
};

const actionsStyle = {
  padding: "0 24px 24px 24px",
  display: "flex",
  gap: 12,
};

const buttonStyle = {
  flex: 1,
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 700,
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  transition: "transform 0.2s, opacity 0.2s",
  fontFamily: "'Orbitron',sans-serif",
};

export default function DailyLoginModal({ open, onClose, awardedXp, streakDay }) {
  const { lang } = useI18n();
  if (!open) return null;
  const titleKey = `streak${streakDay}_title`;
  const bodyKey = `streak${streakDay}_body`;
  return (
    <div style={overlayStyle}>
      <div style={popupStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 20, color: "#00E5FF" }}>{getDailyLoginText(titleKey, lang)}</h3>
        </div>
        <div style={bodyStyle}>
          <p style={{ margin: 0, fontSize: 16 }}>
            {getDailyLoginText(bodyKey, lang)}
          </p>
        </div>
        <div style={actionsStyle}>
          <button onClick={onClose} style={{ ...buttonStyle, background: "rgba(255,255,255,0.1)", color: "#FFF" }}>OK</button>
        </div>
      </div>
    </div>
  );
}
