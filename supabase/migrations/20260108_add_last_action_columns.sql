-- Migration: Add last_action_blue and last_action_red columns to matches table
-- Purpose: Store resolved turn actions for Realtime sync before clearing action_blue/action_red
-- Date: 2026-01-08

-- Add columns for storing last resolved turn actions
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS last_action_blue jsonb,
ADD COLUMN IF NOT EXISTS last_action_red jsonb;

-- Add helpful comment
COMMENT ON COLUMN matches.last_action_blue IS 'Last resolved action from blue team (player1) for Realtime sync';
COMMENT ON COLUMN matches.last_action_red IS 'Last resolved action from red team (player2) for Realtime sync';
