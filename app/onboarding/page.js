"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasRetriedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? data;
        if (!session) {
          router.replace("/login");
          return;
        }
        const user = session.user ?? (await supabase.auth.getUser()).data?.user;
        if (!user) {
          router.replace("/login");
          return;
        }

        // Helper function to ensure user rows exist
        const ensureUserRows = async (userId) => {
          try {
            // 1. Check and create profiles row if missing
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", userId)
              .maybeSingle();
            
            if (!profile) {
              const { error: insertError } = await supabase
                .from("profiles")
                .insert({ id: userId, avatar_preset: "normal" });
              
              // Ignore duplicate/unique violation errors (23505) - means another request created it
              if (insertError && insertError.code !== "23505") {
                console.error("Failed to create profile:", insertError, JSON.stringify(insertError, null, 2));
              }
            }

            // 2. Check and create player_stats row if missing
            const { data: stats } = await supabase
              .from("player_stats")
              .select("user_id")
              .eq("user_id", userId)
              .maybeSingle();
            
            if (!stats) {
              const { error: insertError } = await supabase
                .from("player_stats")
                .insert({ user_id: userId });
              
              if (insertError && insertError.code !== "23505") {
                console.error("Failed to create player_stats:", insertError, JSON.stringify(insertError, null, 2));
              }
            }

            // 3. Check and create player_progress row if missing
            const { data: progress } = await supabase
              .from("player_progress")
              .select("user_id")
              .eq("user_id", userId)
              .maybeSingle();
            
            if (!progress) {
              const { error: insertError } = await supabase
                .from("player_progress")
                .insert({ user_id: userId, level: 1, xp: 0 });
              
              if (insertError && insertError.code !== "23505") {
                console.error("Failed to create player_progress:", insertError, JSON.stringify(insertError, null, 2));
              }
            }
          } catch (error) {
            console.error("ensureUserRows exception:", error.message || error);
          }
        };

        // Ensure rows exist before fetching
        await ensureUserRows(user.id);

        // Try to load profile (full_name + username)
        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("username, full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (pErr) {
          console.warn("onboarding profile fetch error:", JSON.stringify(pErr, null, 2));
          setError("Erro ao carregar dados do perfil. Tente novamente mais tarde.");
          return;
        }

        // If profile is null, retry once
        if (!profile) {
          // Check if we've already retried to prevent infinite loops
          if (hasRetriedRef.current) {
            console.warn("Profile still not found after retry, not retrying again");
            setError("Erro ao carregar dados do perfil. Tente novamente mais tarde.");
            return;
          }

          console.warn("Profile not found, retrying...");
          hasRetriedRef.current = true;
          await ensureUserRows(user.id);
          
          const { data: retryProfile, error: retryErr } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", user.id)
            .maybeSingle();

          if (!mounted) return;

          if (retryErr) {
            console.warn("onboarding profile retry error:", JSON.stringify(retryErr, null, 2));
            setError("Erro ao carregar dados do perfil. Tente novamente mais tarde.");
            return;
          }

          if (!retryProfile) {
            console.warn("Profile still not found after retry");
            setError("Erro ao carregar dados do perfil. Tente novamente mais tarde.");
            return;
          }

          // Use retry data
          if (retryProfile.username) {
            router.replace("/mode");
            return;
          }
          if (retryProfile.full_name) setFullName(retryProfile.full_name);
          return;
        }

        // Successfully loaded profile on first attempt
        if (profile.username) {
          router.replace("/mode");
          return;
        }
        if (profile.full_name) setFullName(profile.full_name);
      } catch (e) {
        console.warn("onboarding load error:", JSON.stringify(e, null, 2));
        if (mounted) {
          setError("Erro ao carregar dados. Tente novamente.");
        }
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  function validateUsername(u) {
    return /^[a-zA-Z0-9_]{3,16}$/.test(u);
  }

  async function checkUsernameAvailable(u) {
    try {
      const { data, error } = await supabase.from("profiles").select("id").ilike("username", u).limit(1);
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (!/relation .* does not exist|not exist|does not exist|no such table/i.test(msg)) console.warn("username check error", error);
        return true;
      }
      return !(Array.isArray(data) && data.length);
    } catch (e) {
      console.warn(e);
      return true;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!validateUsername(username)) return setError("Username inválido: use 3-16 chars, letras, números ou underscore.");

    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session ?? data;
      const user = session?.user ?? (await supabase.auth.getUser()).data?.user;
      if (!user) {
        setError("Sessão inválida. Faça login novamente.");
        setLoading(false);
        router.replace("/login");
        return;
      }

      const available = await checkUsernameAvailable(username);
      if (!available) {
        setError("Nome de usuário já está em uso.");
        setLoading(false);
        return;
      }

      const profile = {
        id: user.id,
        username: username.trim(),
        full_name: fullName.trim() || null,
        username_updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await supabase.from("profiles").upsert(profile, { onConflict: "id" });
      if (upErr) {
        const msg = String(upErr.message || "").toLowerCase();
        if (/unique|duplicate|already exists|violat/i.test(msg)) {
          setError("Nome de usuário já está em uso.");
        } else {
          setError(upErr.message || "Erro ao salvar perfil.");
        }
        setLoading(false);
        return;
      }

      try { localStorage.setItem("username", username.trim()); localStorage.setItem("thor_username", username.trim()); } catch (e) {}

      router.replace("/mode");
    } catch (e) {
      console.error(e);
      setError("Erro desconhecido ao salvar perfil.");
    } finally {
      setLoading(false);
    }
  }

  // minimal styles to match other auth pages
  const pageStyles = { minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 36, backgroundImage: `url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)`, backgroundSize: 'cover, auto', backgroundRepeat: 'no-repeat', backgroundPosition: 'center center' };
  const wrapper = { width: 'min(420px, 92vw)', display: 'flex', flexDirection: 'column', alignItems: 'center' };
  const card = { width: 420, maxWidth: '96vw', borderRadius: 16, padding: 28, boxShadow: '0 8px 40px rgba(0,0,0,0.6)', background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px) saturate(120%)', WebkitBackdropFilter: 'blur(10px) saturate(120%)', color: '#E6FBFF' };
  const input = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.35)', color: '#E6FBFF', outline: 'none', marginBottom: 10, fontSize: 14 };
  const btn = { width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(90deg, #00E5FF, #0072FF)', color: '#001018', fontWeight: 700, fontSize: 15 };

  return (
    <main style={pageStyles}>
      <div style={wrapper}>
        <img src="/game/images/thorspace.png" alt="Thorspace" style={{ width: '100%', maxWidth: 420, height: 54, objectFit: 'contain', margin: '0 auto 18px auto' }} />
        <div style={card}>
          <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: '#9FF6FF', marginTop: 0 }}>Complete seu cadastro</h2>
          {error ? <div style={{ color: '#FFB3B3', marginBottom: 8 }}>{error}</div> : null}
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 13, color: 'rgba(230,251,255,0.8)' }}>Nome de usuário</label>
            <input style={input} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="seu_username" />

            <label style={{ fontSize: 13, color: 'rgba(230,251,255,0.8)' }}>Nome completo (opcional)</label>
            <input style={input} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex: João Silva" />

            <button style={btn} type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar e continuar'}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
