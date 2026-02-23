"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function FailureContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const reason = searchParams.get("failure_reason");

  return (
    <div className="failure-card" style={{
      background: "linear-gradient(135deg, rgba(10,14,39,0.98) 0%, rgba(5,5,20,0.98) 100%)",
      border: "2px solid rgba(255,58,52,0.4)",
      borderRadius: 24,
      padding: "48px 40px",
      maxWidth: 460,
      width: "100%",
      textAlign: "center",
    }}>
      <div className="fail-icon" style={{ fontSize: 72, marginBottom: 20 }}>⚠️</div>

      <h1 style={{
        fontSize: 18,
        fontWeight: 900,
        color: "#ff3a34",
        marginBottom: 12,
        letterSpacing: 1,
      }}>
        PAGAMENTO NÃO CONCLUÍDO
      </h1>

      <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
        Houve um problema ao processar seu pagamento.
      </p>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 32 }}>
        Nenhum valor foi cobrado. Você pode tentar novamente com outro método de pagamento.
      </p>

      {reason && (
        <div style={{
          background: "rgba(255,58,52,0.06)",
          border: "1px solid rgba(255,58,52,0.15)",
          borderRadius: 10,
          padding: "10px 16px",
          marginBottom: 28,
          fontSize: 11,
          color: "#666",
        }}>
          Motivo: <span style={{ color: "#888" }}>{reason}</span>
        </div>
      )}

      <Link href="/vip" style={{
        display: "block",
        padding: "14px 24px",
        backgroundImage: "linear-gradient(90deg, #FFD700 0%, #f59e0b 50%, #FFD700 100%)",
        backgroundSize: "200% auto",
        border: "none",
        borderRadius: 12,
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 13,
        fontWeight: 900,
        color: "#000",
        textDecoration: "none",
        letterSpacing: 1,
        marginBottom: 12,
      }}>
        ↩ TENTAR NOVAMENTE
      </Link>

      <Link href="/mode" style={{
        display: "block",
        padding: "12px 24px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        color: "#666",
        textDecoration: "none",
        letterSpacing: 1,
      }}>
        VOLTAR AO JOGO
      </Link>
    </div>
  );
}

export default function VipFailurePage() {
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
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .failure-card { animation: popIn 0.5s ease both; }
        .fail-icon { display: inline-block; animation: shake 0.6s ease 0.3s; }
      `}</style>
      <Suspense fallback={null}>
        <FailureContent />
      </Suspense>
    </div>
  );
}
