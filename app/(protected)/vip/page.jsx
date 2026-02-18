"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const PLANS_BRL = [
  {
    id: "1day",
    label: "VIP 1 Dia",
    sublabel: "Experimente agora",
    price: "R$ 4,90",
    priceNum: 4.9,
    days: 1,
    badge: null,
    accent: "#00E5FF",
  },
  {
    id: "7days",
    label: "VIP 7 Dias",
    sublabel: "Uma semana épica",
    price: "R$ 14,90",
    priceNum: 14.9,
    days: 7,
    badge: null,
    accent: "#a855f7",
  },
  {
    id: "15days",
    label: "VIP 15 Dias",
    sublabel: "Meio mês de domínio",
    price: "R$ 24,90",
    priceNum: 24.9,
    days: 15,
    badge: null,
    accent: "#f59e0b",
  },
  {
    id: "30days",
    label: "VIP 30 Dias",
    sublabel: "Melhor custo-benefício",
    price: "R$ 39,90",
    priceNum: 39.9,
    days: 30,
    badge: "MELHOR OFERTA",
    accent: "#FFD700",
  },
];

const PLANS_USD = [
  {
    id: "1day",
    label: "VIP 1 Day",
    sublabel: "Try it now",
    price: "$0.99",
    priceNum: 0.99,
    days: 1,
    badge: null,
    accent: "#00E5FF",
  },
  {
    id: "7days",
    label: "VIP 7 Days",
    sublabel: "One epic week",
    price: "$2.99",
    priceNum: 2.99,
    days: 7,
    badge: null,
    accent: "#a855f7",
  },
  {
    id: "15days",
    label: "VIP 15 Days",
    sublabel: "Half a month of dominance",
    price: "$4.99",
    priceNum: 4.99,
    days: 15,
    badge: null,
    accent: "#f59e0b",
  },
  {
    id: "30days",
    label: "VIP 30 Days",
    sublabel: "Best value",
    price: "$7.99",
    priceNum: 7.99,
    days: 30,
    badge: "BEST DEAL",
    accent: "#FFD700",
  },
];

const BENEFITS = [
  { icon: "💬", title: "Cor VIP no Chat", desc: "Seu nome aparece em dourado para todos no chat global" },
  { icon: "🖼️", title: "Moldura Exclusiva", desc: "Moldura especial animada no seu level e tier" },
  { icon: "💎", title: "Ícone Diamante", desc: "Ícone de diamante brilhante ao lado do seu nome" },
  { icon: "🏅", title: "Selo VIP", desc: "Selo VIP exibido em modais, perfil e lista de jogadores" },
  { icon: "🛍️", title: "Loja VIP", desc: "Acesso à loja exclusiva com itens que ninguém mais tem" },
  { icon: "🚀", title: "Naves Premium", desc: "Skins exclusivas de naves com visuais épicos" },
  { icon: "🎨", title: "Ícones de Perfil", desc: "Avatares e ícones de perfil exclusivos VIP" },
  { icon: "⚡", title: "Efeitos Visuais", desc: "Cores e efeitos especiais nos tiros, raios e explosões" },
  { icon: "😎", title: "Emojis Especiais", desc: "Pack de emojis exclusivos para usar no chat" },
];

export default function VIPPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState("BRL"); // BRL ou USD
  const [selectedPlan, setSelectedPlan] = useState("30days");
  const [paymentMethod, setPaymentMethod] = useState("pix"); // pix | credit
  const [profile, setProfile] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState(null);

  const plans = currency === "BRL" ? PLANS_BRL : PLANS_USD;
  const currentPlan = plans.find((p) => p.id === selectedPlan) || plans[3];

  useEffect(() => {
    // Detectar moeda pelo idioma/locale do browser
    const locale = navigator.language || "pt-BR";
    setCurrency(locale.startsWith("pt") ? "BRL" : "USD");

    // Buscar perfil
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, avatar_preset, is_vip, vip_expires_at")
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
        currency === "BRL" ? "pt-BR" : "en-US",
        { day: "2-digit", month: "short", year: "numeric" }
      )
    : null;

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
          ← Voltar
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28, animation: "crownGlow 2s infinite" }}>👑</span>
          <span style={{
            fontSize: 22,
            fontWeight: 900,
            fontFamily: "'Orbitron', sans-serif",
            background: "linear-gradient(90deg, #FFD700, #FFF8A0, #FFD700)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite",
          }}>
            THORSPACE VIP
          </span>
        </div>

        {/* Currency toggle */}
        <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: 4 }}>
          {["BRL", "USD"].map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              style={{
                padding: "4px 14px",
                borderRadius: 6,
                border: "none",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                background: currency === c ? "linear-gradient(90deg, #FFD700, #f59e0b)" : "transparent",
                color: currency === c ? "#000" : "#888",
                transition: "all 0.2s",
              }}
            >
              {c === "BRL" ? "🇧🇷 BRL" : "🇺🇸 USD"}
            </button>
          ))}
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
              VIP ATIVO
            </div>
            <div style={{ color: "#ccc", fontSize: 12, marginTop: 2 }}>
              Expira em {vipExpiresDate}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 960, margin: "0 auto", width: "100%", animation: "fadeIn 0.4s ease-out" }}>

        {/* Hero section */}
        <div style={heroStyle}>
          <span style={{ fontSize: 56, display: "block", animation: "starFloat 3s ease-in-out infinite" }}>👑</span>
          <h1 style={{
            margin: "12px 0 8px 0",
            fontSize: "clamp(22px, 4vw, 36px)",
            fontWeight: 900,
            fontFamily: "'Orbitron', sans-serif",
            background: "linear-gradient(90deg, #FFD700 0%, #FFF8A0 50%, #FFD700 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite",
            textAlign: "center",
          }}>
            Torne-se VIP
          </h1>
          <p style={{ color: "#aaa", fontSize: 15, margin: 0, textAlign: "center", maxWidth: 480 }}>
            Benefícios exclusivos 100% estéticos. Domine o visual sem alterar o jogo.
          </p>
        </div>

        {/* Benefits grid */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={sectionTitleStyle}>✨ Benefícios VIP</h2>
          <div style={benefitsGridStyle}>
            {BENEFITS.map((b) => (
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
          <h2 style={sectionTitleStyle}>💎 Escolha seu Plano</h2>
          <div style={plansGridStyle}>
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  className="vip-plan-card"
                  onClick={() => setSelectedPlan(plan.id)}
                  style={{
                    position: "relative",
                    borderRadius: 16,
                    padding: "24px 20px",
                    cursor: "pointer",
                    background: isSelected
                      ? `linear-gradient(135deg, rgba(${plan.accent === '#FFD700' ? '255,215,0' : plan.accent === '#00E5FF' ? '0,229,255' : plan.accent === '#a855f7' ? '168,85,247' : '245,158,11'},0.15) 0%, rgba(10,14,39,0.95) 100%)`
                      : "linear-gradient(135deg, rgba(10,14,39,0.9) 0%, rgba(5,5,20,0.9) 100%)",
                    border: isSelected
                      ? `2px solid ${plan.accent}`
                      : "2px solid rgba(255,255,255,0.1)",
                    boxShadow: isSelected
                      ? `0 0 24px ${plan.accent}44, 0 4px 20px rgba(0,0,0,0.4)`
                      : "0 4px 20px rgba(0,0,0,0.3)",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  {plan.badge && (
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
                      ⭐ {plan.badge}
                    </div>
                  )}

                  {isSelected && (
                    <div style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: plan.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}>✓</div>
                  )}

                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: "'Orbitron',sans-serif",
                    color: isSelected ? plan.accent : "#ccc",
                    marginBottom: 4,
                    letterSpacing: 1,
                  }}>
                    {plan.label}
                  </div>
                  <div style={{ color: "#666", fontSize: 11, marginBottom: 16 }}>
                    {plan.sublabel}
                  </div>
                  <div style={{
                    fontSize: "clamp(20px, 3vw, 28px)",
                    fontWeight: 900,
                    fontFamily: "'Orbitron',sans-serif",
                    color: isSelected ? plan.accent : "#fff",
                  }}>
                    {plan.price}
                  </div>
                  <div style={{ color: "#555", fontSize: 11, marginTop: 4 }}>
                    {plan.days} {plan.days === 1 ? (currency === "BRL" ? "dia" : "day") : (currency === "BRL" ? "dias" : "days")}
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
          <h2 style={{ ...sectionTitleStyle, marginBottom: 20 }}>💳 Forma de Pagamento</h2>

          <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            {/* PIX - só BRL */}
            {currency === "BRL" && (
              <button
                onClick={() => setPaymentMethod("pix")}
                style={{
                  flex: 1,
                  minWidth: 130,
                  padding: "16px 20px",
                  borderRadius: 12,
                  border: paymentMethod === "pix" ? "2px solid #00D65A" : "2px solid rgba(255,255,255,0.1)",
                  background: paymentMethod === "pix" ? "rgba(0,214,90,0.12)" : "rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 28 }}>⚡</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: paymentMethod === "pix" ? "#00D65A" : "#aaa" }}>
                  PIX
                </span>
                <span style={{ fontSize: 10, color: "#666" }}>Aprovação imediata</span>
              </button>
            )}

            {/* Cartão de crédito */}
            <button
              onClick={() => setPaymentMethod("credit")}
              style={{
                flex: 1,
                minWidth: 130,
                padding: "16px 20px",
                borderRadius: 12,
                border: paymentMethod === "credit" ? "2px solid #00E5FF" : "2px solid rgba(255,255,255,0.1)",
                background: paymentMethod === "credit" ? "rgba(0,229,255,0.10)" : "rgba(255,255,255,0.04)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 28 }}>💳</span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: paymentMethod === "credit" ? "#00E5FF" : "#aaa" }}>
                {currency === "BRL" ? "Cartão de Crédito" : "Credit Card"}
              </span>
              <span style={{ fontSize: 10, color: "#666" }}>Visa, Master, Elo</span>
            </button>

            {/* Débito */}
            <button
              onClick={() => setPaymentMethod("debit")}
              style={{
                flex: 1,
                minWidth: 130,
                padding: "16px 20px",
                borderRadius: 12,
                border: paymentMethod === "debit" ? "2px solid #a855f7" : "2px solid rgba(255,255,255,0.1)",
                background: paymentMethod === "debit" ? "rgba(168,85,247,0.10)" : "rgba(255,255,255,0.04)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 28 }}>🏧</span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: paymentMethod === "debit" ? "#a855f7" : "#aaa" }}>
                {currency === "BRL" ? "Débito" : "Debit"}
              </span>
              <span style={{ fontSize: 10, color: "#666" }}>Visa, Master</span>
            </button>
          </div>

          {/* Resumo do pedido */}
          <div style={{
            background: "rgba(255,215,0,0.06)",
            border: "1px solid rgba(255,215,0,0.2)",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}>
            <div>
              <div style={{ color: "#FFD700", fontWeight: 700, fontFamily: "'Orbitron',sans-serif", fontSize: 13 }}>
                👑 {currentPlan.label}
              </div>
              <div style={{ color: "#888", fontSize: 12, marginTop: 3 }}>
                {currency === "BRL" ? "via" : "via"} {paymentMethod === "pix" ? "PIX" : paymentMethod === "credit" ? (currency === "BRL" ? "Cartão de Crédito" : "Credit Card") : (currency === "BRL" ? "Débito" : "Debit")}
              </div>
            </div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, fontWeight: 900, color: "#FFD700" }}>
              {currentPlan.price}
            </div>
          </div>

          {/* Botão pagar */}
          <button
            className="pay-btn"
            onClick={() => setShowPaymentModal(true)}
            style={{
              width: "100%",
              padding: "16px 24px",
              background: "linear-gradient(90deg, #FFD700 0%, #f59e0b 50%, #FFD700 100%)",
              backgroundSize: "200% auto",
              animation: "shimmer 3s linear infinite",
              border: "none",
              borderRadius: 12,
              fontFamily: "'Orbitron',sans-serif",
              fontSize: 15,
              fontWeight: 900,
              color: "#000",
              cursor: "pointer",
              letterSpacing: 1,
              boxShadow: "0 0 30px rgba(255,215,0,0.4), 0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            ⚡ ATIVAR VIP AGORA — {currentPlan.price}
          </button>

          <p style={{ color: "#555", fontSize: 11, textAlign: "center", marginTop: 12 }}>
            🔒 {currency === "BRL" ? "Pagamento seguro. Sem renovação automática." : "Secure payment. No auto-renewal."}
          </p>
        </section>
      </div>

      {/* Modal de pagamento (placeholder — integrar gateway real) */}
      {showPaymentModal && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 99999,
        }}>
          <div style={{
            width: "90%",
            maxWidth: 440,
            background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)",
            border: "2px solid rgba(255,215,0,0.5)",
            borderRadius: 20,
            overflow: "hidden",
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
                  Confirmação VIP
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
                EM BREVE
              </div>
              <div style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                O sistema de pagamento está sendo integrado.<br />
                Em breve você poderá ativar o VIP com {paymentMethod === "pix" ? "PIX" : paymentMethod === "credit" ? (currency === "BRL" ? "Cartão de Crédito" : "Credit Card") : (currency === "BRL" ? "Débito" : "Debit")}.<br /><br />
                <span style={{ color: "#FFD700", fontWeight: 600 }}>Plano selecionado: {currentPlan.label} — {currentPlan.price}</span>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  background: "linear-gradient(90deg, #FFD700, #f59e0b)",
                  border: "none",
                  borderRadius: 10,
                  fontFamily: "'Orbitron',sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#000",
                  cursor: "pointer",
                  letterSpacing: 1,
                }}
              >
                OK, ENTENDIDO
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
