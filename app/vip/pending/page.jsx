"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function PendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const [dots, setDots] = useState(".");
  const [checking, setChecking] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!checking) return;
    const interval = setInterval(async () => {
      setAttempts((a) => a + 1);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_vip, vip_expires_at")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.is_vip && profile?.vip_expires_at && new Date(profile.vip_expires_at) > new Date()) {
        setChecking(false);
        clearInterval(interval);
        router.push("/vip/success");
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [checking, router]);

  return (
    <div className="pending-card" style={{
      background: "linear-gradient(135deg, rgba(10,14,39,0.98) 0%, rgba(5,5,20,0.98) 100%)",
      border: "2px solid rgba(0,214,90,0.4)",
      borderRadius: 24,
      padding: "48px 40px",
      maxWidth: 460,
      width: "100%",
      textAlign: "center",
    }}>
      <div className="spinner" />

      <h1 style={{
        fontSize: 18,
        fontWeight: 900,
        color: "#00D65A",
        marginBottom: 12,
        letterSpacing: 1,
      }}>
        AGUARDANDO PAGAMENTO
      </h1>

      <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
        {checking
          ? "Verificando confirmação" + dots
          : "Pagamento confirmado! Redirecionando..."}
      </p>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 32 }}>
        Para PIX: abra seu app bancário, escaneie o QR Code e o VIP será ativado automaticamente.
      </p>

      {paymentId && (
        <div style={{
          background: "rgba(0,214,90,0.06)",
          border: "1px solid rgba(0,214,90,0.15)",
          borderRadius: 10,
          padding: "10px 16px",
          marginBottom: 28,
          fontSize: 11,
          color: "#666",
        }}>
          ID: <span style={{ color: "#888" }}>{paymentId}</span>
        </div>
      )}

      {attempts > 10 && (
        <p style={{ color: "#555", fontSize: 11, marginBottom: 20 }}>
          Aguardando confirmação do banco... isso pode levar alguns minutos.
        </p>
      )}

      <Link href="/vip" style={{
        display: "block",
        padding: "14px 24px",
        background: "rgba(0,214,90,0.12)",
        border: "1px solid rgba(0,214,90,0.3)",
        borderRadius: 12,
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 12,
        fontWeight: 700,
        color: "#00D65A",
        textDecoration: "none",
        letterSpacing: 1,
      }}>
        VOLTAR À PÁGINA VIP
      </Link>
    </div>
  );
}

export default function VipPendingPage() {
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
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .spinner {
          width: 48px; height: 48px;
          border: 3px solid rgba(0,214,90,0.2);
          border-top-color: #00D65A;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 24px;
        }
        .pending-card { animation: popIn 0.5s ease both; }
      `}</style>
      <Suspense fallback={<div style={{ color: "#00D65A", fontFamily: "'Orbitron',sans-serif" }}>...</div>}>
        <PendingContent />
      </Suspense>
    </div>
  );
}
