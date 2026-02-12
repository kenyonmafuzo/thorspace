-- Fix security issue: Remove SECURITY DEFINER from multiplayer_leaderboard view
-- Issue: View public.multiplayer_leaderboard is defined with the SECURITY DEFINER property
-- This view enforces permissions of the creator rather than the querying user

-- Drop the existing view if it exists
DROP VIEW IF EXISTS public.multiplayer_leaderboard;

-- Recreate the view with SECURITY INVOKER (uses querying user's permissions)
CREATE VIEW public.multiplayer_leaderboard
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.username,
  p.avatar_preset,
  p.multiplayer_wins,
  p.multiplayer_losses,
  p.multiplayer_draws,
  p.total_xp,
  p.level,
  -- Calculate win rate
  CASE 
    WHEN (p.multiplayer_wins + p.multiplayer_losses + p.multiplayer_draws) > 0 
    THEN ROUND((p.multiplayer_wins::numeric / (p.multiplayer_wins + p.multiplayer_losses + p.multiplayer_draws)::numeric * 100), 2)
    ELSE 0
  END as win_rate
FROM public.profiles p
WHERE 
  -- Only show players with at least 1 multiplayer match
  (p.multiplayer_wins + p.multiplayer_losses + p.multiplayer_draws) > 0
ORDER BY 
  p.multiplayer_wins DESC,
  win_rate DESC,
  p.total_xp DESC
LIMIT 100;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.multiplayer_leaderboard TO authenticated;
GRANT SELECT ON public.multiplayer_leaderboard TO anon;
