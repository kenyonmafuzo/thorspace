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
      padding: "36px 28px",
      gap: 18,
    }}>
      <div style={{ fontSize: 44, lineHeight: 1, filter: "drop-shadow(0 0 12px rgba(0,229,255,0.5))" }}>🔒</div>
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "1.2rem",
        fontWeight: 900,
        color: "#00E5FF",
        letterSpacing: 1,
        textShadow: "0 0 16px rgba(0,229,255,0.4)",
      }}>{title}</div>
      <div style={{ fontSize: 14, color: "#9FF6FF", maxWidth: 340, lineHeight: 1.7, opacity: 0.85 }}>
        {message}
      </div>
      <button
        onClick={() => router.push("/signup")}
        style={{
          marginTop: 8,
          padding: "12px 32px",
          background: "linear-gradient(90deg, #00E5FF, #0072FF)",
          color: "#001018",
          border: "none",
          borderRadius: 10,
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 900,
          fontSize: 13,
          letterSpacing: 1,
          cursor: "pointer",
          boxShadow: "0 0 24px rgba(0,229,255,0.35), 0 4px 16px rgba(0,0,0,0.4)",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        Cadastre-se grátis
      </button>
      <button
        onClick={() => router.push("/login")}
        style={{
          background: "none",
          border: "none",
          color: "#9FF6FF",
          fontSize: 12,
          cursor: "pointer",
          textDecoration: "underline",
          fontFamily: "'Orbitron', sans-serif",
          opacity: 0.7,
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
      backgroundImage: "url('/game/images/galaxy-bg.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(0,229,255,0.10) 0%, rgba(0,20,40,0.97) 100%)",
        border: "2px solid rgba(0,229,255,0.35)",
        borderRadius: 18,
        maxWidth: 440,
        width: "90%",
        boxShadow: "0 8px 48px rgba(0,229,255,0.12), 0 16px 60px rgba(0,0,0,0.6)",
        backdropFilter: "blur(18px)",
      }}>
        {content}
      </div>
    </div>
  );
}

