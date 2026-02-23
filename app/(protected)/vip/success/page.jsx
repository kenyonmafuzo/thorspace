"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const status = searchParams.get("status");
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.push("/vip");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

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
      <div className="crown" style={{ fontSize: 72, marginBottom: 20 }}>👑</div>

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
        PAGAMENTO CONFIRMADO!
      </h1>

      <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
        Seu VIP está sendo ativado agora.
      </p>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 32 }}>
        Em alguns instantes você terá acesso a todos os benefícios exclusivos.
      </p>

      {paymentId && (
        <div style={{
          background: "rgba(255,215,0,0.06)",
          border: "1px solid rgba(255,215,0,0.15)",
          borderRadius: 10,
          padding: "10px 16px",
          marginBottom: 28,
          fontSize: 11,
          color: "#666",
        }}>
          ID do pagamento: <span style={{ color: "#888" }}>{paymentId}</span>
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
        ⚡ IR PARA ÁREA VIP
      </Link>

      <p style={{ color: "#444", fontSize: 11 }}>
        Redirecionando em {countdown}s...
      </p>
    </div>
  );
}

export default function VipSuccessPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Orbitron', sans-serif",
      padding: "20px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
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
        .crown { animation: popIn 0.6s ease forwards, float 3s ease-in-out infinite 0.6s; display: inline-block; }
        .card { animation: popIn 0.5s ease 0.1s both; }
      `}</style>
      <Suspense fallback={<div style={{ color: "#FFD700", fontFamily: "'Orbitron',sans-serif" }}>⏳</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
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
        .crown { animation: popIn 0.6s ease forwards, float 3s ease-in-out infinite 0.6s; display: inline-block; }
        .card { animation: popIn 0.5s ease 0.1s both; }
      `}</style>

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
        <div className="crown" style={{ fontSize: 72, marginBottom: 20 }}>👑</div>

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
          PAGAMENTO CONFIRMADO!
        </h1>

        <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
          Seu VIP está sendo ativado agora.
        </p>
        <p style={{ color: "#666", fontSize: 12, marginBottom: 32 }}>
          Em alguns instantes você terá acesso a todos os benefícios exclusivos.
        </p>

        {paymentId && (
          <div style={{
            background: "rgba(255,215,0,0.06)",
            border: "1px solid rgba(255,215,0,0.15)",
            borderRadius: 10,
            padding: "10px 16px",
            marginBottom: 28,
            fontSize: 11,
            color: "#666",
          }}>
            ID do pagamento: <span style={{ color: "#888" }}>{paymentId}</span>
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
          ⚡ IR PARA ÁREA VIP
        </Link>

        <p style={{ color: "#444", fontSize: 11 }}>
          Redirecionando em {countdown}s...
        </p>
      </div>
    </div>
  );
}
