"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/src/hooks/useI18n";
import { AVATAR_OPTIONS } from "@/app/lib/avatarOptions";

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

  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("30days");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [profile, setProfile] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // VIP customization
  const [vipNameColor, setVipNameColor] = useState("#FFD700");
  const [vipFrameColor, setVipFrameColor] = useState("#FFD700");
  const [vipAvatar, setVipAvatar] = useState(null);
  const [vipSaving, setVipSaving] = useState(false);
  const [vipSaveMessage, setVipSaveMessage] = useState("");

  // VIP activation modal — shown once after a successful purchase
  const [vipActivatedModal, setVipActivatedModal] = useState(null); // { plan_label, vip_starts, vip_expires }

  // Reset to PIX when language is PT, credit card otherwise
  useEffect(() => {
    setPaymentMethod(lang === "pt" ? "pix" : "credit");
  }, [lang]);

  const currentPlan = plans.find((p) => p.id === selectedPlan) || plans[3] || plans[0];

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setProfileUserId(data.user.id);
        // Try to fetch VIP color columns — may not exist yet if migration hasn't run
        let prof = null;
        const { data: fullProf, error: fullErr } = await supabase
          .from("profiles")
          .select("username, is_vip, vip_expires_at, vip_name_color, vip_frame_color")
          .eq("id", data.user.id)
          .maybeSingle();
        if (fullErr) {
          // Columns might not exist — fallback select
          const { data: basicProf } = await supabase
            .from("profiles")
            .select("username, is_vip, vip_expires_at")
            .eq("id", data.user.id)
            .maybeSingle();
          prof = basicProf;
        } else {
          prof = fullProf;
        }
        setProfile(prof);
        if (prof?.vip_name_color) setVipNameColor(prof.vip_name_color);
        if (prof?.vip_frame_color) setVipFrameColor(prof.vip_frame_color);
        // Load avatar from localStorage (saved client-side)
        if (typeof window !== "undefined") {
          const savedAvatar = localStorage.getItem("thor_vip_avatar");
          if (savedAvatar) setVipAvatar(savedAvatar);
        }
      }
    });
  }, []);

  // Show activation modal if redirected from a successful payment
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("thor_vip_just_activated");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setVipActivatedModal(data);
        localStorage.removeItem("thor_vip_just_activated");
      } catch (_) {
        localStorage.removeItem("thor_vip_just_activated");
      }
    }
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

  const handleSaveVipCustomization = async () => {
    if (!profileUserId || vipSaving) return;
    setVipSaving(true);
    setVipSaveMessage("");
    const updatePayload = { vip_name_color: vipNameColor, vip_frame_color: vipFrameColor };
    if (vipAvatar) updatePayload.avatar_preset = vipAvatar;
    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", profileUserId);
    setVipSaving(false);
    if (error) {
      setVipSaveMessage(vip.saveError || "Erro ao salvar");
    } else {
      setVipSaveMessage(vip.saveSuccess || "Salvo!");
      // Persist in localStorage for game
      if (typeof window !== "undefined") {
        localStorage.setItem("thor_vip_name_color", vipNameColor);
        localStorage.setItem("thor_vip_frame_color", vipFrameColor);
        if (vipAvatar) localStorage.setItem("thor_vip_avatar", vipAvatar);
        // Notify other components
        window.dispatchEvent(new Event("thor_vip_avatar_changed"));
      }
      setTimeout(() => setVipSaveMessage(""), 3000);
    }
  };

  const paymentLabel =
    paymentMethod === "pix"    ? (vip.pixLabel    || "PIX") :
    paymentMethod === "credit" ? (vip.creditLabel || "Credit Card") :
                                 (vip.debitLabel  || "Debit");

  const handlePay = async () => {
    if (paymentLoading) return;
    setPaymentLoading(true);
    setPaymentError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPaymentError("Você precisa estar logado para continuar.");
        setPaymentLoading(false);
        return;
      }
      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok || !data.init_point) {
        setPaymentError(data.error || "Erro ao iniciar pagamento. Tente novamente.");
        setPaymentLoading(false);
        return;
      }
      // Redirect to Mercado Pago Checkout Pro
      window.location.href = data.init_point;
    } catch (err) {
      console.error("[VIP] handlePay error:", err);
      setPaymentError("Erro de conexão. Verifique sua internet e tente novamente.");
      setPaymentLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, backgroundImage: "url('/game/images/bg_vip.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)", backgroundSize: "cover, cover", backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center center, center center", opacity: 0.35, pointerEvents: "none", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }} />
      <div style={{ position: "relative", zIndex: 1 }}>
      {/* VIP Activation Modal */}
      {vipActivatedModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.88)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
          backdropFilter: "blur(8px)",
        }} onClick={() => setVipActivatedModal(null)}>
          <div style={{
            background: "linear-gradient(135deg, #0a0e27 0%, #050514 100%)",
            border: "2px solid rgba(255,215,0,0.6)",
            borderRadius: 24,
            padding: "48px 36px",
            maxWidth: 420,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 0 60px rgba(255,215,0,0.35), 0 0 120px rgba(255,215,0,0.15)",
            animation: "vipModalPop 0.5s cubic-bezier(.34,1.56,.64,1) both",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 72, marginBottom: 16, animation: "vipCrownFloat 3s ease-in-out infinite" }}>
              {"\u{1F48E}"}
            </div>
            <h2 style={{
              fontSize: 20,
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 900,
              backgroundImage: "linear-gradient(90deg, #FFD700, #FFF8A0, #FFD700)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 3s linear infinite",
              marginBottom: 8,
            }}>
              VIP {vipActivatedModal.plan_label} ATIVADO!
            </h2>
            <p style={{ color: "#aaa", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
              Bem-vindo ao clube exclusivo.<br />Aproveite todos os benefícios!
            </p>
            <div style={{
              background: "rgba(255,215,0,0.07)",
              border: "1px solid rgba(255,215,0,0.2)",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 28,
              fontSize: 12,
              color: "#aaa",
              lineHeight: 2,
              fontFamily: "monospace",
            }}>
              <div>⏱ <span style={{ color: "#FFD700" }}>Início:</span> {new Date(vipActivatedModal.vip_starts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</div>
              <div>🏁 <span style={{ color: "#FFD700" }}>Expira:</span> {new Date(vipActivatedModal.vip_expires).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}</div>
            </div>
            <button
              onClick={() => setVipActivatedModal(null)}
              style={{
                padding: "14px 32px",
                backgroundImage: "linear-gradient(90deg, #FFD700 0%, #f59e0b 50%, #FFD700 100%)",
                backgroundSize: "200% auto",
                animation: "shimmer 3s linear infinite",
                border: "none",
                borderRadius: 12,
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 13,
                fontWeight: 900,
                color: "#000",
                cursor: "pointer",
                letterSpacing: 1,
              }}>
              ⚡ APROVEITAR!
            </button>
          </div>
          <style>{`
            @keyframes vipModalPop {
              0% { transform: scale(0.5); opacity: 0; }
              70% { transform: scale(1.05); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes vipCrownFloat {
              0%, 100% { transform: translateY(0) rotate(-5deg); }
              50% { transform: translateY(-10px) rotate(5deg); }
            }
          `}</style>
        </div>
      )}
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

      {/* Back + Title */}
      <div style={{ ...topBarStyle, justifyContent: "flex-start", gap: 20 }}>
        <Link href="/mode" style={backBtnStyle}>
          ← {vip.back || "Back"}
        </Link>
        <span style={{
          fontSize: 16,
          fontWeight: 900,
          fontFamily: "'Orbitron', sans-serif",
          backgroundImage: "linear-gradient(90deg, #FFD700, #FFF8A0, #FFD700)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: "shimmer 3s linear infinite",
        }}>
          THORSPACE VIP
        </span>
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
          <h1 style={{
            margin: "12px 0 8px 0",
            fontSize: "clamp(22px, 4vw, 34px)",
            fontWeight: 900,
            fontFamily: "'Orbitron', sans-serif",
            backgroundImage: "linear-gradient(90deg, #FFD700 0%, #FFF8A0 50%, #FFD700 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite",
            textAlign: "center",
          }}>
            THORSPACE VIP
          </h1>
          <p style={{ color: "#aaa", fontSize: 15, margin: 0, textAlign: "center", maxWidth: 480 }}>
            Eleve sua presença na galáxia.
          </p>
        </div>

        {/* Benefits grid */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={sectionTitleStyle}>{vip.sectionBenefits}</h2>
          <div style={benefitsGridStyle}>
            {benefits.map((b) => (
              <div key={b.title} className="benefit-card" style={benefitCardStyle}>
                <div style={{ color: "#FFD700", fontWeight: 700, fontFamily: "'Orbitron',sans-serif", fontSize: 12, marginBottom: 4 }}>
                  {b.title}
                </div>
                <div style={{ color: "#999", fontSize: 12, lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Planos + Payment (non-VIP only) */}
        {!isVipActive && (<>

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
                  {"\u{1F48E}"} {currentPlan.label}
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
            onClick={handlePay}
            disabled={paymentLoading}
            style={{
              width: "100%", padding: "16px 24px",
              backgroundImage: paymentLoading
                ? "none"
                : "linear-gradient(90deg, #FFD700 0%, #f59e0b 50%, #FFD700 100%)",
              backgroundColor: paymentLoading ? "rgba(255,215,0,0.15)" : "transparent",
              backgroundSize: "200% auto",
              animation: paymentLoading ? "none" : "shimmer 3s linear infinite",
              border: paymentLoading ? "1px solid rgba(255,215,0,0.3)" : "none",
              borderRadius: 12,
              fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 900,
              color: paymentLoading ? "#FFD70088" : "#000",
              cursor: paymentLoading ? "not-allowed" : "pointer",
              letterSpacing: 1,
              boxShadow: paymentLoading ? "none" : "0 0 30px rgba(255,215,0,0.4), 0 4px 20px rgba(0,0,0,0.3)",
              transition: "all 0.2s",
            }}
          >
            {paymentLoading ? "⏳ REDIRECIONANDO..." : `⚡ ${vip.payNow} — ${currentPlan?.price}`}
          </button>

          {paymentError && (
            <div style={{
              marginTop: 12,
              padding: "10px 16px",
              background: "rgba(255,58,52,0.1)",
              border: "1px solid rgba(255,58,52,0.3)",
              borderRadius: 10,
              color: "#ff6b66",
              fontSize: 12,
              textAlign: "center",
            }}>
              ⚠️ {paymentError}
            </div>
          )}

          <p style={{ color: "#555", fontSize: 11, textAlign: "center", marginTop: 12 }}>
            🔒 {vip.securePayment}
          </p>

          {/* TEST MODE BUTTON — only visible when NEXT_PUBLIC_MP_TEST_MODE=true */}
          {process.env.NEXT_PUBLIC_MP_TEST_MODE === "true" && (
            <button
              onClick={async () => {
                if (!profileUserId) return;
                const res = await fetch("/api/mp/test-activate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: profileUserId, planId: selectedPlan }),
                });
                const data = await res.json();
                if (data.activated) {
                  localStorage.setItem("thor_vip_just_activated", JSON.stringify({
                    plan_label: data.plan_label,
                    vip_starts: data.vip_starts,
                    vip_expires: data.vip_expires,
                  }));
                  window.location.href = `/vip/success?payment_id=${data.fake_payment_id}&status=approved`;
                }
              }}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "12px",
                background: "rgba(255,100,0,0.12)",
                border: "1px dashed rgba(255,100,0,0.4)",
                borderRadius: 10,
                color: "#ff6422",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: 1,
              }}
            >
              🧪 [TESTE] ATIVAR VIP SEM PAGAMENTO
            </button>
          )}
        </section>

        </>)}

        {/* VIP Customization Panel */}
        {isVipActive && (
          <section style={{ marginBottom: 60 }}>
            <h2 style={sectionTitleStyle}>💎 {vip.customizationTitle || "Personalização VIP"}</h2>

            {/* Live preview */}
            <div style={{
              background: "linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(10,14,39,0.95) 100%)",
              border: `2px solid ${vipFrameColor}99`,
              borderRadius: 20,
              padding: "28px 24px",
              marginBottom: 28,
              textAlign: "center",
              boxShadow: `0 0 24px ${vipFrameColor}44`,
            }}>
              <div style={{ color: "#aaa", fontSize: 11, fontFamily: "'Orbitron',sans-serif", marginBottom: 14, letterSpacing: 1 }}>
                {vip.previewLabel || "PRÉVIA AO VIVO"}
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "12px 24px", background: "rgba(0,0,0,0.4)", borderRadius: 50, border: `2px solid ${vipFrameColor}` }}>
                <span style={{ fontSize: 18 }}>💎</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 700, color: vipNameColor }}>
                  {profile?.username || "username"}
                </span>
              </div>
            </div>

            {/* Name color picker */}
            <div style={{ marginBottom: 24, background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 14, padding: "20px 20px" }}>
              <div style={{ color: "#FFD700", fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
                {vip.nameColorLabel || "COR DO NOME"}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {["#FFD700","#00E5FF","#a855f7","#FF4D4D","#00FF88","#FFFFFF","#FF9500","#FF69B4"].map(c => (
                  <button key={c} onClick={() => setVipNameColor(c)} style={{
                    width: 34, height: 34, borderRadius: "50%", background: c,
                    border: vipNameColor === c ? "3px solid #FFF" : "3px solid rgba(255,255,255,0.2)",
                    cursor: "pointer", boxShadow: vipNameColor === c ? `0 0 14px ${c}` : "none", flexShrink: 0, transition: "all 0.15s"
                  }} title={c} />
                ))}
                <input type="color" value={vipNameColor} onChange={e => setVipNameColor(e.target.value)}
                  style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", padding: 2, cursor: "pointer", background: "rgba(0,0,0,0.4)", flexShrink: 0 }}
                  title="Cor personalizada" />
              </div>
            </div>

            {/* Profile picture picker */}
            <div style={{ marginBottom: 24, background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 14, padding: "20px 20px" }}>
              <div style={{ color: "#FFD700", fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
                {vip.avatarLabel || "IMAGEM DO PERFIL"}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {/* Naves padrão do jogo */}
                {AVATAR_OPTIONS.map((opt) => {
                  const isSelected = vipAvatar === opt.src;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setVipAvatar(opt.src)}
                      style={{
                        width: 64, height: 64, borderRadius: 12,
                        border: isSelected ? `3px solid ${vipFrameColor}` : "3px solid rgba(255,255,255,0.15)",
                        boxShadow: isSelected ? `0 0 14px ${vipFrameColor}99` : "none",
                        cursor: "pointer", padding: 8, overflow: "hidden",
                        background: "rgba(0,229,255,0.06)", position: "relative",
                        transition: "all 0.15s", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      title={opt.name}
                    >
                      <img
                        src={opt.src}
                        alt={opt.name}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                      {isSelected && (
                        <div style={{
                          position: "absolute", bottom: 2, right: 2,
                          width: 16, height: 16, borderRadius: "50%",
                          background: vipFrameColor,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 900, color: "#000",
                        }}>✓</div>
                      )}
                    </button>
                  );
                })}

                {/* Naves VIP exclusivas */}
                {[
                  { src: "/game/images/nave_alcance_vip.png",         name: "Maya VIP (Azul)" },
                  { src: "/game/images/nave_alcance_red_vip.png",     name: "Phoenix VIP (Vermelho)" },
                  { src: "/game/images/nave_protecao_vip.png",        name: "Vanguard VIP (Azul)" },
                  { src: "/game/images/nave_protecao_red_vip.png",    name: "Vanguard VIP (Vermelho)" },
                  { src: "/game/images/nave_normal_vip.png",          name: "Titan VIP (Azul)" },
                  { src: "/game/images/nave_normal_red_vip.png",      name: "Titan VIP (Vermelho)" },
                ].map((opt) => {
                  const isSelected = vipAvatar === opt.src;
                  return (
                    <button
                      key={opt.src}
                      onClick={() => setVipAvatar(opt.src)}
                      style={{
                        width: 64, height: 64, borderRadius: 12,
                        border: isSelected ? `3px solid ${vipFrameColor}` : "3px solid rgba(255,215,0,0.4)",
                        boxShadow: isSelected ? `0 0 14px ${vipFrameColor}99` : "0 0 6px rgba(255,215,0,0.15)",
                        cursor: "pointer", padding: 8,
                        background: "rgba(255,215,0,0.06)", position: "relative",
                        transition: "all 0.15s", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      title={opt.name}
                    >
                      <img
                        src={opt.src}
                        alt={opt.name}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        onError={e => { e.currentTarget.style.opacity = "0.3"; }}
                      />
                      <span style={{ position: "absolute", top: 2, right: 3, fontSize: 8, color: "#FFD700" }}>💎</span>
                      {isSelected && (
                        <div style={{
                          position: "absolute", bottom: 2, right: 2,
                          width: 16, height: 16, borderRadius: "50%",
                          background: vipFrameColor,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 900, color: "#000",
                        }}>✓</div>
                      )}
                    </button>
                  );
                })}

                {/* Slots futuros */}
                {[1, 2].map((n) => (
                  <div
                    key={`soon-${n}`}
                    style={{
                      width: 64, height: 64, borderRadius: 12,
                      border: "2px dashed rgba(255,215,0,0.2)",
                      background: "rgba(255,215,0,0.03)",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      gap: 2, flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>💎</span>
                    <span style={{ fontSize: 8, color: "#FFD70066", fontFamily: "'Orbitron',sans-serif" }}>SOON</span>
                  </div>
                ))}
              </div>
              <div style={{ color: "#555", fontSize: 11, marginTop: 10 }}>
                {vip.avatarHint || "Avatares VIP exclusivos chegando em breve. Salve para aplicar."}
              </div>
            </div>

            {/* Frame color picker */}
            <div style={{ marginBottom: 32, background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 14, padding: "20px 20px" }}>
              <div style={{ color: "#FFD700", fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
                {vip.frameColorLabel || "COR DO FRAME / BORDA"}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {["#FFD700","#00E5FF","#a855f7","#FF4D4D","#00FF88","#FFFFFF","#FF9500","#FF69B4"].map(c => (
                  <button key={c} onClick={() => setVipFrameColor(c)} style={{
                    width: 34, height: 34, borderRadius: "50%", background: c,
                    border: vipFrameColor === c ? "3px solid #FFF" : "3px solid rgba(255,255,255,0.2)",
                    cursor: "pointer", boxShadow: vipFrameColor === c ? `0 0 14px ${c}` : "none", flexShrink: 0, transition: "all 0.15s"
                  }} title={c} />
                ))}
                <input type="color" value={vipFrameColor} onChange={e => setVipFrameColor(e.target.value)}
                  style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", padding: 2, cursor: "pointer", background: "rgba(0,0,0,0.4)", flexShrink: 0 }}
                  title="Cor personalizada" />
              </div>
            </div>

            {/* Save button */}
            <button
              className="pay-btn"
              onClick={handleSaveVipCustomization}
              disabled={vipSaving}
              style={{
                width: "100%", padding: "16px 24px",
                backgroundImage: vipSaving ? "none" : "linear-gradient(90deg, #FFD700 0%, #f59e0b 50%, #FFD700 100%)",
                backgroundColor: vipSaving ? "rgba(255,215,0,0.2)" : "transparent",
                backgroundSize: "200% auto",
                animation: vipSaving ? "none" : "shimmer 3s linear infinite",
                border: "none", borderRadius: 12,
                fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 900,
                color: vipSaving ? "#888" : "#000",
                cursor: vipSaving ? "not-allowed" : "pointer", letterSpacing: 1,
                boxShadow: "0 0 30px rgba(255,215,0,0.4), 0 4px 20px rgba(0,0,0,0.3)",
              }}
            >
              {vipSaving ? "Salvando..."
                : vipSaveMessage ? `✅ ${vipSaveMessage}`
                : `${vip.saveCustomization || "SALVAR PERSONALIZAÇÃO"}`}
            </button>
          </section>
        )}
      </div>

      {/* Modal de pagamento (placeholder) */}

      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageStyle = {
  minHeight: "100dvh",
  paddingTop: 90,
  paddingBottom: 40,
  overflowY: "auto",
  paddingLeft: 20,
  paddingRight: 20,
  position: "relative",
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
