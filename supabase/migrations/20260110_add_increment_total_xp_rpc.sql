-- RPC function to increment total_xp atomically
-- This ensures total_xp is always correct even with concurrent matches

CREATE OR REPLACE FUNCTION increment_total_xp(p_user_id uuid, p_xp_gain integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure xp_gain is positive
  IF p_xp_gain <= 0 THEN
    RETURN;
  END IF;

  -- Atomically increment total_xp
  UPDATE player_progress
  SET total_xp = COALESCE(player_progress.total_xp, 0) + p_xp_gain
  WHERE user_id = p_user_id;

  -- If no row exists, create one with default values
  IF NOT FOUND THEN
    INSERT INTO player_progress (user_id, level, xp, xp_to_next, total_xp)
    VALUES (p_user_id, 1, 0, 300, p_xp_gain)
    ON CONFLICT (user_id) DO UPDATE
    SET total_xp = COALESCE(player_progress.total_xp, 0) + EXCLUDED.total_xp;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_total_xp(uuid, integer) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION increment_total_xp IS 'Incrementa total_xp de forma atômica. total_xp nunca diminui.';
