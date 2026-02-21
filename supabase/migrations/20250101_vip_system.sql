-- VIP System Migration
-- Run this in the Supabase SQL Editor (requires service role / admin access)

-- 1. Add VIP customization columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vip_name_color text DEFAULT '#FFD700',
  ADD COLUMN IF NOT EXISTS vip_frame_color text DEFAULT '#FFD700';

-- 2. Activate VIP for the 'kenyon' test account (expires 2099)
UPDATE profiles
SET
  is_vip = true,
  vip_expires_at = '2099-12-31 23:59:59+00',
  vip_name_color = '#FFD700',
  vip_frame_color = '#FFD700'
WHERE username = 'kenyon';

-- Verify the changes
SELECT id, username, is_vip, vip_expires_at, vip_name_color, vip_frame_color
FROM profiles
WHERE username = 'kenyon';
