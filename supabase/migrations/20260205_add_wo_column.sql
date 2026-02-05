-- Adicionar coluna para marcar vitórias por WO (walkover)
-- WO acontece quando um jogador sai/desconecta durante a partida

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS wo BOOLEAN DEFAULT FALSE;

-- Adicionar índice para buscar matches por WO
CREATE INDEX IF NOT EXISTS idx_matches_wo ON matches(wo) WHERE wo = TRUE;

-- Comentário para documentação
COMMENT ON COLUMN matches.wo IS 'True se o match terminou por WO (walkover - jogador desconectou)';
