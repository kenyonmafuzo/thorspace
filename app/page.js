"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? data;
        if (!mounted) return;
        if (session) router.replace('/mode');
      } catch (e) {
        console.error(e);
      }
    }
    check();
    return () => { mounted = false; };
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: String(email).trim(),
        password: String(password),
      });
      if (err) {
        setError(err.message || 'Erro ao entrar');
        setLoading(false);
        return;
      }
      router.replace('/mode');
    } catch (e) {
      console.error(e);
      setError('Erro desconhecido ao autenticar');
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
    } catch (e) {
      console.error(e);
      setError('Erro ao iniciar OAuth com Google');
    }
  }

  const pageStyles = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxSizing: 'border-box',
    backgroundImage: `url('/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)`,
    backgroundSize: 'cover, auto',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center center',
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  };

  const wrapper = { width: 'min(420px, 92vw)', display: 'flex', flexDirection: 'column', alignItems: 'center' };
  const logoStyles = { width: 'min(420px, 92vw)', display: 'block', margin: '0 auto 18px auto', objectFit: 'contain' };
  const card = {
    width: '100%',
    borderRadius: 14,
    padding: 22,
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
    border: '1px solid rgba(0,230,255,0.06)',
    backdropFilter: 'blur(6px) saturate(120%)',
    WebkitBackdropFilter: 'blur(6px) saturate(120%)',
    color: '#E6FBFF'
  };
  const input = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.35)', color: '#E6FBFF', outline: 'none', marginBottom: 10, fontSize: 14 };
  const primaryBtn = { width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #00E5FF, #0072FF)', color: '#001018', fontWeight: 700, fontSize: 15, boxShadow: '0 8px 30px rgba(0, 140, 255, 0.18)', marginBottom: 8 };
  const googleBtn = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#E6FBFF', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', cursor: 'pointer', fontWeight: 600, marginBottom: 8 };
  const smallText = { fontSize: 13, color: 'rgba(230,251,255,0.8)' };
  const errorStyle = { color: '#FFB3B3', marginTop: 8 };

  return (
    <main style={pageStyles}>
      <div style={wrapper}>
        <img src="/images/thorspace.png" alt="Thorspace" style={logoStyles} />

        <div style={card}>
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Email</label>
            <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

            <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Senha</label>
            <input style={input} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />

            <button style={primaryBtn} type="submit" disabled={loading}>{loading ? 'Entrando...' : 'ENTRAR'}</button>
          </form>

          <button style={googleBtn} onClick={signInWithGoogle} aria-label="Entrar com Google">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.805 10.023h-9.79v3.962h5.67c-.245 1.62-1.674 4.743-5.67 4.743-3.41 0-6.185-2.812-6.185-6.275 0-3.463 2.775-6.275 6.185-6.275 1.94 0 3.237.828 3.98 1.543l2.716-2.613C17.87 3.044 15.63 2 12.998 2 7.87 2 3.8 6.041 3.8 11.02c0 4.98 4.07 9.02 9.198 9.02 5.29 0 8.798-3.712 8.798-8.935 0-.6-.067-1.075-.99-1.082z" fill="#4285F4"/>
            </svg>
            <span>ENTRAR COM GOOGLE</span>
          </button>

          {error ? <div style={errorStyle}>{error}</div> : null}

          <div style={{ height: 12 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={smallText}>Ainda não tem conta?</div>
            <a href="/signup" style={{ color: '#9FF6FF', fontWeight: 700 }}>CADASTRE-SE</a>
          </div>

          <div style={{ height: 8 }} />
          <div style={{ fontSize: 12, color: 'rgba(230,251,255,0.6)', marginTop: 12 }}>Ao entrar você aceita os termos e políticas.</div>
        </div>
      </div>
    </main>
  );
}
