-- Adicionar colunas de heartbeat para detectar desconexão
-- Cada jogador atualiza seu heartbeat a cada 3s, se não atualizar por 10s = desconectado

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS player1_last_seen TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS player2_last_seen TIMESTAMPTZ;

-- Índice para queries por last_seen
CREATE INDEX IF NOT EXISTS idx_matches_player1_last_seen ON matches(player1_last_seen);
CREATE INDEX IF NOT EXISTS idx_matches_player2_last_seen ON matches(player2_last_seen);

-- Comentários
COMMENT ON COLUMN matches.player1_last_seen IS 'Último heartbeat do player1 - usado para detectar desconexão';
COMMENT ON COLUMN matches.player2_last_seen IS 'Último heartbeat do player2 - usado para detectar desconexão';
