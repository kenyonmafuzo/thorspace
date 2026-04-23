-- Add delivery mode columns to admin_news table
-- Run this in the Supabase SQL editor

ALTER TABLE admin_news
  ADD COLUMN IF NOT EXISTS show_as_login_modal   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_in_notifications boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_in_game_updates  boolean NOT NULL DEFAULT false;
