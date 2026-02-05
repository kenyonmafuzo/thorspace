-- Migration: Allow system messages in chat
-- Date: 2026-01-09
-- Purpose: Ensure system messages (like match results) can be inserted by authenticated users

-- Drop existing insert policy
DROP POLICY IF EXISTS "chat_messages_insert_policy" ON public.chat_messages;

-- Create new insert policy that allows:
-- 1. Users to insert their own messages (user_id = auth.uid())
-- 2. Users to insert system messages (type = 'system')
CREATE POLICY "chat_messages_insert_policy" 
ON public.chat_messages 
FOR INSERT 
TO authenticated 
WITH CHECK (
  user_id = auth.uid() 
  OR type = 'system'
);
