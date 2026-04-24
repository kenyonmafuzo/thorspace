"use client";
import { useRouter } from "next/navigation";

/**
 * GuestWall — shows a CTA overlay when a guest tries to access a restricted page.
 * Usage: render at the top of the page component when isGuest === true.
 *
 * Props:
 *   title     — headline (default: "Crie sua conta")
 *   message   — body text
 *   fullPage  — if true, takes full viewport; if false, renders as a card
 */
export default function GuestWall({
  title = "Crie sua conta",
  message = "Esta área é exclusiva para usuários cadastrados.",
  fullPage = true,
}) {
  const router = useRouter();

  const content = (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "2.5rem 1.5rem",
      gap: 16,
    }}>
      <div style={{ fontSize: 44, lineHeight: 1 }}>🔒</div>
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "1.25rem",
        fontWeight: 800,
        color: "#e2e8f0",
      }}>{title}</div>
      <div style={{ fontSize: 15, color: "#94a3b8", maxWidth: 360, lineHeight: 1.6 }}>
        {message}
      </div>
      <button
        onClick={() => router.push("/login")}
        style={{
          marginTop: 8,
          padding: "0.7rem 2.2rem",
          background: "linear-gradient(90deg, #6366f1, #818cf8)",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
        }}
      >
        Cadastre-se
      </button>
      <button
        onClick={() => router.push("/login")}
        style={{
          background: "none",
          border: "none",
          color: "#64748b",
          fontSize: 13,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Já tenho conta — fazer login
      </button>
    </div>
  );

  if (!fullPage) return content;

  return (
    <div style={{
      minHeight: "60vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: "rgba(30,42,80,0.85)",
        border: "1px solid #334155",
        borderRadius: 16,
        maxWidth: 460,
        width: "90%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      }}>
        {content}
      </div>
    </div>
  );
}
