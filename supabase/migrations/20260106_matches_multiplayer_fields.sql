-- Migration: Add multiplayer turn-based fields to matches table
-- Date: 2026-01-06

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS ready_blue boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ready_red boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ships_blue jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ships_red jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS phase text DEFAULT 'select',
  ADD COLUMN IF NOT EXISTS turn text DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS turn_index integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add index for realtime queries
CREATE INDEX IF NOT EXISTS matches_id_updated_at_idx ON public.matches(id, updated_at);

-- Add trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS matches_updated_at_trigger ON public.matches;
CREATE TRIGGER matches_updated_at_trigger
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION update_matches_updated_at();

-- Add comment
COMMENT ON COLUMN public.matches.phase IS 'Match phase: select | battle | finished';
COMMENT ON COLUMN public.matches.turn IS 'Current turn: blue | red';
