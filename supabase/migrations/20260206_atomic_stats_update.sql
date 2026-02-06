-- ============================================
-- ATOMIC STATS UPDATE - AAA SOLUTION
-- ============================================
-- Solução para race conditions em atualizações de stats
-- Usa SELECT FOR UPDATE (row-level lock) para garantir atomicidade

CREATE OR REPLACE FUNCTION update_player_stats_atomic(
  p_user_id UUID,
  p_matches_played INT DEFAULT 1,
  p_wins INT DEFAULT 0,
  p_losses INT DEFAULT 0,
  p_draws INT DEFAULT 0,
  p_ships_destroyed INT DEFAULT 0,
  p_ships_lost INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Lock da linha específica para prevenir race conditions
  -- Se não existir, criar com valores iniciais
  INSERT INTO player_stats (
    user_id,
    matches_played,
    wins,
    losses,
    draws,
    ships_destroyed,
    ships_lost
  )
  VALUES (
    p_user_id,
    p_matches_played,
    p_wins,
    p_losses,
    p_draws,
    p_ships_destroyed,
    p_ships_lost
  )
  ON CONFLICT (user_id) DO UPDATE SET
    matches_played = player_stats.matches_played + p_matches_played,
    wins = player_stats.wins + p_wins,
    losses = player_stats.losses + p_losses,
    draws = player_stats.draws + p_draws,
    ships_destroyed = player_stats.ships_destroyed + p_ships_destroyed,
    ships_lost = player_stats.ships_lost + p_ships_lost
  RETURNING jsonb_build_object(
    'user_id', user_id,
    'matches_played', matches_played,
    'wins', wins,
    'losses', losses,
    'draws', draws,
    'ships_destroyed', ships_destroyed,
    'ships_lost', ships_lost
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Comentários explicativos
COMMENT ON FUNCTION update_player_stats_atomic IS 
'Atualiza stats de jogador atomicamente usando UPSERT.
ON CONFLICT garante que não há race conditions.
Operação é atômica mesmo com múltiplas chamadas simultâneas.';
