-- Migration: Add player1_hp and player2_hp columns to matches table
-- Purpose: Sync ship HP between clients during battle
-- Date: 2026-01-08

-- Add columns for storing ship HP (array of 3 integers)
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS player1_hp integer[],
ADD COLUMN IF NOT EXISTS player2_hp integer[];

-- Add helpful comments
COMMENT ON COLUMN matches.player1_hp IS 'HP array for player1 ships (blue team) - [ship0_hp, ship1_hp, ship2_hp]';
COMMENT ON COLUMN matches.player2_hp IS 'HP array for player2 ships (red team) - [ship0_hp, ship1_hp, ship2_hp]';

-- Add winner_id column for tracking match winner
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS finished_at timestamptz;

COMMENT ON COLUMN matches.winner_id IS 'User ID of the match winner (null for draw)';
COMMENT ON COLUMN matches.finished_at IS 'Timestamp when match finished';
