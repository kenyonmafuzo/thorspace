"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureProfileAndOnboarding } from "@/lib/ensureProfile";
import SocialLinksMini from "@/app/components/SocialLinksMini";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    // Verificar se veio do signup com parâmetro msg=confirm_email
    const params = new URLSearchParams(window.location.search);
    if (params.get('msg') === 'confirm_email') {
      setInfoMessage("✉️ Verifique seu email para confirmar o cadastro antes de fazer login.");
    }

    let mounted = true;

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn("getSession error:", error);

        const session = data?.session;
        if (!mounted) return;

        if (session) {
          router.replace("/mode");
        } else {
          setAuthChecked(true);
        }
      } catch (e) {
        console.error("Session check failed, clearing local session:", e);
        try {
          await supabase.auth.signOut();
        } catch (er) {
          console.warn("signOut failed while clearing session:", er);
        }
        if (mounted) setAuthChecked(true);
      }
    }

    checkSession();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let loginEmail = String(email).trim();
      
      // Verificar se é username ao invés de email (não contém @)
      if (!loginEmail.includes('@')) {
        console.log('[LOGIN] Detectado username, buscando email...');
        
        // Usar função RPC para buscar email pelo username
        const { data: emailData, error: rpcError } = await supabase
          .rpc('get_email_by_username', { username_input: loginEmail });
        
        if (rpcError || !emailData) {
          console.error('[LOGIN] Erro ao buscar email:', rpcError);
          setError('Usuário não encontrado');
          setLoading(false);
          return;
        }
        
        loginEmail = emailData;
        console.log('[LOGIN] ✅ Email encontrado para username');
      }

      const { error: err } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: String(password),
      });

      if (err) {
        setError(err.message || "Erro ao entrar");
        return;
      }

      try {
        // Busca usuário logado
        const { data: udata, error: uerr } = await supabase.auth.getUser();
        if (uerr) {
          console.error("Erro ao buscar usuário após login:", uerr);
          setError("Erro ao buscar usuário após login.");
          setLoading(false);
          return;
        }
        const user = udata?.user;
        if (!user?.id) {
          console.error("Usuário sem ID após login:", user);
          setError("Usuário sem ID após login.");
          setLoading(false);
          return;
        }
        // Garante perfil e player_progress completos
        const userObj = { id: user.id, email: user.email, user_metadata: user.user_metadata };
        try {
          const onboardingResult = await ensureProfileAndOnboarding(userObj);
          console.log("Login onboarding result:", onboardingResult);
          if (onboardingResult?.error) {
            setError("Erro ao criar perfil/jogo: " + (onboardingResult.error || "Desconhecido"));
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Erro ao garantir perfil completo:", e);
          setError("Erro ao garantir perfil completo: " + (e?.message || e));
          setLoading(false);
          return;
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("thor_stats_updated"));
        }
        router.replace("/mode");
      } catch (e) {
        console.error("Error ensuring profile after login:", e);
        setError("Erro ao completar login. Tente novamente.");
      }
    } catch (e) {
      console.error(e);
      setError("Erro desconhecido ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (err) {
        setResetError(err.message || "Erro ao enviar email");
      } else {
        setResetSent(true);
      }
    } catch (e) {
      console.error(e);
      setResetError("Erro desconhecido");
    } finally {
      setResetLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    } catch (e) {
      console.error(e);
      setError("Erro ao iniciar OAuth com Google");
    }
  }

  // Não renderiza até verificar autenticação
  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        color: '#fff'
      }}>
        Carregando...
      </div>
    );
  }

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
      "radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%), url('/game/images/galaxiaintro.png')",
    backgroundSize: "cover, cover",
    backgroundRepeat: "no-repeat, no-repeat",
    backgroundPosition: "center center, center center",
    position: "relative",
    fontFamily:
      "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  };

  const overlayStyle = {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    backgroundImage: "url('/game/images/galaxiaintro.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.18,
    pointerEvents: 'none',
  };

  const wrapper = {
    width: "min(420px, 92vw)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: 'relative',
    zIndex: 1,
  };

  // Logo fora do box e com mesma largura do box
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
    position: 'relative',
    zIndex: 1,
    borderRadius: 14,
    padding: 22,
    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
    border: "1px solid rgba(0,230,255,0.06)",
    backdropFilter: "blur(6px) saturate(120%)",
    WebkitBackdropFilter: "blur(6px) saturate(120%)",
    color: "#E6FBFF",
  };

  const input = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.35)",
    color: "#E6FBFF",
    outline: "none",
    marginBottom: 10,
    fontSize: 14,
  };

  const passwordWrapper = {
    position: "relative",
    width: "100%",
    marginBottom: 10,
  };

  const passwordInput = {
    width: "100%",
    padding: "12px 42px 12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.35)",
    color: "#E6FBFF",
    outline: "none",
    fontSize: 14,
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
    transition: "opacity 0.2s",
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
    marginBottom: 8,
    opacity: loading ? 0.75 : 1,
    transform: "translateY(0)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const googleBtn = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "#E6FBFF",
    display: "flex",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    cursor: "pointer",
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 600,
    marginBottom: 8,
  };

  const smallText = { fontSize: 13, color: "rgba(230,251,255,0.8)" };
  const errorStyle = { color: "#FFB3B3", marginTop: 8 };

  return (
    <main style={pageStyles}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={overlayStyle} aria-hidden />
      <div style={wrapper}>
        <img
          src="/game/images/thorspace.png"
          alt="Thorspace"
          style={logoStyles}
        />

        <div style={card}>
          {infoMessage && (
            <div style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: 'rgba(0, 229, 255, 0.1)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              color: '#00E5FF',
              fontSize: 13,
              marginBottom: 16,
              textAlign: 'center',
            }}>
              {infoMessage}
            </div>
          )}
          
          {showForgotPassword ? (
            <div>
              <button
                type="button"
                onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetError(""); setResetEmail(""); }}
                style={{ background: 'none', border: 'none', color: '#9FF6FF', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                ← Voltar ao login
              </button>
              <p style={{ fontSize: 14, color: '#E6FBFF', marginBottom: 16, lineHeight: 1.5 }}>
                Digite seu email e enviaremos um link para resetar sua senha.
              </p>
              {resetSent ? (
                <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.3)', color: '#00E5FF', fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
                  ✉️ Link enviado!<br />
                  <span style={{ fontSize: 12, color: 'rgba(230,251,255,0.7)' }}>Verifique sua caixa de entrada (e spam).</span>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Email</label>
                  <input
                    style={input}
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="seu@email.com"
                  />
                  {resetError && <div style={{ color: '#FFB3B3', fontSize: 13, marginBottom: 8 }}>{resetError}</div>}
                  <button
                    style={{ ...primaryBtn, opacity: resetLoading ? 0.75 : 1 }}
                    type="submit"
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Enviando...' : 'ENVIAR LINK'}
                  </button>
                </form>
              )}
            </div>
          ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
              Email ou Username
            </label>
            <input
              style={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="text"
              required
              autoComplete="username email"
              placeholder="seu@email.com ou seu_username"
            />

            <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
              Senha
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setError(""); }}
                style={{ background: 'none', border: 'none', color: '#9FF6FF', cursor: 'pointer', fontSize: 12, padding: 0, opacity: 0.85 }}
              >
                Esqueceu sua senha?
              </button>
            </div>
            <div style={passwordWrapper}>
              <input
                style={passwordInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                style={eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  // Olho normal (senha visível - clicar para ocultar)
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5C8.24 5 4.82 7.58 2.46 11.41c-.37.62-.37 1.57 0 2.19C4.82 17.42 8.24 20 12 20s7.18-2.58 9.54-6.4c.37-.62.37-1.57 0-2.19C19.18 7.58 15.76 5 12 5z" stroke="#E6FBFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3.5" stroke="#E6FBFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  // Olho com risco (senha oculta - clicar para visualizar)
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 2L22 22" stroke="#E6FBFF" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6.71 6.7C4.98 7.9 3.53 9.59 2.46 11.4c-.37.62-.37 1.57 0 2.19 1.92 3.23 5.68 6.41 9.54 6.41 1.74 0 3.41-.49 4.87-1.37M17.94 17.94c1.65-1.18 3.03-2.79 4.14-4.54.37-.62.37-1.57 0-2.19C20.16 8 16.4 4.82 12.54 4.82c-1.26 0-2.49.27-3.64.76m1.79 1.79a3.5 3.5 0 014.95 4.95" stroke="#E6FBFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>

            <button 
              style={primaryBtn} 
              type="submit" 
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0,229,255,0.6), 0 8px 20px rgba(0,114,255,0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 20px #0ff5';
              }}
            >
              {loading ? "Entrando..." : "ENTRAR"}
            </button>
          </form>
          )}

          <button style={googleBtn} onClick={signInWithGoogle} type="button">
            <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            <span>ENTRAR COM GOOGLE</span>
          </button>

          {error ? <div style={errorStyle}>{error}</div> : null}

          <div style={{ height: 12 }} />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={smallText}>Ainda não tem conta?</div>
            <a href="/signup" style={{ color: "#9FF6FF", fontWeight: 700 }}>CADASTRE-SE</a>
          </div>

          <div style={{ height: 8 }} />
          <div
            style={{
              fontSize: 12,
              color: "rgba(230,251,255,0.6)",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            Ao entrar você aceita os termos e políticas.
          </div>
        </div>
        {/* Social links row outside the card, single line */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 18, marginBottom: 2 }}>
          <div style={{ maxWidth: 220, width: '100%', textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#9FF6FF', opacity: 0.6, marginRight: 6 }}>Follow</span>
            <SocialLinksMini />
          </div>
        </div>
      </div>
    </main>
  );
}
