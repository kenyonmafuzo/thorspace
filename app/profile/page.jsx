"use client";

import { useEffect, useState } from "react";
import { AVATAR_OPTIONS, getAvatarSrc } from "@/app/lib/avatarOptions";
import { useRouter } from "next/navigation";
import UserHeader from "@/app/components/UserHeader";
import MobileHeader from "@/app/components/MobileHeader";
import { supabase } from "@/lib/supabase";
import { getLevelFromTotalXp, formatRankDisplay, getRankAssetKey, getLevelProgressFromTotalXp } from "@/lib/xpSystem";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);

  // Username editing
  const [usernameEdit, setUsernameEdit] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameSuccess, setUsernameSuccess] = useState("");
  const [cooldownDays, setCooldownDays] = useState(null);

  // Avatar selection
  const [selectedAvatar, setSelectedAvatar] = useState("normal");
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Email/Password
  const [emailEdit, setEmailEdit] = useState("");
  const [passwordEdit, setPasswordEdit] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const loadProfileData = async () => {
    // Timeout de segurança
    const safetyTimeout = setTimeout(() => {
      console.warn("[Profile] Loading timeout - forçando loading=false");
      setLoading(false);
    }, 8000);
    
    try {
      const { data } = await supabase.auth.getSession();
      const sess = data?.session;
      if (!sess) {
        clearTimeout(safetyTimeout);
        setLoading(false);
        router.replace("/login");
        return;
      }
      setSession(sess);

      // Fetch profile, player_stats, and player_progress com timeout individual
      let profileRes, statsRes, progressRes;
      
      try {
        const fetchPromises = Promise.all([
          supabase
            .from("profiles")
            .select("id, username, points, badges, selected_ships, settings, username_updated_at")
            .eq("id", sess.user.id)
            .maybeSingle(),
          supabase
            .from("player_stats")
            .select("matches_played, wins, draws, losses, ships_destroyed, ships_lost")
            .eq("user_id", sess.user.id)
            .maybeSingle(),
          supabase
            .from("player_progress")
            .select("total_xp")
            .eq("user_id", sess.user.id)
            .maybeSingle(),
        ]);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Profile queries timeout")), 5000)
        );
        
        [profileRes, statsRes, progressRes] = await Promise.race([fetchPromises, timeoutPromise]);
      } catch (err) {
        console.error("[Profile] Timeout nas queries:", err);
        // Usar dados vazios e continuar
        profileRes = { data: null, error: err };
        statsRes = { data: null, error: err };
        progressRes = { data: null, error: err };
      }

      let statsData = statsRes.data;
      
      // Se não existir player_stats, criar default
      if (!statsData) {
        console.log("Creating default player_stats");
        const { data: newStats, error: insertError } = await supabase
          .from("player_stats")
          .insert({
            user_id: sess.user.id,
            matches_played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            ships_destroyed: 0,
            ships_lost: 0,
          })
          .select()
          .single();

        if (insertError) {
          // Log all error properties for diagnosis
          try {
            console.error("Error creating player_stats (raw):", JSON.stringify(insertError, Object.getOwnPropertyNames(insertError)));
          } catch (e) {
            console.error("Error creating player_stats (raw, not stringifiable):", insertError);
          }
          if (insertError.message || insertError.code || insertError.details || insertError.hint || insertError.status) {
            console.error("Error creating player_stats (parsed):", {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint,
              status: insertError.status,
            });
          }
          statsData = {};
        } else {
          statsData = newStats;
        }
      }

      let progressData = progressRes.data;
      
      // Se não existir player_progress, criar default
      if (!progressData) {
        console.log("Creating default player_progress");
        const { data: newProgress, error: insertError } = await supabase
          .from("player_progress")
          .insert({
            user_id: sess.user.id,
            total_xp: 0,
          })
          .select()
          .single();
        
        if (insertError) {
          console.error("Error creating player_progress:", insertError);
          progressData = { total_xp: 0 };
        } else {
          progressData = newProgress;
        }
      }

      // Garantir valores padrão para todas as estatísticas
      const safeStats = {
        matches_played: Number(statsData?.matches_played ?? 0),
        wins: Number(statsData?.wins ?? 0),
        draws: Number(statsData?.draws ?? 0),
        losses: Number(statsData?.losses ?? 0),
        ships_destroyed: Number(statsData?.ships_destroyed ?? 0),
        ships_lost: Number(statsData?.ships_lost ?? 0),
      };


      const totalXp = Number(progressData?.total_xp ?? 0);
      const progress = getLevelProgressFromTotalXp(totalXp);

      const safePoints = Number(profileRes.data?.points ?? 0);

      const prof = profileRes.data ? { 
        ...profileRes.data, 
        ...safeStats, 
        progress,
        points: safePoints 
      } : null;

      if (profileRes.error) {
        console.warn("Erro ao carregar profile:", profileRes.error);
        setProfile(null);
      } else if (!prof) {
        // Profile não existe - tentar criar
        console.warn("Profile não encontrado, tentando criar...");
        const username = sess.user.email?.split('@')[0] || `user_${sess.user.id.slice(0, 8)}`;
        const { error: createError } = await supabase
          .from("profiles")
          .insert({
            id: sess.user.id,
            username: username,
            avatar_preset: "normal",
            created_at: new Date().toISOString(),
          });
        
        if (createError) {
          console.error("Erro ao criar profile:", createError);
          setProfile(null);
        } else {
          // Recarregar após criar
          setTimeout(() => loadProfileData(), 500);
          return;
        }
      } else {
        setProfile(prof);
        setUsernameEdit(prof?.username || "");
        setEmailEdit(sess.user.email || "");
        setSelectedAvatar(prof?.settings?.avatar_ship || "normal");

        // Check cooldown
        if (prof?.username_updated_at) {
          const lastUpdate = new Date(prof.username_updated_at);
          const now = new Date();
          const diffMs = now - lastUpdate;
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const remaining = 30 - diffDays;
          if (remaining > 0) {
            setCooldownDays(remaining);
          }
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar sessão/profile:", e);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [router]);

  // Refetch ao voltar para a página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadProfileData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Listener para finalização de partida
  useEffect(() => {
    const handleMatchFinalized = () => {
      console.log("Match finalized - reloading profile data");
      setTimeout(() => loadProfileData(), 1000);
    };

    window.addEventListener("thor_match_finalized", handleMatchFinalized);
    return () => window.removeEventListener("thor_match_finalized", handleMatchFinalized);
  }, []);

  // Normalize username
  const normalizeUsername = (str) => {
    return str
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  };

  const validateUsername = (str) => {
    if (!str || str.length < 3 || str.length > 20) {
      return "Username deve ter entre 3 e 20 caracteres";
    }
    if (!/^[a-z0-9_]+$/.test(str)) {
      return "Username deve conter apenas letras minúsculas, números e underscore";
    }
    return null;
  };

  const handleSaveUsername = async () => {
    setUsernameError("");
    setUsernameSuccess("");

    if (cooldownDays && cooldownDays > 0) {
      setUsernameError(`Você poderá alterar novamente em ${cooldownDays} dias`);
      return;
    }

    const normalized = normalizeUsername(usernameEdit);
    const validationErr = validateUsername(normalized);

    if (validationErr) {
      setUsernameError(validationErr);
      return;
    }

    setUsernameSaving(true);
    try {
      const updateData = { username: normalized };
      // If username_updated_at column exists in schema, add it
      if (profile.username_updated_at !== undefined) {
        updateData.username_updated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", session.user.id);

      if (error) {
        if (error.code === "23505" || error.message?.includes("unique")) {
          setUsernameError("Username já está em uso");
        } else {
          setUsernameError("Erro ao salvar username: " + error.message);
        }
      } else {
        setUsernameSuccess("Username atualizado com sucesso!");
        localStorage.setItem("thor_username", normalized);
        setProfile({ ...profile, username: normalized });
        if (profile.username_updated_at !== undefined) {
          setCooldownDays(30);
        }
        // Dispara evento global para atualizar header
        window.dispatchEvent(new Event("thor_stats_updated"));
      }
    } catch (e) {
      console.warn("Erro ao salvar username:", e);
      setUsernameError("Erro inesperado ao salvar username");
    } finally {
      setUsernameSaving(false);
    }
  };

  const handleSaveAvatar = async (shipType) => {
    setAvatarSaving(true);
    try {
      const newSettings = { ...(profile.settings || {}), avatar_ship: shipType };
      const { error } = await supabase
        .from("profiles")
        .update({ settings: newSettings, avatar_preset: shipType })
        .eq("id", session.user.id);

      if (error) {
        console.warn("Erro ao salvar avatar:", error);
      } else {
        setSelectedAvatar(shipType);
        localStorage.setItem("thor_avatar_ship", shipType);
        setProfile({ ...profile, settings: newSettings, avatar_preset: shipType });
        // Dispatch event para sincronizar UserHeader e ranking
        window.dispatchEvent(
          new CustomEvent("thor_avatar_updated", {
            detail: { avatar: shipType },
          })
        );
        window.dispatchEvent(new Event("thor_stats_updated"));
      }
    } catch (e) {
      console.warn("Erro ao salvar avatar:", e);
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    setEmailError("");
    setEmailSuccess("");

    if (!emailEdit || !emailEdit.includes("@")) {
      setEmailError("Email inválido");
      return;
    }

    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: emailEdit });
      if (error) {
        setEmailError("Erro ao atualizar email: " + error.message);
      } else {
        setEmailSuccess("Confirme a alteração no seu e-mail");
      }
    } catch (e) {
      console.warn("Erro ao atualizar email:", e);
      setEmailError("Erro inesperado ao atualizar email");
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordEdit || passwordEdit.length < 8) {
      setPasswordError("Senha deve ter no mínimo 8 caracteres");
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordEdit });
      if (error) {
        setPasswordError("Erro ao atualizar senha: " + error.message);
      } else {
        setPasswordSuccess("Senha atualizada com sucesso!");
        setPasswordEdit("");
      }
    } catch (e) {
      console.warn("Erro ao atualizar senha:", e);
      setPasswordError("Erro inesperado ao atualizar senha");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ color: "#FFF", minHeight: "100vh", padding: "40px 20px", background: "transparent" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)", backgroundSize: "cover, cover", backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center center, center center", opacity: 0.35, pointerEvents: "none" }} />
        <div style={{ position: "fixed", top: 12, right: 12, zIndex: 10 }}>
          <UserHeader />
        </div>
        <MobileHeader />
        <main style={{ maxWidth: 700, margin: "80px auto 0", position: "relative", zIndex: 1 }}>
          <p>Carregando perfil...</p>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ color: "#FFF", minHeight: "100vh", padding: "40px 20px", background: "transparent" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)", backgroundSize: "cover, cover", backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center center, center center", opacity: 0.35, pointerEvents: "none" }} />
        <div style={{ position: "fixed", top: 12, right: 12, zIndex: 10 }}>
          <UserHeader />
        </div>
        <MobileHeader />
        <main style={{ maxWidth: 700, margin: "80px auto 0", position: "relative", zIndex: 1 }}>
          <p>Erro ao carregar perfil. Tente novamente.</p>
        </main>
      </div>
    );
  }



  return (
    <div style={{ color: "#FFF", minHeight: "100vh", padding: "40px 20px", background: "transparent" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)", backgroundSize: "cover, cover", backgroundRepeat: "no-repeat, no-repeat", backgroundPosition: "center center, center center", opacity: 0.35, pointerEvents: "none" }} />
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 10 }}>
        <UserHeader />
      </div>
      <MobileHeader />

      <main style={{ maxWidth: 700, margin: "80px auto 0", position: "relative", zIndex: 1 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 40, fontFamily: "'Orbitron', sans-serif" }}>Perfil</h1>

        {/* SEÇÃO 1: USERNAME */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, fontFamily: "'Orbitron', sans-serif" }}>Identidade</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              value={usernameEdit}
              onChange={(e) => setUsernameEdit(e.target.value)}
              disabled={usernameSaving || (cooldownDays && cooldownDays > 0)}
              style={{
                ...inputStyle,
                opacity: usernameSaving || (cooldownDays && cooldownDays > 0) ? 0.5 : 1,
              }}
            />
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
              Normalização: letras minúsculas, espaços viram underscore, 3-20 caracteres
            </p>
          </div>

          {cooldownDays && cooldownDays > 0 && (
            <p style={{ fontSize: 12, color: "#FFB3B3", marginBottom: 12 }}>
              ⏱️ Você poderá alterar novamente em {cooldownDays} dias
            </p>
          )}

          {usernameError && <p style={{ fontSize: 12, color: "#FFB3B3", marginBottom: 12 }}>{usernameError}</p>}
          {usernameSuccess && <p style={{ fontSize: 12, color: "#90EE90", marginBottom: 12 }}>{usernameSuccess}</p>}

          <button
            onClick={handleSaveUsername}
            disabled={usernameSaving || (cooldownDays && cooldownDays > 0)}
            style={{
              ...buttonStyle,
              opacity: usernameSaving || (cooldownDays && cooldownDays > 0) ? 0.5 : 1,
            }}
          >
            {usernameSaving ? "Salvando..." : "Salvar Username"}
          </button>
        </div>

        {/* SEÇÃO 2: AVATAR (NAVE) */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, fontFamily: "'Orbitron', sans-serif" }}>Foto de Perfil</h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>
            Escolha uma nave como sua foto de perfil
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
            {AVATAR_OPTIONS.map((ship) => (
              <div
                key={ship.value}
                onClick={() => handleSaveAvatar(ship.value)}
                style={{
                  cursor: "pointer",
                  padding: 12,
                  borderRadius: 8,
                  border: selectedAvatar === ship.value ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.2)",
                  background: selectedAvatar === ship.value ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.03)",
                  transition: "all 0.2s",
                  textAlign: "center",
                  flex: "0 1 calc(33.333% - 11px)",
                  minWidth: 100,
                  boxShadow: selectedAvatar === ship.value ? "0 0 12px rgba(255,215,0,0.3)" : "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#FFD700";
                  e.currentTarget.style.background = "rgba(255,215,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    selectedAvatar === ship.value ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.2)";
                  e.currentTarget.style.background =
                    selectedAvatar === ship.value ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.03)";
                }}
              >
                <img
                  src={ship.src}
                  alt={ship.name}
                  style={{ width: 50, height: "auto", opacity: 0.8 }}
                />
              </div>
            ))}
          </div>

          {avatarSaving && <p style={{ fontSize: 12, color: "#FFD700", textAlign: "center" }}>Salvando...</p>}
        </div>

        {/* SEÇÃO 3: ESTATÍSTICAS */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, fontFamily: "'Orbitron', sans-serif" }}>Estatísticas</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{...statCardStyle, display: 'flex', alignItems: 'center', gap: 12}}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img 
                      src={getRankAssetKey(profile.progress?.tier ?? 1, profile.progress?.material ?? 1)}
                      alt="Rank"
                      style={{ width: 90, height: 90, objectFit: 'contain', marginRight: 8 }}
                      onError={(e) => {
                        const src = e.target.src;
                        if (src.endsWith('.png')) {
                          e.target.src = src.replace('.png', '.svg');
                        }
                      }}
                    />
                    {/* Bolinha com número do NÍVEL */}
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        right: 23,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, rgb(130 130 130) 0%, rgb(79 106 115) 100%)",
                        border: "1px solid rgb(101 139 168)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: 10,
                        color: "#FFF",
                        textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                        boxShadow: "0 2px 8px rgba(0,229,255,0.4)",
                        pointerEvents: "none",
                      }}
                    >
                      {profile.progress?.level ?? 1}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#00E5FF", letterSpacing: 1, marginBottom: 0, fontFamily: "'Orbitron', sans-serif" }}>
                      {formatRankDisplay({ tier: profile.progress?.tier, level: profile.progress?.level })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ ...statCardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textAlign: 'center' }}>Total XP</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: "#00E5FF", textAlign: 'center', letterSpacing: 1, fontFamily: "'Orbitron', sans-serif" }}>
                {(profile.progress?.totalXp ?? 0).toLocaleString('pt-BR')} XP
              </p>
            </div>
            <div style={statCardStyle}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Partidas Jogadas</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#00E5FF", fontFamily: "'Orbitron', sans-serif" }}>
                {Number(profile.matches_played ?? 0)}
              </p>
            </div>
            <div style={statCardStyle}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Vitórias</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#00E5FF", fontFamily: "'Orbitron', sans-serif" }}>
                {Number(profile.wins ?? 0)}
              </p>
            </div>
            <div style={statCardStyle}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Empates</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#00E5FF", fontFamily: "'Orbitron', sans-serif" }}>
                {Number(profile.draws ?? 0)}
              </p>
            </div>
            <div style={statCardStyle}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Derrotas</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#00E5FF", fontFamily: "'Orbitron', sans-serif" }}>
                {Number(profile.losses ?? 0)}
              </p>
            </div>
            <div style={statCardStyle}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Naves Destruídas</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#00E5FF", fontFamily: "'Orbitron', sans-serif" }}>
                {Number(profile.ships_destroyed ?? 0)}
              </p>
            </div>
            <div style={statCardStyle}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Naves Perdidas</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#00E5FF", fontFamily: "'Orbitron', sans-serif" }}>
                {Number(profile.ships_lost ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* SEÇÃO 4: CONTA */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, fontFamily: "'Orbitron', sans-serif" }}>Conta</h2>

          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={emailEdit}
              onChange={(e) => setEmailEdit(e.target.value)}
              disabled={emailSaving}
              style={{ ...inputStyle, opacity: emailSaving ? 0.5 : 1 }}
            />
            {emailError && <p style={{ fontSize: 12, color: "#FFB3B3", marginTop: 6 }}>{emailError}</p>}
            {emailSuccess && <p style={{ fontSize: 12, color: "#90EE90", marginTop: 6 }}>{emailSuccess}</p>}
            <button
              onClick={handleSaveEmail}
              disabled={emailSaving}
              style={{ ...buttonStyle, marginTop: 8, opacity: emailSaving ? 0.5 : 1 }}
            >
              {emailSaving ? "Salvando..." : "Atualizar Email"}
            </button>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
              Nova Senha
            </label>
            <input
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={passwordEdit}
              onChange={(e) => setPasswordEdit(e.target.value)}
              disabled={passwordSaving}
              style={{ ...inputStyle, opacity: passwordSaving ? 0.5 : 1 }}
            />
            {passwordError && <p style={{ fontSize: 12, color: "#FFB3B3", marginTop: 6 }}>{passwordError}</p>}
            {passwordSuccess && <p style={{ fontSize: 12, color: "#90EE90", marginTop: 6 }}>{passwordSuccess}</p>}
            <button
              onClick={handleSavePassword}
              disabled={passwordSaving}
              style={{ ...buttonStyle, marginTop: 8, opacity: passwordSaving ? 0.5 : 1 }}
            >
              {passwordSaving ? "Salvando..." : "Atualizar Senha"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const cardStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  padding: 20,
  marginBottom: 24,
};

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#FFF",
  padding: "10px 12px",
  borderRadius: 6,
  fontSize: 14,
  fontFamily: "inherit",
  transition: "all 0.2s",
};

const buttonStyle = {
  background: "rgba(255,215,0,0.1)",
  border: "1px solid rgba(255,215,0,0.3)",
  color: "#FFD700",
  padding: "10px 20px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  fontFamily: "'Orbitron', sans-serif",
  cursor: "pointer",
  transition: "all 0.2s",
};

const statCardStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: 12,
  textAlign: "center",
};
