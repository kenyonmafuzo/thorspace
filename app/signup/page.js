"use client";

import { useState, useContext } from "react";
import { UserStatsContext } from "@/app/components/stats/UserStatsProvider";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createInboxMessage } from "@/lib/inbox";

export default function SignupPage() {
    const userStatsCtx = useContext(UserStatsContext);
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Estados de erro por campo
  const [fullNameError, setFullNameError] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [logoImageWorks, setLogoImageWorks] = useState(true);

  function validateFullName(name) {
    if (!name) return false;
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.length >= 2;
  }

  function validateUsername(u) {
    return /^[a-zA-Z0-9_]{3,16}$/.test(u);
  }

  function validateEmail(e) {
    return /\S+@\S+\.\S+/.test(e);
  }

  function validatePassword(p) {
    return p.length >= 8 && /\d/.test(p);
  }

  async function checkUsernameAvailable(u) {
    // Try to query `profiles`, but be tolerant to missing tables or benign errors.
    try {
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", u)
        .limit(1);

      if (pErr) {
        const msg = String(pErr.message || "").toLowerCase();
        // If table doesn't exist, treat as empty (no conflict)
        if (!/relation .* does not exist|not exist|does not exist|no such table/i.test(msg)) {
          console.warn("profiles query error (ignored):", pErr.message || pErr);
        }
      }

      if (Array.isArray(pData) && pData.length) return false;

      // Fallback: check `users_public` if present
      // Fallback removido: não consultar users_public, só profiles

      // If we reach here, no matching rows found (or checks were skipped) — assume available
      return true;
    } catch (e) {
      // Unexpected error: log and assume available so signup can continue; the upsert step will enforce uniqueness if DB constraint exists.
      console.warn("Username check unexpected error, assuming available:", e);
      return true;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFullNameError(false);
    setUsernameError(false);
    setEmailError(false);
    setPasswordError(false);
    setConfirmError(false);

    // Client validations
    if (!validateFullName(fullName)) {
      setFullNameError(true);
      setError("Informe seu nome completo (mínimo 2 palavras).");
      return;
    }
    if (!validateUsername(username)) {
      setUsernameError(true);
      setError("Username inválido: use 3-16 chars, letras, números ou underscore.");
      return;
    }
    if (!validateEmail(email)) {
      setEmailError(true);
      setError("Email inválido.");
      return;
    }
    if (!validatePassword(password)) {
      setPasswordError(true);
      setError("Senha inválida: mínimo 8 caracteres e pelo menos 1 número.");
      return;
    }
    if (password !== confirm) {
      setConfirmError(true);
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const available = await checkUsernameAvailable(username);
      if (!available) {
        setError("Nome de usuário já está em uso.");
        setLoading(false);
        return;
      }
    } catch (e) {
      setError("Não foi possível verificar disponibilidade do username. Tente novamente.");
      setLoading(false);
      return;
    }

    try {
      // create account
      const resp = await supabase.auth.signUp({
        email: String(email).trim(),
        password: String(password),
        options: {
          data: {
            username: username.trim(),
          }
        }
      });

      if (resp.error) {
        console.error("Erro no signup:", resp.error);
        // AAA: mensagem clara para e-mail já cadastrado
        if (resp.error.status === 422 && resp.error.message && resp.error.message.toLowerCase().includes("already registered")) {
          setError("Este e-mail já está cadastrado. <a href='/login' style='color:#00E5FF;text-decoration:underline;'>Fazer login</a> ou use outro e-mail.");
        } else {
          setError(resp.error.message || "Erro ao criar conta.");
        }
        setLoading(false);
        return;
      }

      // Aguarda sessão do Supabase
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user;
      if (!sessionUser || !sessionUser.id) {
        setError("Conta criada! Confirme seu email para ativar o acesso.");
        setSuccess("");
        setLoading(false);
        return;
      }

      // AAA: Só libera o app após garantir profile/username no banco
      let confirmedProfile = null;
      for (let i = 0; i < 10; i++) {
        // Tenta criar profile se não existir
        const { data: existingProfile, error: fetchProfileError } = await supabase
          .from("profiles")
          .select("id, username, avatar_preset")
          .eq("id", sessionUser.id)
          .maybeSingle();
        if (fetchProfileError) {
          setError("Erro ao verificar perfil existente: " + (fetchProfileError.message || "Desconhecido"));
          setLoading(false);
          return;
        }
        // AAA: sempre faz upsert para garantir username correto mesmo se profile já existir
        const profilePayload = {
          id: sessionUser.id,
          username: username.trim(),
          avatar_preset: "normal",
          created_at: new Date().toISOString(),
        };
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .upsert(profilePayload, { onConflict: 'id' })
          .select()
          .single();
        console.log("Tentativa de upsert profile:", { profilePayload, profileData, profileError });
        if (profileError) {
          setError("Erro ao criar perfil: " + (profileError.message || "Desconhecido"));
          setLoading(false);
          return;
        }
      // upsert já cobre todos os casos, não precisa else if
        // Aguarda profile propagar
        await new Promise(res => setTimeout(res, 200));
      }
      if (!confirmedProfile) {
        // Busca profile atualizado do banco para garantir username correto
        const { data: freshProfile } = await supabase
          .from("profiles")
          .select("id, username, avatar_preset")
          .eq("id", sessionUser.id)
          .maybeSingle();
        if (freshProfile && freshProfile.username === username.trim()) {
          confirmedProfile = freshProfile;
        } else {
          setError("Não foi possível confirmar o perfil. Tente novamente.");
          setLoading(false);
          return;
        }
      }
      
      // ✅ CRIAR player_stats e player_progress se não existirem
      try {
        // Criar player_stats
        const { error: statsError } = await supabase
          .from("player_stats")
          .upsert({
            user_id: sessionUser.id,
            matches_played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            ships_destroyed: 0,
            ships_lost: 0,
          }, { onConflict: 'user_id' });
        
        if (statsError) console.warn("Erro ao criar player_stats:", statsError);
        
        // Criar player_progress
        const { error: progressError } = await supabase
          .from("player_progress")
          .upsert({
            user_id: sessionUser.id,
            level: 1,
            xp: 0,
            xp_to_next: 300,
            total_xp: 0,
          }, { onConflict: 'user_id' });
        
        if (progressError) console.warn("Erro ao criar player_progress:", progressError);
        
        // Aguardar propagação no DB (especialmente importante no Vercel)
        await new Promise(res => setTimeout(res, 800));
      } catch (e) {
        console.warn("Erro ao criar dados iniciais:", e);
      }
      
      // Salva bootstrap local
      try {
        if (typeof window !== "undefined") {
          const bootstrap = {
            ts: Date.now(),
            profile: confirmedProfile,
            playerProgress: { level: 1, xp: 0, xp_to_next: 300, total_xp: 0 },
          };
          localStorage.setItem("thor_bootstrap", JSON.stringify(bootstrap));
        }
      } catch (e) {}
      try { localStorage.setItem("username", username.trim()); localStorage.setItem("thor_username", username.trim()); } catch (e) {}

      // Envia mensagem de boas-vindas no inbox
      try {
        await createInboxMessage({
          user_id: sessionUser.id,
          type: "welcome",
          content: `Bem-vindo(a) ao **Thorspace!**\n\nThorspace é um jogo de batalhas espaciais por turnos, focado em estratégia.\n\nAntes de cada partida, você escolhe 3 naves, cada uma com sua especialidade. A escolha certa depende da sua estratégia de jogo.\n\nDurante a partida, o jogo acontece em turnos:\n\nPrimeiro você escolhe qual nave vai se mover, depois define para onde ela vai e onde irá mirar.\nRepita esse processo até concluir as 3 jogadas do turno.\n\nVocê pode jogar contra o computador para treinar ou enfrentar outros jogadores no modo multiplayer.\n\nGanhe batalhas para acumular XP, subir de nível, conquistar badges e avançar no ranking.\n\nBoa sorte e boas batalhas.`,
          cta: null,
          cta_url: null,
          lang: "pt"
        });
      } catch (e) { /* não bloqueia fluxo se falhar */ }

      setSuccess("Conta criada com sucesso! Redirecionando...");
      // Força atualização do contexto de stats
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("thor_stats_updated"));
        // Marca que precisa de reload ao chegar em /mode
        localStorage.setItem("thor_needs_reload", "1");
        router.replace("/mode");
        return;
      }

      // email confirmation flow: profile will be created by trigger after confirm
      setSuccess("Conta criada! Confirme seu email para entrar.");
      setTimeout(() => router.push("/login"), 1200);
    } catch (e) {
      console.error(e);
      setError("Erro desconhecido ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  // Styles (match login)
  const pageStyles = {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '36px',
    boxSizing: 'border-box',
    backgroundImage: `url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)`,
    backgroundSize: 'cover, auto',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center center',
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  };

  const wrapper = {
    width: 'min(420px, 92vw)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const cardStyles = {
    width: '420px',
    maxWidth: '96vw',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
    border: '1px solid rgba(255,255,255,0.06)',
    backdropFilter: 'blur(10px) saturate(120%)',
    WebkitBackdropFilter: 'blur(10px) saturate(120%)',
    color: '#E6FBFF',
  };

  const inputStyles = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.35)',
    color: '#E6FBFF',
    outline: 'none',
    marginBottom: '12px',
    fontSize: '14px',
  };

  const passwordWrapper = {
    position: 'relative',
    width: '100%',
    marginBottom: '12px',
  };

  const passwordInput = {
    width: '100%',
    padding: '12px 42px 12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.35)',
    color: '#E6FBFF',
    outline: 'none',
    fontSize: '14px',
  };

  const eyeButton = {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    transition: 'opacity 0.2s',
  };

  const primaryBtn = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(90deg, #00E5FF, #0072FF)',
    color: '#001018',
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: '15px',
    boxShadow: '0 8px 30px rgba(0, 140, 255, 0.18)',
  };

  const smallText = { fontSize: '13px', color: 'rgba(230,251,255,0.8)' };
  const errorStyle = { color: '#FFB3B3', marginBottom: 12, fontSize: 13 };
  const successStyle = { color: '#B8FFD9', marginBottom: 12, fontSize: 13 };

  return (
    <div style={pageStyles}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap" rel="stylesheet" />

      <div style={wrapper}>
        {logoImageWorks ? (
          <img
            src="/game/images/thorspace.png"
            alt="Thorspace"
            style={{ width: '100%', maxWidth: 480, height: 329, objectFit: 'contain', margin: '-130px auto -92px auto' }}
            onError={() => setLogoImageWorks(false)}
          />
        ) : (
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", color: '#9FF6FF', margin: 0 }}>THORSPACE</h1>
        )}

        <div style={cardStyles} role="main" aria-label="Signup card">

        <form onSubmit={handleSubmit}>
          {error ? (
            error.includes("<a ") ? (
              <div style={errorStyle} dangerouslySetInnerHTML={{ __html: error }} />
            ) : (
              <div style={errorStyle}>{error}</div>
            )
          ) : null}
          {success ? <div style={successStyle}>{success}</div> : null}

          <label style={smallText} htmlFor="full_name">Nome completo</label>
          <input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{...inputStyles, border: fullNameError ? '2px solid #FF4D4F' : inputStyles.border}} placeholder="Ex: João Silva" required />

          <label style={smallText} htmlFor="username">Nome de usuário</label>
          <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} style={{...inputStyles, border: usernameError ? '2px solid #FF4D4F' : inputStyles.border}} placeholder="seu_username" required />

          <label style={smallText} htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{...inputStyles, border: emailError ? '2px solid #FF4D4F' : inputStyles.border}} placeholder="seu@exemplo.com" required />

          <label style={smallText} htmlFor="password">Senha</label>
          <div style={passwordWrapper}>
            <input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={{...passwordInput, border: passwordError ? '2px solid #FF4D4F' : passwordInput.border}} 
              placeholder="Mín 8 chars, 1 número" 
              required 
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

          <label style={smallText} htmlFor="confirm">Confirmar senha</label>
          <div style={passwordWrapper}>
            <input 
              id="confirm" 
              type={showConfirmPassword ? "text" : "password"} 
              value={confirm} 
              onChange={(e) => setConfirm(e.target.value)} 
              style={{...passwordInput, border: confirmError ? '2px solid #FF4D4F' : passwordInput.border}} 
              placeholder="Repita a senha" 
              required 
            />
            <button
              type="button"
              style={eyeButton}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
              aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showConfirmPassword ? (
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

          <button type="submit" style={primaryBtn} disabled={loading}>{loading ? 'Criando...' : 'Criar conta'}</button>
        </form>

        <div style={{ height: 12 }} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <div style={smallText}>Já tem conta?</div>
          <button onClick={() => router.push('/login')} style={{ background: 'transparent', border: 'none', color: '#9FF6FF', cursor: 'pointer', fontWeight: 700 }}>ENTRAR</button>
        </div>

        <div style={{ height: 8 }} />
        <div style={{ fontSize: 12, color: 'rgba(230,251,255,0.6)', marginTop: 12, textAlign: 'center' }}>Ao criar sua conta você aceita os termos e políticas.</div>
        </div>
      </div>
    </div>
  );
}
