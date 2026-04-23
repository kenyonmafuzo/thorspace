"use client";
// app/admin/(protected)/error.jsx
// Error boundary for all admin protected pages.
// Shows the actual error message instead of a blank Next.js error screen.

import { useEffect } from "react";

export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error("[Admin Error]", error);
  }, [error]);

  return (
    <div style={{
      padding: "2.5rem",
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
      maxWidth: 600,
    }}>
      <h2 style={{ color: "#f87171", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
        Erro na página
      </h2>
      <p style={{ color: "#94a3b8", fontSize: "0.88rem", margin: 0 }}>
        Ocorreu um erro ao carregar essa seção do painel.
      </p>
      {error?.message && (
        <pre style={{
          background: "#0f1117",
          border: "1px solid #3f1515",
          borderRadius: 8,
          padding: "0.75rem 1rem",
          color: "#fca5a5",
          fontSize: "0.78rem",
          overflowX: "auto",
          margin: 0,
        }}>
          {error.message}
        </pre>
      )}
      <button
        onClick={reset}
        style={{
          alignSelf: "flex-start",
          background: "#6366f1",
          border: "none",
          borderRadius: 8,
          color: "#fff",
          padding: "0.5rem 1rem",
          fontSize: "0.88rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
