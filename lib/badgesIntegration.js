// Exemplo de uso do sistema de badges
// Integrar em diferentes pontos do código

import { checkAndGrantBadges } from './badgesSystem';
import { supabase } from './supabase';
import { getLevelProgressFromTotalXp } from './xpSystem';

/**
 * Verificar TODAS as badges baseadas nos stats atuais do usuário
 * Útil para conceder badges retroativamente em contas existentes
 */
export async function checkAllBadgesForUser(userId) {
  try {
    const [progressRes, statsRes] = await Promise.all([
      supabase.from("player_progress").select("*").eq("user_id", userId).single(),
      supabase.from("player_stats").select("*").eq("user_id", userId).single()
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
      has_comeback_victory: stats.has_comeback_victory || false
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
    const [progressRes, statsRes] = await Promise.all([
      supabase.from("player_progress").select("*").eq("user_id", userId).single(),
      supabase.from("player_stats").select("*").eq("user_id", userId).single()
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
      has_comeback_victory: stats.has_comeback_victory || false
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
    const [progressRes, statsRes] = await Promise.all([
      supabase.from("player_progress").select("*").eq("user_id", userId).single(),
      supabase.from("player_stats").select("*").eq("user_id", userId).single()
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
      has_comeback_victory: stats.has_comeback_victory || false
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
    const [progressRes, statsRes] = await Promise.all([
      supabase.from("player_progress").select("*").eq("user_id", userId).single(),
      supabase.from("player_stats").select("*").eq("user_id", userId).single()
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
      has_comeback_victory: stats.has_comeback_victory || false
    };

    return await checkAndGrantBadges(supabase, userId, userData);
  } catch (error) {
    console.error('[BADGES] Erro ao verificar badges no login:', error);
    return [];
  }
}
