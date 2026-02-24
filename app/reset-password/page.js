"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false); // session recovery detected

  useEffect(() => {
    // Supabase automatically parses the #access_token from the URL and fires PASSWORD_RECOVERY
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if session already exists (e.g. user refreshed the page)
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message || "Erro ao atualizar senha.");
      } else {
        setSuccess(true);
        setTimeout(() => router.replace("/login"), 2500);
      }
    } catch (e) {
      console.error(e);
      setError("Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Styles ────────────────────────────────────────────────────────────────
  const pageStyles = {
    minHeight: "100dvh",
    width: "100vw",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    boxSizing: "border-box",
    backgroundColor: "#000016",
    backgroundImage:
      "radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)",
    position: "relative",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  };

  const overlayStyle = {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    backgroundImage: "url('/game/images/galaxiaintro.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    opacity: 0.18,
    pointerEvents: "none",
  };

  const wrapper = {
    width: "min(420px, 92vw)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  };

  const logoStyles = {
    width: "100%",
    maxWidth: 420,
    height: "auto",
    display: "block",
    margin: "0 auto 18px auto",
    objectFit: "contain",
  };

  const card = {
    width: "100%",
    marginTop: -100,
    position: "relative",
    zIndex: 1,
    borderRadius: 14,
    padding: 22,
    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
    border: "1px solid rgba(0,230,255,0.06)",
    backdropFilter: "blur(6px) saturate(120%)",
    WebkitBackdropFilter: "blur(6px) saturate(120%)",
    color: "#E6FBFF",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 42px 12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.35)",
    color: "#E6FBFF",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const primaryBtn = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(90deg, #00E5FF, #0072FF)",
    color: "#001018",
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: 15,
    boxShadow: "0 0 20px #0ff5",
    marginTop: 16,
    marginBottom: 8,
    opacity: loading ? 0.75 : 1,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const eyeButton = {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main style={pageStyles}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={overlayStyle} aria-hidden />
      <div style={wrapper}>
        <img src="/game/images/thorspace.png" alt="Thorspace" style={logoStyles} />

        <div style={card}>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 6, color: "#E6FBFF" }}>
            Resetar Senha
          </h2>

          {success ? (
            <div style={{ padding: "16px", borderRadius: 10, background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.3)", color: "#00E5FF", fontSize: 14, textAlign: "center", lineHeight: 1.6 }}>
              ✅ Senha atualizada com sucesso!<br />
              <span style={{ fontSize: 12, color: "rgba(230,251,255,0.7)" }}>Redirecionando para o login...</span>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: "center", color: "rgba(230,251,255,0.6)", fontSize: 14, padding: "20px 0" }}>
              <p style={{ marginBottom: 12 }}>Verificando link...</p>
              <p style={{ fontSize: 12 }}>
                Se nada acontecer,{" "}
                <a href="/login" style={{ color: "#9FF6FF" }}>volte ao login</a>{" "}
                e solicite um novo link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: 13, color: "rgba(230,251,255,0.7)", marginBottom: 16 }}>
                Digite sua nova senha abaixo.
              </p>

              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Nova senha</label>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <input
                  style={inputStyle}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  style={eyeButton}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5C8.24 5 4.82 7.58 2.46 11.41c-.37.62-.37 1.57 0 2.19C4.82 17.42 8.24 20 12 20s7.18-2.58 9.54-6.4c.37-.62.37-1.57 0-2.19C19.18 7.58 15.76 5 12 5z" stroke="#E6FBFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3.5" stroke="#E6FBFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 2L22 22" stroke="#E6FBFF" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M6.71 6.7C4.98 7.9 3.53 9.59 2.46 11.4c-.37.62-.37 1.57 0 2.19 1.92 3.23 5.68 6.41 9.54 6.41 1.74 0 3.41-.49 4.87-1.37M17.94 17.94c1.65-1.18 3.03-2.79 4.14-4.54.37-.62.37-1.57 0-2.19C20.16 8 16.4 4.82 12.54 4.82c-1.26 0-2.49.27-3.64.76m1.79 1.79a3.5 3.5 0 014.95 4.95" stroke="#E6FBFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>

              <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Confirmar nova senha</label>
              <div style={{ position: "relative", marginBottom: 4 }}>
                <input
                  style={inputStyle}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                />
              </div>

              {error && <div style={{ color: "#FFB3B3", fontSize: 13, marginTop: 6 }}>{error}</div>}

              <button
                style={primaryBtn}
                type="submit"
                disabled={loading}
                onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(0,229,255,0.6), 0 8px 20px rgba(0,114,255,0.4)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 20px #0ff5"; }}
              >
                {loading ? "Salvando..." : "SALVAR NOVA SENHA"}
              </button>
            </form>
          )}

          <div style={{ marginTop: 16, textAlign: "center" }}>
            <a href="/login" style={{ color: "#9FF6FF", fontSize: 13 }}>← Voltar ao login</a>
          </div>
        </div>
      </div>
    </main>
  );
}
