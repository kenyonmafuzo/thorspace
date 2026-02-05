-- Add total_xp column to player_progress for rank system
-- Total XP never decreases, only increases
-- Used to calculate rank (tier + material) based on 21 levels

ALTER TABLE player_progress
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0 NOT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_player_progress_total_xp ON player_progress(total_xp DESC);

-- Comment for documentation
COMMENT ON COLUMN player_progress.total_xp IS 'Total XP acumulado (nunca diminui) - usado para calcular rank (21 níveis)';
