-- Migration: RLS Policies for chat_messages table
-- Date: 2026-01-06
-- Purpose: Enable RLS and create policies for chat_messages

-- Enable RLS on chat_messages table
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to SELECT all messages
CREATE POLICY "chat_messages_select_policy" 
ON public.chat_messages 
FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Allow authenticated users to INSERT only their own messages
-- Ensures user_id matches auth.uid()
CREATE POLICY "chat_messages_insert_policy" 
ON public.chat_messages 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Optional: Policy to allow users to UPDATE only their own messages (if needed)
-- CREATE POLICY "chat_messages_update_policy" 
-- ON public.chat_messages 
-- FOR UPDATE 
-- TO authenticated 
-- USING (user_id = auth.uid())
-- WITH CHECK (user_id = auth.uid());

-- Optional: Policy to allow users to DELETE only their own messages (if needed)
-- CREATE POLICY "chat_messages_delete_policy" 
-- ON public.chat_messages 
-- FOR DELETE 
-- TO authenticated 
-- USING (user_id = auth.uid());

-- Grant permissions to authenticated role
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;

-- Create index for better performance on created_at (if not exists)
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at 
ON public.chat_messages(created_at DESC);

-- Create index for user_id lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id 
ON public.chat_messages(user_id);

COMMENT ON POLICY "chat_messages_select_policy" ON public.chat_messages 
IS 'Allow all authenticated users to read chat messages';

COMMENT ON POLICY "chat_messages_insert_policy" ON public.chat_messages 
IS 'Allow authenticated users to insert messages only with their own user_id';
