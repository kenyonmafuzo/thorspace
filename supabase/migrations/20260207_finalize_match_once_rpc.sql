-- ============================================
-- FINALIZE MATCH ONCE - AAA IDEMPOTENT RPC
-- ============================================
-- Função idempotente para finalizar match e atualizar stats
-- Usa match_results table (PK on match_id) para garantir processamento único
-- Backend authoritative: apenas Player1 (host) pode chamar via API

-- Primeiro, criar tabela match_results se não existir
CREATE TABLE IF NOT EXISTS match_results (
  match_id UUID PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES auth.users(id),
  loser_id UUID REFERENCES auth.users(id),
  winner_score INT NOT NULL DEFAULT 0,
  loser_score INT NOT NULL DEFAULT 0,
  winner_xp INT NOT NULL DEFAULT 0,
  loser_xp INT NOT NULL DEFAULT 0,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index para queries por winner/loser
CREATE INDEX IF NOT EXISTS idx_match_results_winner ON match_results(winner_id);
CREATE INDEX IF NOT EXISTS idx_match_results_loser ON match_results(loser_id);

-- RLS: Qualquer usuário autenticado pode ler seus próprios resultados
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own match results"
  ON match_results FOR SELECT
  TO authenticated
  USING (winner_id = auth.uid() OR loser_id = auth.uid());

-- Apenas backend pode inserir (via RPC)
CREATE POLICY "Only backend can insert match results"
  ON match_results FOR INSERT
  TO authenticated
  WITH CHECK (false); -- Ninguém pode inserir diretamente, apenas via RPC

-- Função idempotente para finalizar match
CREATE OR REPLACE FUNCTION finalize_match_once(
  p_match_id UUID,
  p_winner_id UUID,
  p_loser_id UUID,
  p_winner_score INT,
  p_loser_score INT,
  p_winner_xp INT,
  p_loser_xp INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com permissões do owner (bypass RLS)
AS $$
DECLARE
  v_already_finalized BOOLEAN;
BEGIN
  -- 🛡️ IDEMPOTÊNCIA: Verificar se match já foi finalizado
  SELECT EXISTS (
    SELECT 1 FROM match_results WHERE match_id = p_match_id
  ) INTO v_already_finalized;
  
  IF v_already_finalized THEN
    -- Match já foi processado, retornar sucesso sem fazer nada
    RETURN jsonb_build_object(
      'ok', true,
      'already_finalized', true,
      'message', 'Match already finalized'
    );
  END IF;
  
  -- 🎯 PROCESSAMENTO ATÔMICO (tudo ou nada)
  BEGIN
    -- 1️⃣ Inserir resultado na tabela match_results (PK garante unicidade)
    INSERT INTO match_results (
      match_id,
      winner_id,
      loser_id,
      winner_score,
      loser_score,
      winner_xp,
      loser_xp
    ) VALUES (
      p_match_id,
      p_winner_id,
      p_loser_id,
      p_winner_score,
      p_loser_score,
      p_winner_xp,
      p_loser_xp
    );
    
    -- 2️⃣ Atualizar match para finished
    UPDATE matches
    SET 
      phase = 'finished',
      winner_id = p_winner_id,
      finished_at = NOW()
    WHERE id = p_match_id;
    
    -- 3️⃣ Atualizar stats do vencedor (atomicamente)
    PERFORM update_player_stats_atomic(
      p_winner_id,
      1, -- matches_played
      1, -- wins
      0, -- losses
      0, -- draws
      p_winner_score, -- ships_destroyed
      p_loser_score   -- ships_lost
    );
    
    -- 4️⃣ Atualizar stats do perdedor (atomicamente)
    PERFORM update_player_stats_atomic(
      p_loser_id,
      1, -- matches_played
      0, -- wins
      1, -- losses
      0, -- draws
      p_loser_score,  -- ships_destroyed
      p_winner_score  -- ships_lost
    );
    
    -- 5️⃣ Atualizar multiplayer_wins se vencedor tiver esse campo
    UPDATE player_stats
    SET multiplayer_wins = COALESCE(multiplayer_wins, 0) + 1
    WHERE user_id = p_winner_id;
    
    RETURN jsonb_build_object(
      'ok', true,
      'already_finalized', false,
      'message', 'Match finalized successfully'
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback automático em caso de erro
    RAISE EXCEPTION 'Failed to finalize match: %', SQLERRM;
  END;
END;
$$;

-- Comentário
COMMENT ON FUNCTION finalize_match_once IS 
'Finaliza match de forma idempotente e atômica.
- Usa match_results table (PK) para garantir processamento único
- Atualiza match, stats do vencedor e perdedor atomicamente
- Seguro contra race conditions e chamadas duplicadas
- Apenas backend (via API) deve chamar esta função';

-- Grant permission to authenticated users (API usará token do usuário)
GRANT EXECUTE ON FUNCTION finalize_match_once(UUID, UUID, UUID, INT, INT, INT, INT) TO authenticated;

-- Revoke from public/anon for security
REVOKE EXECUTE ON FUNCTION finalize_match_once(UUID, UUID, UUID, INT, INT, INT, INT) FROM public, anon;
