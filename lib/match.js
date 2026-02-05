import { supabase } from "@/lib/supabase";

/**
 * Finaliza a partida e salva resultado.
 * OBS: Esse é um "fallback" seguro pra não quebrar o build.
 * Se você já tinha uma versão mais completa antes, você pode substituir depois.
 */
export async function finalizeMatch({
  matchId,
  winnerId = null,
  loserId = null,
  result = null, // "VICTORY" | "DEFEAT" | "DRAW"
  myKills = null,
  oppKills = null,
  xpGained = 0,
  // meta = {},
} = {}) {
  if (!matchId) {
    console.warn("[finalizeMatch] matchId is required");
    return { ok: false, error: "matchId is required" };
  }

  // Atualiza a tabela matches
  const payload = {
    status: "finished",
    winner_id: winnerId,
    result,
    my_kills: myKills,
    opp_kills: oppKills,
    xp_gained: xpGained,
    finished_at: new Date().toISOString(),
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
  const { data, error } = await supabase
    .from("matches")
    .update(payload)
    .eq("id", matchId)
    .select("id")
    .maybeSingle();
  if (error) {
    const errorLog = {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      status: error.status,
    };
    // Sempre logar o erro raw para diagnóstico
    try {
      console.error("[finalizeMatch] supabase error (raw):", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (e) {
      console.error("[finalizeMatch] supabase error (raw, not stringifiable):", error);
    }
    console.error("[finalizeMatch] supabase error (parsed):", errorLog);
    return { ok: false, error: errorLog };
  }
  if (!data) {
    console.error("[finalizeMatch] No rows updated", { matchId, payload });
    return { ok: false, error: { message: "No rows updated" } };
  }

  // Atualiza player_stats do usuário
  // Determina resultado
  let statsUpdate = {
    matches_played: 1,
    ships_destroyed: Number(myKills ?? 0),
    ships_lost: Number(oppKills ?? 0),
    wins: 0,
    losses: 0,
    draws: 0,
  };
  if (result === "win") statsUpdate.wins = 1;
  else if (result === "loss") statsUpdate.losses = 1;
  else statsUpdate.draws = 1;

  // Descobre o userId do jogador atual
  const userId = winnerId || loserId;
  if (!userId) {
    console.error("[finalizeMatch] userId is null, não pode atualizar player_stats");
    return { ok: false, error: "userId is null" };
  }

  // Tenta atualizar stats existentes
  const { data: statsRow, error: statsError } = await supabase
    .from("player_stats")
    .select("matches_played, wins, losses, draws, ships_destroyed, ships_lost")
    .eq("user_id", userId)
    .maybeSingle();

  if (statsRow) {
    // Atualiza somando os valores
    const updateObj = {
      matches_played: Number(statsRow.matches_played ?? 0) + 1,
      wins: Number(statsRow.wins ?? 0) + statsUpdate.wins,
      losses: Number(statsRow.losses ?? 0) + statsUpdate.losses,
      draws: Number(statsRow.draws ?? 0) + statsUpdate.draws,
      ships_destroyed: Number(statsRow.ships_destroyed ?? 0) + statsUpdate.ships_destroyed,
      ships_lost: Number(statsRow.ships_lost ?? 0) + statsUpdate.ships_lost,
    };
    await supabase
      .from("player_stats")
      .update(updateObj)
      .eq("user_id", userId);
  } else {
    // Cria row se não existir
    await supabase
      .from("player_stats")
      .insert({
        user_id: userId,
        ...statsUpdate,
      });
  }

  return { ok: true, data };
}
