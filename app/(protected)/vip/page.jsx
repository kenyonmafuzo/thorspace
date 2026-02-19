"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/src/hooks/useI18n";

const PLAN_ACCENTS = {
  "1day":   "#00E5FF",
  "7days":  "#a855f7",
  "15days": "#f59e0b",
  "30days": "#FFD700",
};

export default function VIPPage() {
  const { lang, t } = useI18n();

  // All text / plans / benefits come from the active language dictionary
  const vip      = (typeof t("vip") === "object" ? t("vip") : {});
  const plans    = Array.isArray(vip.plans)    ? vip.plans    : [];
  const benefits = Array.isArray(vip.benefits) ? vip.benefits : [];
  const isPT     = lang === "pt";

  const [selectedPlan, setSelectedPlan] = useState("30days");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [profile, setProfile] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Reset to PIX when language is PT, credit card otherwise
  useEffect(() => {
    setPaymentMethod(lang === "pt" ? "pix" : "credit");
  }, [lang]);

  const currentPlan = plans.find((p) => p.id === selectedPlan) || plans[3] || plans[0];

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, is_vip, vip_expires_at")
          .eq("id", data.user.id)
          .maybeSingle();
        setProfile(prof);
      }
    });
  }, []);

  const isVipActive =
    profile?.is_vip &&
    profile?.vip_expires_at &&
    new Date(profile.vip_expires_at) > new Date();

  const vipExpiresDate = profile?.vip_expires_at
    ? new Date(profile.vip_expires_at).toLocaleDateString(
        lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US",
        { day: "2-digit", month: "short", year: "numeric" }
      )
    : null;

  const paymentLabel =
    paymentMethod === "pix"    ? (vip.pixLabel    || "PIX") :
    paymentMethod === "credit" ? (vip.creditLabel || "Credit Card") :
                                 (vip.debitLabel  || "Debit");

  return (
    <div style={pageStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        @keyframes crownGlow {
          0%, 100% { filter: drop-shadow(0 0 8px #FFD70099) drop-shadow(0 0 20px #FFD70044); }
          50% { filter: drop-shadow(0 0 16px #FFD700cc) drop-shadow(0 0 40px #FFD70066); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes starFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        .vip-plan-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .vip-plan-card:hover {
          transform: translateY(-4px);
        }
        .benefit-card {
          transition: background 0.2s, border-color 0.2s;
        }
        .benefit-card:hover {
          background: rgba(255,215,0,0.08) !important;
          border-color: rgba(255,215,0,0.3) !important;
        }
        .pay-btn {
          transition: opacity 0.2s, transform 0.2s;
        }
        .pay-btn:hover {
          opacity: 0.9;
          transform: scale(1.02);
        }
        .pay-btn:active {
          transform: scale(0.98);
        }
      `}</style>

      {/* Back + Header */}
      <div style={topBarStyle}>
        <Link href="/mode" style={backBtnStyle}>
          ← {vip.back || "Back"}
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26, animation: "crownGlow 2s infinite" }}>👑</span>
          <span style={{
            fontSize: 20,
            fontWeight: 900,
            fontFamily: "'Orbitron', sans-serif",
            background: "linear-gradient(90deg, #FFD700, #FFF8A0, #FFD700)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite",
          }}>
            {vip.pageTitle || "THORSPACE VIP"}
          </span>
        </div>

        {/* Language badge (read-only — changed in Settings) */}
        <div style={{
          padding: "5px 14px",
          background: "rgba(255,215,0,0.10)",
          border: "1px solid rgba(255,215,0,0.3)",
          borderRadius: 8,
          fontFamily: "'Orbitron',sans-serif",
          fontSize: 11,
          fontWeight: 700,
          color: "#FFD700",
          letterSpacing: 1,
        }}>
          {lang === "pt" ? "🇧🇷 PT" : lang === "es" ? "🇪🇸 ES" : "🇺🇸 EN"}
        </div>
      </div>

      {/* VIP status ativo */}
      {isVipActive && (
        <div style={{
          margin: "0 auto 24px auto",
          maxWidth: 900,
          padding: "14px 24px",
          background: "linear-gradient(90deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))",
          border: "1px solid rgba(255,215,0,0.4)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          gap: 12,
          animation: "fadeIn 0.4s ease-out",
        }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <div style={{ color: "#FFD700", fontWeight: 700, fontFamily: "'Orbitron',sans-serif", fontSize: 13 }}>
              {vip.statusActive || "VIP ACTIVE"}
            </div>
            <div style={{ color: "#ccc", fontSize: 12, marginTop: 2 }}>
              {vip.statusExpires} {vipExpiresDate}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 960, margin: "0 auto", width: "100%", animation: "fadeIn 0.4s ease-out" }}>

        {/* Hero section */}
        <div style={heroStyle}>
          <span style={{ fontSize: 52, display: "block", animation: "starFloat 3s ease-in-out infinite" }}>👑</span>
          <h1 style={{
            margin: "12px 0 8px 0",
            fontSize: "clamp(22px, 4vw, 34px)",
            fontWeight: 900,
            fontFamily: "'Orbitron', sans-serif",
            background: "linear-gradient(90deg, #FFD700 0%, #FFF8A0 50%, #FFD700 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite",
            textAlign: "center",
          }}>
            {vip.hero}
          </h1>
          <p style={{ color: "#aaa", fontSize: 15, margin: 0, textAlign: "center", maxWidth: 480 }}>
            {vip.heroSub}
          </p>
        </div>

        {/* Benefits grid */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={sectionTitleStyle}>{vip.sectionBenefits}</h2>
          <div style={benefitsGridStyle}>
            {benefits.map((b) => (
              <div key={b.title} className="benefit-card" style={benefitCardStyle}>
                <span style={{ fontSize: 26, display: "block", marginBottom: 8 }}>{b.icon}</span>
                <div style={{ color: "#FFD700", fontWeight: 700, fontFamily: "'Orbitron',sans-serif", fontSize: 12, marginBottom: 4 }}>
                  {b.title}
                </div>
                <div style={{ color: "#999", fontSize: 12, lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Planos */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={sectionTitleStyle}>{vip.sectionPlans}</h2>
          <div style={plansGridStyle}>
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const accent = PLAN_ACCENTS[plan.id] || "#00E5FF";
              const accentRgb =
                accent === "#FFD700" ? "255,215,0" :
                accent === "#00E5FF" ? "0,229,255" :
                accent === "#a855f7" ? "168,85,247" : "245,158,11";
              return (
                <div
                  key={plan.id}
                  className="vip-plan-card"
                  onClick={() => setSelectedPlan(plan.id)}
                  style={{
                    position: "relative",
                    borderRadius: 16,
                    padding: "28px 20px 20px",
                    cursor: "pointer",
                    background: isSelected
                      ? `linear-gradient(135deg, rgba(${accentRgb},0.15) 0%, rgba(10,14,39,0.95) 100%)`
                      : "linear-gradient(135deg, rgba(10,14,39,0.9) 0%, rgba(5,5,20,0.9) 100%)",
                    border: isSelected
                      ? `2px solid ${accent}`
                      : "2px solid rgba(255,255,255,0.1)",
                    boxShadow: isSelected
                      ? `0 0 24px ${accent}44, 0 4px 20px rgba(0,0,0,0.4)`
                      : "0 4px 20px rgba(0,0,0,0.3)",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  {plan.best && (
                    <div style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "linear-gradient(90deg, #FFD700, #f59e0b)",
                      color: "#000",
                      fontSize: 10,
                      fontWeight: 900,
                      fontFamily: "'Orbitron',sans-serif",
                      padding: "4px 14px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                      letterSpacing: 1,
                    }}>
                      ⭐ {vip.bestDeal}
                    </div>
                  )}

                  {isSelected && (
                    <div style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      color: "#000",
                      fontWeight: 900,
                    }}>✓</div>
                  )}

                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: "'Orbitron',sans-serif",
                    color: isSelected ? accent : "#ccc",
                    marginBottom: 4,
                    letterSpacing: 1,
                  }}>
                    {plan.label}
                  </div>
                  <div style={{ color: "#666", fontSize: 11, marginBottom: 14 }}>
                    {plan.sublabel}
                  </div>
                  <div style={{
                    fontSize: "clamp(20px, 3vw, 28px)",
                    fontWeight: 900,
                    fontFamily: "'Orbitron',sans-serif",
                    color: isSelected ? accent : "#fff",
                  }}>
                    {plan.price}
                  </div>
                  <div style={{ color: "#555", fontSize: 11, marginTop: 4 }}>
                    {plan.days} {plan.days === 1 ? vip.day : vip.days}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Método de pagamento + CTA */}
        <section style={{
          background: "linear-gradient(135deg, rgba(10,14,39,0.95) 0%, rgba(5,5,20,0.95) 100%)",
          border: "2px solid rgba(255,215,0,0.3)",
          borderRadius: 20,
          padding: "32px 28px",
          marginBottom: 60,
        }}>
          <h2 style={{ ...sectionTitleStyle, marginBottom: 20 }}>{vip.sectionPayment}</h2>

          <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            {/* PIX - só PT */}
            {isPT && (
              <button
                onClick={() => setPaymentMethod("pix")}
                style={{
                  flex: 1, minWidth: 130, padding: "16px 20px", borderRadius: 12,
                  border: paymentMethod === "pix" ? "2px solid #00D65A" : "2px solid rgba(255,255,255,0.1)",
                  background: paymentMethod === "pix" ? "rgba(0,214,90,0.12)" : "rgba(255,255,255,0.04)",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 28 }}>⚡</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: paymentMethod === "pix" ? "#00D65A" : "#aaa" }}>
                  {vip.pixLabel || "PIX"}
                </span>
                <span style={{ fontSize: 10, color: "#666" }}>{vip.pixSub}</span>
              </button>
            )}

            {/* Cartão de crédito */}
            <button
              onClick={() => setPaymentMethod("credit")}
              style={{
                flex: 1, minWidth: 130, padding: "16px 20px", borderRadius: 12,
                border: paymentMethod === "credit" ? "2px solid #00E5FF" : "2px solid rgba(255,255,255,0.1)",
                background: paymentMethod === "credit" ? "rgba(0,229,255,0.10)" : "rgba(255,255,255,0.04)",
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 28 }}>💳</span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: paymentMethod === "credit" ? "#00E5FF" : "#aaa" }}>
                {vip.creditLabel}
              </span>
              <span style={{ fontSize: 10, color: "#666" }}>{vip.creditSub}</span>
            </button>

            {/* Débito */}
            <button
              onClick={() => setPaymentMethod("debit")}
              style={{
                flex: 1, minWidth: 130, padding: "16px 20px", borderRadius: 12,
                border: paymentMethod === "debit" ? "2px solid #a855f7" : "2px solid rgba(255,255,255,0.1)",
                background: paymentMethod === "debit" ? "rgba(168,85,247,0.10)" : "rgba(255,255,255,0.04)",
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 28 }}>🏧</span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: paymentMethod === "debit" ? "#a855f7" : "#aaa" }}>
                {vip.debitLabel}
              </span>
              <span style={{ fontSize: 10, color: "#666" }}>{vip.debitSub}</span>
            </button>
          </div>

          {/* Resumo do pedido */}
          {currentPlan && (
            <div style={{
              background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)",
              borderRadius: 12, padding: "16px 20px", marginBottom: 20,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: 12,
            }}>
              <div>
                <div style={{ color: "#FFD700", fontWeight: 700, fontFamily: "'Orbitron',sans-serif", fontSize: 13 }}>
                  👑 {currentPlan.label}
                </div>
                <div style={{ color: "#888", fontSize: 12, marginTop: 3 }}>
                  {vip.viaPayment} {paymentLabel}
                </div>
              </div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, fontWeight: 900, color: "#FFD700" }}>
                {currentPlan.price}
              </div>
            </div>
          )}

          {/* Botão pagar */}
          <button
            className="pay-btn"
            onClick={() => setShowPaymentModal(true)}
            style={{
              width: "100%", padding: "16px 24px",
              background: "linear-gradient(90deg, #FFD700 0%, #f59e0b 50%, #FFD700 100%)",
              backgroundSize: "200% auto", animation: "shimmer 3s linear infinite",
              border: "none", borderRadius: 12,
              fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 900,
              color: "#000", cursor: "pointer", letterSpacing: 1,
              boxShadow: "0 0 30px rgba(255,215,0,0.4), 0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            ⚡ {vip.payNow} — {currentPlan?.price}
          </button>

          <p style={{ color: "#555", fontSize: 11, textAlign: "center", marginTop: 12 }}>
            🔒 {vip.securePayment}
          </p>
        </section>
      </div>

      {/* Modal de pagamento (placeholder) */}
      {showPaymentModal && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 99999,
        }}>
          <div style={{
            width: "90%", maxWidth: 440,
            background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)",
            border: "2px solid rgba(255,215,0,0.5)",
            borderRadius: 20, overflow: "hidden",
            boxShadow: "0 0 60px rgba(255,215,0,0.2)",
            animation: "fadeIn 0.25s ease-out",
          }}>
            {/* Header modal */}
            <div style={{
              padding: "20px 24px",
              background: "rgba(255,215,0,0.1)",
              borderBottom: "1px solid rgba(255,215,0,0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>👑</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 15, fontWeight: 700, color: "#FFD700" }}>
                  {vip.confirmTitle}
                </span>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#fff", width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 28, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
              <div style={{ color: "#FFD700", fontWeight: 700, fontFamily: "'Orbitron',sans-serif", fontSize: 14, marginBottom: 8 }}>
                {vip.comingSoon}
              </div>
              <div style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                {vip.comingSoonMsg}<br /><br />
                <span style={{ color: "#FFD700", fontWeight: 600 }}>{vip.selectedPlan}: {currentPlan?.label} — {currentPlan?.price}</span>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  width: "100%", padding: "12px 24px",
                  background: "linear-gradient(90deg, #FFD700, #f59e0b)",
                  border: "none", borderRadius: 10,
                  fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 700,
                  color: "#000", cursor: "pointer", letterSpacing: 1,
                }}
              >
                {vip.ok}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle = {
  minHeight: "100dvh",
  background: "radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)",
  paddingTop: 90,
  paddingBottom: 40,
  overflowY: "auto",
  paddingLeft: 20,
  paddingRight: 20,
};

const topBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  maxWidth: 960,
  margin: "0 auto 28px auto",
  flexWrap: "wrap",
  gap: 12,
};

const backBtnStyle = {
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 700,
  color: "#FFF",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 10,
  cursor: "pointer",
  textDecoration: "none",
  fontFamily: "'Orbitron',sans-serif",
};

const heroStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginBottom: 48,
  paddingTop: 8,
};

const sectionTitleStyle = {
  fontSize: 14,
  fontWeight: 700,
  fontFamily: "'Orbitron',sans-serif",
  color: "#FFD700",
  letterSpacing: 2,
  textTransform: "uppercase",
  marginBottom: 20,
  paddingBottom: 8,
  borderBottom: "1px solid rgba(255,215,0,0.2)",
};

const benefitsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 12,
};

const benefitCardStyle = {
  padding: "16px 14px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,215,0,0.12)",
  borderRadius: 12,
  cursor: "default",
};

const plansGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
  gap: 16,
};
