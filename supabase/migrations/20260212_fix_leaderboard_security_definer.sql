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
  COALESCE(ps.multiplayer_wins, 0) as multiplayer_wins,
  COALESCE(ps.multiplayer_losses, 0) as multiplayer_losses,
  COALESCE(ps.multiplayer_draws, 0) as multiplayer_draws,
  COALESCE(ps.total_xp, 0) as total_xp,
  COALESCE(ps.level, 1) as level,
  -- Calculate win rate
  CASE 
    WHEN (COALESCE(ps.multiplayer_wins, 0) + COALESCE(ps.multiplayer_losses, 0) + COALESCE(ps.multiplayer_draws, 0)) > 0 
    THEN ROUND((COALESCE(ps.multiplayer_wins, 0)::numeric / (COALESCE(ps.multiplayer_wins, 0) + COALESCE(ps.multiplayer_losses, 0) + COALESCE(ps.multiplayer_draws, 0))::numeric * 100), 2)
    ELSE 0
  END as win_rate
FROM public.profiles p
LEFT JOIN public.player_stats ps ON p.id = ps.user_id
WHERE 
  -- Only show players with at least 1 multiplayer match
  (COALESCE(ps.multiplayer_wins, 0) + COALESCE(ps.multiplayer_losses, 0) + COALESCE(ps.multiplayer_draws, 0)) > 0
ORDER BY 
  multiplayer_wins DESC,
  win_rate DESC,
  total_xp DESC
LIMIT 100;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.multiplayer_leaderboard TO authenticated;
GRANT SELECT ON public.multiplayer_leaderboard TO anon;
