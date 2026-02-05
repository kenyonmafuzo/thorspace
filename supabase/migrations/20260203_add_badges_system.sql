-- Migration: Adicionar suporte a badges
-- Criado em: 2026-02-03

-- 1. Adicionar coluna badges no profiles (array de IDs de badges desbloqueadas)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';

-- 2. Adicionar colunas de tracking no player_stats
ALTER TABLE player_stats
ADD COLUMN IF NOT EXISTS login_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_win_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_diverse_victory BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_comeback_victory BOOLEAN DEFAULT FALSE;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_badges ON profiles USING GIN (badges);
CREATE INDEX IF NOT EXISTS idx_player_stats_badges ON player_stats(user_id, max_win_streak, login_streak);

-- 4. Comentários
COMMENT ON COLUMN profiles.badges IS 'Array de IDs de badges desbloqueadas pelo jogador';
COMMENT ON COLUMN player_stats.login_days IS 'Número total de dias diferentes que o jogador entrou';
COMMENT ON COLUMN player_stats.login_streak IS 'Maior sequência consecutiva de dias que o jogador entrou';
COMMENT ON COLUMN player_stats.max_win_streak IS 'Maior sequência consecutiva de vitórias';
COMMENT ON COLUMN player_stats.has_diverse_victory IS 'Se venceu usando 3 tipos diferentes de nave';
COMMENT ON COLUMN player_stats.has_comeback_victory IS 'Se venceu uma partida estando em desvantagem';
