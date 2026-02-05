import { supabase } from "./supabase";

/**
 * Garante que o usuário tenha um perfil criado
 * e decide se precisa passar pelo onboarding
 */
export async function ensureProfileAndOnboarding(user, opts = {}) {
    console.log("[ensureProfileAndOnboarding] opts.username recebido:", opts.username);
  if (!user?.id) {
    console.error("ensureProfileAndOnboarding: Usuário sem ID", user);
    return { hasProfile: false, needsOnboarding: true, error: "missing_user_id" };
  }

  // Busca perfil existente
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) {
    console.error("Erro ao buscar perfil:", error);
  }

  // Se não existir perfil, cria
  if (!profile) {
  // LOG: username usado no insert
  console.log("[ensureProfileAndOnboarding] username usado no insert:", opts.username);

    // LOG: username recebido
    console.log("[ensureProfileAndOnboarding] username recebido:", opts.username);
    if (!opts.username) {
      throw new Error("Username do cadastro não foi passado para ensureProfileAndOnboarding!");
    }
    const username = opts.username;

    const avatarPreset = "normal";
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      username,
      avatar_preset: avatarPreset,
      avatar_url: user.user_metadata?.avatar_url || null,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Erro ao criar profile:", insertError);
      return { hasProfile: false, needsOnboarding: true, error: "profile_creation_failed", insertError };
    } else {
      console.log("Perfil criado com sucesso para usuário:", user.id);
    }

    // Busca profile atualizado
    const { data: freshProfile, error: fetchProfileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (fetchProfileError) {
      console.error("Erro ao buscar profile após criar:", fetchProfileError);
    }

    // Cria registro inicial em player_progress
    const { error: progressError } = await supabase.from("player_progress").insert({
      user_id: user.id,
      level: 1,
      xp: 0,
      xp_to_next: 300,
      total_xp: 0,
      created_at: new Date().toISOString(),
    });
    if (progressError) {
      console.error("Erro ao criar player_progress:", progressError);
      return { hasProfile: true, needsOnboarding: true, error: "player_progress_creation_failed", progressError };
    } else {
      console.log("player_progress criado com sucesso para usuário:", user.id);
    }

    return { hasProfile: true, needsOnboarding: true, created: true, profile: freshProfile };
  }

  // Se existir perfil, garante player_progress
  let progressCreated = false;
  let progressError = null;
  let playerProgress = null;
  try {
    const { data: progress, error: progressLookupError } = await supabase
      .from("player_progress")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (progressLookupError && (progressLookupError.message || progressLookupError.status)) {
      console.error("Erro ao buscar player_progress:", progressLookupError);
    }
    if (progress === null) {
      // Cria registro inicial em player_progress e retorna o registro criado
      const { data: createdProgress, error: progressInsertError } = await supabase
        .from("player_progress")
        .insert({
          user_id: user.id,
          level: 1,
          xp: 0,
          xp_to_next: 300,
          total_xp: 0,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (progressInsertError) {
        console.error("Erro ao criar player_progress:", progressInsertError);
        progressError = progressInsertError;
      } else {
        progressCreated = true;
        playerProgress = createdProgress;
        console.log("player_progress criado com sucesso para usuário:", user.id);
      }
    } else {
      playerProgress = progress;
    }
  } catch (err) {
    console.error("Erro inesperado ao garantir player_progress:", err);
    progressError = err;
  }

  const needsOnboarding =
    !profile.username ||
    profile.username.startsWith("user_") ||
    profile.onboarding_completed === false;

  return {
    hasProfile: true,
    needsOnboarding,
    profile,
    playerProgress,
    progressCreated,
    progressError,
    checked: true,
  };
}
