-- ============================================================
-- DRAW SUPPORT - AAA SOLUTION
-- ============================================================
-- Problema: empates nunca eram salvos (API retornava 400).
-- Solução:
--   1. Adiciona player1_id, player2_id (sempre preenchidos) e is_draw
--      em match_results, permitindo identificar ambos os jogadores
--      independente do resultado.
--   2. Backfill de player1_id/player2_id para registros existentes.
--   3. Atualiza RLS: qualquer jogador enxerga as suas partidas
--      (incluindo empates onde winner_id/loser_id são NULL).
--   4. Recria finalize_match_once com suporte a empates:
--      - draw: winner_id = NULL, loser_id = NULL, is_draw = TRUE
--      - stats de ambos os jogadores recebem draws++
-- ============================================================

-- ── 1. Adicionar colunas + permitir NULL em winner_id/loser_id ───────────────
-- winner_id e loser_id precisam aceitar NULL para empates
ALTER TABLE match_results ALTER COLUMN winner_id DROP NOT NULL;
ALTER TABLE match_results ALTER COLUMN loser_id  DROP NOT NULL;

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS player1_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS player2_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_draw    BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Backfill player1_id/player2_id a partir de matches ────
UPDATE match_results mr
SET
  player1_id = m.player1_id,
  player2_id = m.player2_id
FROM matches m
WHERE m.id = mr.match_id
  AND (mr.player1_id IS NULL OR mr.player2_id IS NULL);

-- ── 3. Índices para queries por jogador ──────────────────────
CREATE INDEX IF NOT EXISTS idx_match_results_player1 ON match_results(player1_id);
CREATE INDEX IF NOT EXISTS idx_match_results_player2 ON match_results(player2_id);

-- ── 4. Atualizar RLS: inclui empates (player1/player2) ───────
DROP POLICY IF EXISTS "Users can view their own match results" ON match_results;

CREATE POLICY "Users can view their own match results"
  ON match_results FOR SELECT
  TO authenticated
  USING (
    winner_id   = auth.uid() OR
    loser_id    = auth.uid() OR
    player1_id  = auth.uid() OR
    player2_id  = auth.uid()
  );

-- ── 5. Recriar finalize_match_once com suporte a empates ─────
-- Drop assinatura antiga (7 params)
DROP FUNCTION IF EXISTS finalize_match_once(UUID, UUID, UUID, INT, INT, INT, INT);

CREATE OR REPLACE FUNCTION finalize_match_once(
  p_match_id      UUID,
  p_winner_id     UUID,       -- NULL em empate
  p_loser_id      UUID,       -- NULL em empate
  p_winner_score  INT,        -- kills do player1 (também usado em empate)
  p_loser_score   INT,        -- kills do player2 (também usado em empate)
  p_winner_xp     INT,
  p_loser_xp      INT,
  p_player1_id    UUID    DEFAULT NULL,
  p_player2_id    UUID    DEFAULT NULL,
  p_is_draw       BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_already_finalized BOOLEAN;
  v_p1_id UUID;
  v_p2_id UUID;
BEGIN
  -- ── Idempotência ─────────────────────────────────────────────
  SELECT EXISTS (
    SELECT 1 FROM match_results WHERE match_id = p_match_id
  ) INTO v_already_finalized;

  IF v_already_finalized THEN
    RETURN jsonb_build_object(
      'ok',               true,
      'already_finalized', true,
      'message',          'Match already finalized'
    );
  END IF;

  -- ── Resolver IDs dos jogadores ───────────────────────────────
  IF p_player1_id IS NULL OR p_player2_id IS NULL THEN
    SELECT player1_id, player2_id
      INTO v_p1_id, v_p2_id
      FROM matches
     WHERE id = p_match_id;
  ELSE
    v_p1_id := p_player1_id;
    v_p2_id := p_player2_id;
  END IF;

  -- ── Processamento atômico ────────────────────────────────────
  BEGIN
    -- 1. Inserir resultado
    INSERT INTO match_results (
      match_id,
      winner_id,    loser_id,
      winner_score, loser_score,
      winner_xp,    loser_xp,
      player1_id,   player2_id,
      is_draw
    ) VALUES (
      p_match_id,
      CASE WHEN p_is_draw THEN NULL ELSE p_winner_id END,
      CASE WHEN p_is_draw THEN NULL ELSE p_loser_id END,
      p_winner_score, p_loser_score,
      p_winner_xp,    p_loser_xp,
      v_p1_id, v_p2_id,
      p_is_draw
    );

    -- 2. Fechar match
    UPDATE matches
    SET
      phase      = 'finished',
      winner_id  = CASE WHEN p_is_draw THEN NULL ELSE p_winner_id END,
      finished_at = NOW()
    WHERE id = p_match_id;

    -- 3. Atualizar stats (vitória/derrota ou empate)
    IF p_is_draw THEN
      PERFORM update_player_stats_atomic(
        v_p1_id, 1, 0, 0, 1, p_winner_score, p_loser_score
      );
      PERFORM update_player_stats_atomic(
        v_p2_id, 1, 0, 0, 1, p_loser_score, p_winner_score
      );
    ELSE
      PERFORM update_player_stats_atomic(
        p_winner_id, 1, 1, 0, 0, p_winner_score, p_loser_score
      );
      PERFORM update_player_stats_atomic(
        p_loser_id,  1, 0, 1, 0, p_loser_score, p_winner_score
      );
      -- Incrementar multiplayer_wins
      UPDATE player_stats
      SET multiplayer_wins = COALESCE(multiplayer_wins, 0) + 1
      WHERE user_id = p_winner_id;
    END IF;

    RETURN jsonb_build_object(
      'ok',               true,
      'already_finalized', false,
      'is_draw',          p_is_draw,
      'message',          'Match finalized successfully'
    );

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to finalize match: %', SQLERRM;
  END;
END;
$$;

COMMENT ON FUNCTION finalize_match_once IS
'Finaliza match de forma idempotente e atômica. Suporta vitória, derrota e empate.
- player1_id/player2_id sempre preenchidos para identificar jogadores em empates.
- is_draw=TRUE: winner_id/loser_id são NULL; stats de ambos recebem draws++.
- Seguro contra race conditions e chamadas duplicadas.';

-- Permissões
GRANT EXECUTE ON FUNCTION finalize_match_once(UUID, UUID, UUID, INT, INT, INT, INT, UUID, UUID, BOOLEAN) TO authenticated;
REVOKE EXECUTE ON FUNCTION finalize_match_once(UUID, UUID, UUID, INT, INT, INT, INT, UUID, UUID, BOOLEAN) FROM public, anon;
