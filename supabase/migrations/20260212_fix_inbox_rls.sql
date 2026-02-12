-- Fix security issue: Enable RLS on inbox table
-- Issue: Table public.inbox is public, but RLS has not been enabled

-- Enable RLS on inbox table
ALTER TABLE public.inbox ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own inbox notifications
CREATE POLICY "Users can view own inbox notifications"
  ON public.inbox
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update their own inbox notifications (mark as viewed)
CREATE POLICY "Users can update own inbox notifications"
  ON public.inbox
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Allow service role to insert inbox notifications (for system notifications)
CREATE POLICY "Service role can insert inbox notifications"
  ON public.inbox
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can delete their own inbox notifications
CREATE POLICY "Users can delete own inbox notifications"
  ON public.inbox
  FOR DELETE
  USING (auth.uid() = user_id);
