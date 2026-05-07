"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * GuestModal — modal de aviso para visitantes que tentam acessar áreas restritas.
 * Exibido em vez de redirecionar para /login automaticamente.
 *
 * Props:
 *   open     — controla visibilidade
 *   onClose  — callback ao clicar em "Fechar" ou no overlay
 */
export default function GuestModal({ open, onClose }) {
  const router = useRouter();

  // Bloqueia o scroll do body enquanto o modal está aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Fecha com Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0, 4, 20, 0.82)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          position: "relative",
          background: "linear-gradient(160deg, #0d1322 0%, #111827 100%)",
          border: "1px solid rgba(0, 229, 255, 0.18)",
          borderRadius: 18,
          padding: "44px 36px 36px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 0 60px rgba(0, 229, 255, 0.12), 0 16px 64px rgba(0,0,0,0.7)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 0,
        }}
      >
        {/* Botão fechar (X) */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: "absolute",
            top: 14,
            right: 16,
            background: "none",
            border: "none",
            color: "#4b5a72",
            fontSize: 22,
            lineHeight: 1,
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: 6,
            transition: "color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#9FF6FF"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#4b5a72"; }}
        >
          ✕
        </button>

        {/* Ícone */}
        <div style={{
          fontSize: 52,
          lineHeight: 1,
          marginBottom: 20,
          filter: "drop-shadow(0 0 18px rgba(0,229,255,0.45))",
        }}>
          🔒
        </div>

        {/* Título */}
        <div style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "1.15rem",
          fontWeight: 900,
          color: "#00E5FF",
          letterSpacing: 0.5,
          textShadow: "0 0 20px rgba(0,229,255,0.35)",
          marginBottom: 14,
          lineHeight: 1.35,
        }}>
          Área exclusiva para membros
        </div>

        {/* Mensagem */}
        <p style={{
          fontSize: 14,
          color: "#94a3b8",
          lineHeight: 1.75,
          maxWidth: 340,
          margin: "0 0 28px",
        }}>
          Esta página está disponível apenas para jogadores com conta cadastrada.
          Criar uma conta é <strong style={{ color: "#e2e8f0" }}>grátis</strong> e leva menos de um minuto — e você
          libera o modo multiplayer, amigos, rankings e muito mais.
        </p>

        {/* Botão principal */}
        <button
          onClick={() => router.push("/login")}
          style={{
            width: "100%",
            padding: "13px 0",
            background: "linear-gradient(90deg, #00E5FF 0%, #0072FF 100%)",
            color: "#001018",
            border: "none",
            borderRadius: 10,
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 900,
            fontSize: 13,
            letterSpacing: 1,
            cursor: "pointer",
            boxShadow: "0 0 28px rgba(0,229,255,0.3), 0 4px 16px rgba(0,0,0,0.4)",
            transition: "opacity 0.2s",
            marginBottom: 12,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.87"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          ENTRAR / CADASTRE-SE
        </button>
      </div>
    </div>
  );
}
