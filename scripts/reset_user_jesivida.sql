-- =========================================================
-- DIAGNÓSTICO + RESET: usuário jesivida
-- Rode cada bloco separadamente no Supabase SQL Editor
-- =========================================================

-- ── BLOCO 1: DIAGNÓSTICO (rode primeiro, sem alterar nada) ─

-- 1a. Perfil
SELECT id, username, avatar_preset, is_vip
FROM profiles
WHERE lower(username) = 'jesivida';

-- 1b. Stats (wins, losses, etc.)
SELECT *
FROM player_stats
WHERE user_id = (SELECT id FROM profiles WHERE lower(username) = 'jesivida');

-- 1c. XP / progresso
SELECT *
FROM player_progress
WHERE user_id = (SELECT id FROM profiles WHERE lower(username) = 'jesivida');

-- 1d. Partidas finalizadas no match_results
SELECT mr.match_id, mr.winner_id, mr.loser_id,
       mr.winner_score, mr.loser_score, mr.processed_at
FROM match_results mr
WHERE mr.winner_id = (SELECT id FROM profiles WHERE lower(username) = 'jesivida')
   OR mr.loser_id  = (SELECT id FROM profiles WHERE lower(username) = 'jesivida')
ORDER BY mr.processed_at DESC
LIMIT 20;

-- 1e. Partidas com phase='finished' mas SEM entrada em match_results
--     (indica partidas que terminaram mas não foram contabilizadas)
SELECT m.id, m.phase, m.winner_id, m.finished_at, m.player1_id, m.player2_id
FROM matches m
WHERE (m.player1_id = (SELECT id FROM profiles WHERE lower(username) = 'jesivida')
    OR m.player2_id = (SELECT id FROM profiles WHERE lower(username) = 'jesivida'))
  AND m.phase = 'finished'
  AND NOT EXISTS (
    SELECT 1 FROM match_results mr WHERE mr.match_id = m.id
  )
ORDER BY m.updated_at DESC;


-- ── BLOCO 2: RESET COMPLETO (rode somente se decidir zerar) ─
-- ⚠️ IRREVERSÍVEL — apaga stats, XP, partidas e resultados do usuário

DO $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid
  FROM profiles
  WHERE lower(username) = 'jesivida';

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário jesivida não encontrado em profiles';
  END IF;

  RAISE NOTICE 'Zerando dados do usuário: %', v_uid;

  -- Apaga resultados de partidas (match_results)
  DELETE FROM match_results
  WHERE winner_id = v_uid OR loser_id = v_uid;

  -- Apaga partidas (matches) em que o usuário participou
  DELETE FROM matches
  WHERE player1_id = v_uid OR player2_id = v_uid;

  -- Reseta player_stats para zero
  UPDATE player_stats SET
    matches_played   = 0,
    wins             = 0,
    losses           = 0,
    draws            = 0,
    ships_destroyed  = 0,
    ships_lost       = 0,
    multiplayer_wins = 0
  WHERE user_id = v_uid;

  -- Reseta player_progress para zero
  UPDATE player_progress SET
    total_xp   = 0,
    xp         = 0,
    level      = 1,
    xp_to_next = 300
  WHERE user_id = v_uid;

  RAISE NOTICE 'Reset concluído para jesivida (%)', v_uid;
END;
$$;


-- ── BLOCO 3: VERIFICAÇÃO PÓS-RESET ──────────────────────────

SELECT 'player_stats' AS tabela, matches_played, wins, losses, draws, ships_destroyed
FROM player_stats
WHERE user_id = (SELECT id FROM profiles WHERE lower(username) = 'jesivida')
UNION ALL
SELECT 'player_progress', total_xp, xp, level, xp_to_next, 0
FROM player_progress
WHERE user_id = (SELECT id FROM profiles WHERE lower(username) = 'jesivida');
