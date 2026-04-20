// Exemplo de uso do sistema de badges
// Integrar em diferentes pontos do código

import { checkAndGrantBadges } from './badgesSystem';
import { supabase } from './supabase';
import { getLevelProgressFromTotalXp } from './xpSystem';

/**
 * Compute rivalry stats from match_results table.
 * Returns max matches and max wins against any single opponent.
 */
async function computeRivalryStats(supabaseClient, userId) {
  try {
    const { data: results } = await supabaseClient
      .from('match_results')
      .select('winner_id, loser_id')
      .or(`winner_id.eq.${userId},loser_id.eq.${userId}`);

    if (!results?.length) return { max_matches_vs_same_opponent: 0, max_wins_vs_same_opponent: 0 };

    const matchCounts = {};
    const winCounts = {};

    results.forEach(r => {
      const opponentId = r.winner_id === userId ? r.loser_id : r.winner_id;
      if (!opponentId) return;
      matchCounts[opponentId] = (matchCounts[opponentId] || 0) + 1;
      if (r.winner_id === userId) {
        winCounts[opponentId] = (winCounts[opponentId] || 0) + 1;
      }
    });

    const max_matches_vs_same_opponent = Object.values(matchCounts).length
      ? Math.max(...Object.values(matchCounts))
      : 0;
    const max_wins_vs_same_opponent = Object.values(winCounts).length
      ? Math.max(...Object.values(winCounts))
      : 0;

    return { max_matches_vs_same_opponent, max_wins_vs_same_opponent };
  } catch {
    return { max_matches_vs_same_opponent: 0, max_wins_vs_same_opponent: 0 };
  }
}

/**
 * Verificar TODAS as badges baseadas nos stats atuais do usuário
 * Útil para conceder badges retroativamente em contas existentes
 */
export async function checkAllBadgesForUser(userId) {
  try {
    const [progressRes, statsRes, rivalryStats] = await Promise.all([
      supabase.from("player_progress").select("*").eq("user_id", userId).single(),
      supabase.from("player_stats").select("*").eq("user_id", userId).single(),
      computeRivalryStats(supabase, userId)
    ]);

    const progress = progressRes.data || {};
    const stats = statsRes.data || {};
    const levelInfo = getLevelProgressFromTotalXp(progress.total_xp || 0);

    const userData = {
      level: levelInfo.level,
      multiplayer_wins: stats.multiplayer_wins || 0,
      max_win_streak: stats.max_win_streak || 0,
      login_days: stats.login_days || 0,
      login_streak: stats.login_streak || 0,
      has_diverse_victory: stats.has_diverse_victory || false,
      has_comeback_victory: stats.has_comeback_victory || false,
      max_matches_vs_same_opponent: rivalryStats.max_matches_vs_same_opponent,
      max_wins_vs_same_opponent: rivalryStats.max_wins_vs_same_opponent
    };

    console.log('[BADGES] Verificando todas as badges retroativamente para usuário:', userData);
    return await checkAndGrantBadges(supabase, userId, userData);
  } catch (error) {
    console.error('[BADGES] Erro ao verificar badges retroativas:', error);
    return [];
  }
}

/**
 * Verificar badges após ganhar XP (pode ter subido de nível)
 */
export async function checkBadgesAfterXpGain(userId) {
  try {
    const [progressRes, statsRes, rivalryStats] = await Promise.all([
      supabase.from("player_progress").select("*").eq("user_id", userId).single(),
      supabase.from("player_stats").select("*").eq("user_id", userId).single(),
      computeRivalryStats(supabase, userId)
    ]);

    const progress = progressRes.data || {};
    const stats = statsRes.data || {};
    const levelInfo = getLevelProgressFromTotalXp(progress.total_xp || 0);

    const userData = {
      level: levelInfo.level,
      multiplayer_wins: stats.multiplayer_wins || 0,
      max_win_streak: stats.max_win_streak || 0,
      login_days: stats.login_days || 0,
      login_streak: stats.login_streak || 0,
      has_diverse_victory: stats.has_diverse_victory || false,
      has_comeback_victory: stats.has_comeback_victory || false,
      max_matches_vs_same_opponent: rivalryStats.max_matches_vs_same_opponent,
      max_wins_vs_same_opponent: rivalryStats.max_wins_vs_same_opponent
    };

    return await checkAndGrantBadges(supabase, userId, userData);
  } catch (error) {
    console.error('[BADGES] Erro ao verificar badges após XP:', error);
    return [];
  }
}

/**
 * Verificar badges após vitória em multiplayer
 */
export async function checkBadgesAfterMultiplayerWin(userId, winStreak, usedDiverseShips = false, wasComeback = false) {
  try {
    // Atualizar estatísticas
    const { data: currentStats } = await supabase
      .from("player_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    const updates = {
      multiplayer_wins: (currentStats?.multiplayer_wins || 0) + 1,
      max_win_streak: Math.max(currentStats?.max_win_streak || 0, winStreak)
    };

    if (usedDiverseShips) {
      updates.has_diverse_victory = true;
    }

    if (wasComeback) {
      updates.has_comeback_victory = true;
    }

    await supabase
      .from("player_stats")
      .update(updates)
      .eq("user_id", userId);

    // Verificar badges
    const [progressRes, statsRes, rivalryStats] = await Promise.all([
      supabase.from("player_progress").select("*").eq("user_id", userId).single(),
      supabase.from("player_stats").select("*").eq("user_id", userId).single(),
      computeRivalryStats(supabase, userId)
    ]);

    const progress = progressRes.data || {};
    const stats = statsRes.data || {};
    const levelInfo = getLevelProgressFromTotalXp(progress.total_xp || 0);

    const userData = {
      level: levelInfo.level,
      multiplayer_wins: stats.multiplayer_wins || 0,
      max_win_streak: stats.max_win_streak || 0,
      login_days: stats.login_days || 0,
      login_streak: stats.login_streak || 0,
      has_diverse_victory: stats.has_diverse_victory || false,
      has_comeback_victory: stats.has_comeback_victory || false,
      max_matches_vs_same_opponent: rivalryStats.max_matches_vs_same_opponent,
      max_wins_vs_same_opponent: rivalryStats.max_wins_vs_same_opponent
    };

    return await checkAndGrantBadges(supabase, userId, userData);
  } catch (error) {
    console.error('[BADGES] Erro ao verificar badges após vitória:', error);
    return [];
  }
}

/**
 * Verificar badges no login diário
 */
export async function checkBadgesOnDailyLogin(userId, isConsecutive = false) {
  try {
    const { data: currentStats } = await supabase
      .from("player_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    const updates = {
      login_days: (currentStats?.login_days || 0) + 1
    };

    if (isConsecutive) {
      updates.login_streak = (currentStats?.login_streak || 0) + 1;
    } else {
      updates.login_streak = 1; // Resetar streak se não for consecutivo
    }

    await supabase
      .from("player_stats")
      .update(updates)
      .eq("user_id", userId);

    // Verificar badges
    const [progressRes, statsRes, rivalryStats] = await Promise.all([
      supabase.from("player_progress").select("*").eq("user_id", userId).single(),
      supabase.from("player_stats").select("*").eq("user_id", userId).single(),
      computeRivalryStats(supabase, userId)
    ]);

    const progress = progressRes.data || {};
    const stats = statsRes.data || {};
    const levelInfo = getLevelProgressFromTotalXp(progress.total_xp || 0);

    const userData = {
      level: levelInfo.level,
      multiplayer_wins: stats.multiplayer_wins || 0,
      max_win_streak: stats.max_win_streak || 0,
      login_days: stats.login_days || 0,
      login_streak: stats.login_streak || 0,
      has_diverse_victory: stats.has_diverse_victory || false,
      has_comeback_victory: stats.has_comeback_victory || false,
      max_matches_vs_same_opponent: rivalryStats.max_matches_vs_same_opponent,
      max_wins_vs_same_opponent: rivalryStats.max_wins_vs_same_opponent
    };

    return await checkAndGrantBadges(supabase, userId, userData);
  } catch (error) {
    console.error('[BADGES] Erro ao verificar badges no login:', error);
    return [];
  }
}
