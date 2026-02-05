-- Add title and meta columns to inbox table
-- These columns store additional notification metadata

ALTER TABLE inbox 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- Add index for querying by meta fields if needed
CREATE INDEX IF NOT EXISTS idx_inbox_meta ON inbox USING GIN (meta);
