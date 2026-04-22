"use client";

// Mirrors app/vip/success/page.jsx — confirmation page after Stripe Checkout redirect

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function StripeSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [countdown, setCountdown] = useState(8);
  const [confirming, setConfirming] = useState(true);
  const [confirmResult, setConfirmResult] = useState(null);

  // Call /api/stripe/confirm-session on mount to activate VIP server-side
  useEffect(() => {
    if (!sessionId) {
      setConfirming(false);
      return;
    }
    fetch("/api/stripe/confirm-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        setConfirmResult(data);
        if (data.activated && typeof window !== "undefined") {
          localStorage.setItem(
            "thor_vip_just_activated",
            JSON.stringify({
              plan_label: data.plan_label,
              vip_starts: data.vip_starts,
              vip_expires: data.vip_expires,
            })
          );
        }
      })
      .catch((err) => {
        console.error("[stripe-success] confirm error:", err);
        setConfirmResult({ activated: false, error: err.message });
      })
      .finally(() => setConfirming(false));
  }, [sessionId]);

  // Start countdown only after confirmation attempt
  useEffect(() => {
    if (confirming) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [confirming]);

  // Navigate when countdown reaches 0 — hard reload to get fresh Supabase data
  useEffect(() => {
    if (!confirming && countdown === 0) {
      window.location.href = "/vip";
    }
  }, [countdown, confirming]);

  const fmt = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="card" style={{
      background: "linear-gradient(135deg, rgba(10,14,39,0.98) 0%, rgba(5,5,20,0.98) 100%)",
      border: "2px solid rgba(255,215,0,0.5)",
      borderRadius: 24,
      padding: "48px 40px",
      maxWidth: 460,
      width: "100%",
      textAlign: "center",
      animation: "glow 3s ease infinite",
    }}>
      <div className="crown" style={{ fontSize: 72, marginBottom: 20 }}>
        {confirming ? "⌛" : "💎"}
      </div>

      <h1 style={{
        fontSize: 22,
        fontWeight: 900,
        backgroundImage: "linear-gradient(90deg, #FFD700, #FFF8A0, #FFD700)",
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        animation: "shimmer 3s linear infinite",
        marginBottom: 12,
      }}>
        {confirming ? "ACTIVATING VIP..." : "VIP ACTIVATED! 🎉"}
      </h1>

      {confirming ? (
        <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
          Confirming your payment...
        </p>
      ) : confirmResult?.activated ? (
        <>
          <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
            Your <strong style={{ color: "#FFD700" }}>VIP {confirmResult.plan_label}</strong> is now active!
          </p>
          <div style={{
            background: "rgba(255,215,0,0.06)",
            border: "1px solid rgba(255,215,0,0.2)",
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 28,
            fontSize: 12,
            color: "#aaa",
            lineHeight: 1.8,
          }}>
            <div>⏱ <strong style={{ color: "#FFD700" }}>Start:</strong> {fmt(confirmResult.vip_starts)}</div>
            <div>🏁 <strong style={{ color: "#FFD700" }}>Expires:</strong> {fmt(confirmResult.vip_expires)}</div>
          </div>
        </>
      ) : (
        <>
          <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
            Payment received! Your VIP will be activated shortly.
          </p>
          <p style={{ color: "#555", fontSize: 12, marginBottom: 28 }}>
            If it doesn&apos;t appear within 1 minute, please contact support.
          </p>
        </>
      )}

      {sessionId && (
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8,
          padding: "8px 14px",
          marginBottom: 24,
          fontSize: 10,
          color: "#444",
        }}>
          Session: <span style={{ color: "#666" }}>{sessionId.slice(0, 24)}...</span>
        </div>
      )}

      <Link href="/vip" style={{
        display: "block",
        padding: "14px 24px",
        backgroundImage: "linear-gradient(90deg, #FFD700 0%, #f59e0b 50%, #FFD700 100%)",
        backgroundSize: "200% auto",
        animation: "shimmer 3s linear infinite",
        border: "none",
        borderRadius: 12,
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 13,
        fontWeight: 900,
        color: "#000",
        textDecoration: "none",
        letterSpacing: 1,
        marginBottom: 16,
      }}>
        ⚡ GO TO VIP AREA
      </Link>

      {!confirming && (
        <p style={{ color: "#444", fontSize: 11 }}>
          Redirecting in {countdown}s...
        </p>
      )}
    </div>
  );
}

export default function StripeSuccessPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Orbitron', sans-serif",
      padding: "20px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.4), 0 0 60px rgba(255,215,0,0.15); }
          50% { box-shadow: 0 0 40px rgba(255,215,0,0.7), 0 0 100px rgba(255,215,0,0.3); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .crown { animation: float 3s ease-in-out infinite; display: inline-block; }
        .card { animation: glow 3s ease infinite; }
      `}</style>
      <Suspense fallback={<div style={{ color: "#FFD700", fontFamily: "'Orbitron',sans-serif" }}>...</div>}>
        <StripeSuccessContent />
      </Suspense>
    </div>
  );
}
