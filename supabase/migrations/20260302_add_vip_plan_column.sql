-- Migration: Add vip_plan column to profiles
-- Stores the plan ID (e.g. "1day", "7days") so the expiry notification
-- can reference the correct plan label.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vip_plan text DEFAULT NULL;

COMMENT ON COLUMN profiles.vip_plan IS 'VIP plan ID: 1day | 7days | 15days | 30days. Set when VIP is activated.';
