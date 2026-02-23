"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function PixContent() {
  const router = useRouter();
  const [pixData, setPixData] = useState(null); // { payment_id, qr_code, qr_code_base64, amount, plan_title, expires_at }
  const [status, setStatus] = useState("pending"); // pending | approved | expired | error
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const pollRef = useRef(null);
  const countdownRef = useRef(null);

  // Load data from sessionStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("thor_pix_pending");
    if (!raw) {
      // No PIX data — redirect back
      window.location.href = "/vip";
      return;
    }
    try {
      const data = JSON.parse(raw);
      setPixData(data);
      // Calculate seconds left from expires_at
      if (data.expires_at) {
        const diff = Math.floor((new Date(data.expires_at) - Date.now()) / 1000);
        setSecondsLeft(diff > 0 ? diff : 0);
      } else {
        setSecondsLeft(30 * 60); // default 30min
      }
    } catch {
      window.location.href = "/vip";
    }
  }, []);

  // Start polling when pixData is ready
  useEffect(() => {
    if (!pixData?.payment_id) return;
    if (status !== "pending") return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mp/pix-status?payment_id=${pixData.payment_id}`);
        const data = await res.json();
        if (data.status === "approved") {
          setStatus("approved");
          clearInterval(pollRef.current);
          clearInterval(countdownRef.current);
          sessionStorage.removeItem("thor_pix_pending");
          setTimeout(() => {
            window.location.href = `/vip/success?payment_id=${pixData.payment_id}&status=approved`;
          }, 2000);
        } else if (data.status === "cancelled" || data.status === "rejected" || data.status === "expired") {
          setStatus("expired");
          clearInterval(pollRef.current);
          clearInterval(countdownRef.current);
        }
      } catch {
        // ignore network errors during poll
      }
    }, 4000);

    return () => clearInterval(pollRef.current);
  }, [pixData, status]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setStatus("expired");
      return;
    }
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(countdownRef.current);
          setStatus((st) => st === "pending" ? "expired" : st);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [secondsLeft !== null]);

  const handleCopy = () => {
    if (!pixData?.qr_code) return;
    navigator.clipboard.writeText(pixData.qr_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const formatSeconds = (s) => {
    if (s === null) return "--:--";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const formatAmount = (v) =>
    v != null ? `R$ ${Number(v).toFixed(2).replace(".", ",")}` : "";

  if (!pixData) {
    return (
      <div style={{ color: "#aaa", fontFamily: "'Orbitron',sans-serif", fontSize: 13 }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(10,14,39,0.98) 0%, rgba(5,5,20,0.98) 100%)",
      border: `2px solid ${status === "approved" ? "rgba(0,255,128,0.5)" : "rgba(0,200,100,0.4)"}`,
      borderRadius: 24,
      padding: "40px 32px",
      maxWidth: 420,
      width: "100%",
      textAlign: "center",
      animation: "cardIn 0.4s ease both",
    }}>

      {status === "approved" ? (
        <>
          <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
          <h2 style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 900,
            color: "#00ff80", marginBottom: 8,
          }}>
            PAGAMENTO CONFIRMADO!
          </h2>
          <p style={{ color: "#aaa", fontSize: 14 }}>Ativando seu VIP...</p>
        </>
      ) : status === "expired" ? (
        <>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⏰</div>
          <h2 style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 900,
            color: "#ff4444", marginBottom: 12,
          }}>
            PIX EXPIRADO
          </h2>
          <p style={{ color: "#aaa", fontSize: 13, marginBottom: 24 }}>
            O código PIX expirou. Gere um novo para continuar.
          </p>
          <Link href="/vip" style={{
            display: "inline-block", padding: "12px 28px",
            background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
            borderRadius: 10, color: "#FFD700",
            fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700,
            textDecoration: "none",
          }}>
            ← VOLTAR
          </Link>
        </>
      ) : (
        <>
          {/* Header */}
          <div style={{ fontSize: 48, marginBottom: 8 }}>💚</div>
          <h2 style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 900,
            color: "#00e676", marginBottom: 4, letterSpacing: 1,
          }}>
            PAGUE VIA PIX
          </h2>
          <p style={{ color: "#aaa", fontSize: 12, marginBottom: 4 }}>
            {pixData.plan_title}
          </p>
          <p style={{
            fontSize: 24, fontWeight: 900, color: "#00e676",
            fontFamily: "'Orbitron',sans-serif", marginBottom: 20,
          }}>
            {formatAmount(pixData.amount)}
          </p>

          {/* QR Code */}
          {pixData.qr_code_base64 && (
            <div style={{
              background: "#fff",
              borderRadius: 12,
              padding: 12,
              display: "inline-block",
              marginBottom: 20,
              boxShadow: "0 0 24px rgba(0,230,118,0.25)",
            }}>
              <img
                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                alt="QR Code PIX"
                style={{ width: 200, height: 200, display: "block" }}
              />
            </div>
          )}

          {/* Instructions */}
          <p style={{ color: "#888", fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
            Abra o app do seu banco, escolha <strong style={{ color: "#fff" }}>Pix</strong> e escaneie o QR code ou use o código abaixo.
          </p>

          {/* Copy-paste code */}
          <div style={{
            background: "rgba(0,230,118,0.06)",
            border: "1px solid rgba(0,230,118,0.2)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 10,
            color: "#555",
            wordBreak: "break-all",
            textAlign: "left",
            maxHeight: 56,
            overflow: "hidden",
            userSelect: "all",
          }}>
            {pixData.qr_code}
          </div>

          <button
            onClick={handleCopy}
            style={{
              width: "100%", padding: "13px",
              background: copied ? "rgba(0,255,128,0.15)" : "rgba(0,230,118,0.1)",
              border: `1px solid ${copied ? "rgba(0,255,128,0.5)" : "rgba(0,230,118,0.3)"}`,
              borderRadius: 10, cursor: "pointer",
              fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700,
              color: copied ? "#00ff80" : "#00e676",
              transition: "all 0.2s",
              marginBottom: 20,
              letterSpacing: 1,
            }}
          >
            {copied ? "✅ COPIADO!" : "📋 COPIAR CÓDIGO PIX"}
          </button>

          {/* Status + countdown */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            color: "#888", fontSize: 11,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#00e676",
              display: "inline-block",
              animation: "pulse 1.2s ease-in-out infinite",
            }} />
            Aguardando pagamento... expira em{" "}
            <span style={{ color: secondsLeft < 60 ? "#ff6b6b" : "#00e676", fontWeight: 700 }}>
              {formatSeconds(secondsLeft)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function VipPixPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at bottom, #010a03 0%, #000516 40%, #000000 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Orbitron', sans-serif",
      padding: "20px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
      <Suspense fallback={<div style={{ color: "#aaa" }}>Carregando...</div>}>
        <PixContent />
      </Suspense>
    </div>
  );
}
