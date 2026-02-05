-- Migration: Add username column to chat_messages if not exists
-- Date: 2026-01-05
-- Purpose: Denormalize username for better chat performance and reliability

-- Add username column if it doesn't exist
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS username text;

-- Create index on created_at for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at 
ON public.chat_messages(created_at DESC);

-- Optional: Backfill existing messages with username from profiles
-- This can be run separately if needed
-- UPDATE public.chat_messages cm
-- SET username = p.username
-- FROM public.profiles p
-- WHERE cm.user_id = p.id
-- AND cm.username IS NULL;

COMMENT ON COLUMN public.chat_messages.username IS 'Denormalized username for performance - avoid joins on every message fetch';
