-- Migration: Add action tracking columns to matches table
-- Date: 2026-01-08

-- Add action columns for turn-based gameplay
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS action_blue jsonb,
  ADD COLUMN IF NOT EXISTS action_red jsonb,
  ADD COLUMN IF NOT EXISTS submitted_blue boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_red boolean DEFAULT false;

-- Add comments
COMMENT ON COLUMN public.matches.action_blue IS 'Blue player actions for current turn (moves + shots)';
COMMENT ON COLUMN public.matches.action_red IS 'Red player actions for current turn (moves + shots)';
COMMENT ON COLUMN public.matches.submitted_blue IS 'Whether blue player submitted their turn';
COMMENT ON COLUMN public.matches.submitted_red IS 'Whether red player submitted their turn';
