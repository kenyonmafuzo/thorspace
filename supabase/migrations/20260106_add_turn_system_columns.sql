-- Migration: Add turn-based system columns to matches table
-- Date: 2026-01-06

-- Add turn system columns
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS turn_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS turn_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS turn_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS turn_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS player1_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS player2_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS turn_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS player1_ships jsonb,
  ADD COLUMN IF NOT EXISTS player2_ships jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_turn_number ON public.matches(turn_number);
CREATE INDEX IF NOT EXISTS idx_matches_turn_deadline ON public.matches(turn_deadline_at);
CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON public.matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON public.matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_turn_user_id ON public.matches(turn_user_id);

-- Add comments
COMMENT ON COLUMN public.matches.turn_number IS 'Current turn number in the match';
COMMENT ON COLUMN public.matches.turn_deadline_at IS 'Deadline for current turn (15 seconds)';
COMMENT ON COLUMN public.matches.turn_resolved_at IS 'When the turn was resolved';
COMMENT ON COLUMN public.matches.turn_user_id IS 'Which player should act in current turn';
