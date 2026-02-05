-- Adicionar coluna multiplayer_wins na tabela player_stats
-- Esta coluna é necessária para o sistema de badges de vitórias

ALTER TABLE player_stats
ADD COLUMN IF NOT EXISTS multiplayer_wins INTEGER DEFAULT 0;

-- Popular a coluna com dados existentes (contando vitórias da tabela matches)
UPDATE player_stats ps
SET multiplayer_wins = (
  SELECT COUNT(*)
  FROM matches m
  WHERE (m.player1_id = ps.user_id AND m.winner_id = ps.user_id)
     OR (m.player2_id = ps.user_id AND m.winner_id = ps.user_id)
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_player_stats_multiplayer_wins ON player_stats(user_id, multiplayer_wins);

-- Comentário
COMMENT ON COLUMN player_stats.multiplayer_wins IS 'Número total de vitórias em partidas multiplayer';
