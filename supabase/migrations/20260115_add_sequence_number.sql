-- Add sequence_number column to match_events for AAA multiplayer event ordering
-- Phase 1: Authoritative Collision Detection

ALTER TABLE match_events 
ADD COLUMN IF NOT EXISTS sequence_number INTEGER;

-- Add index for faster event ordering queries
CREATE INDEX IF NOT EXISTS idx_match_events_sequence 
ON match_events(match_id, sequence_number);

-- Add comment for documentation
COMMENT ON COLUMN match_events.sequence_number IS 'Sequential number for event ordering in AAA multiplayer system';
