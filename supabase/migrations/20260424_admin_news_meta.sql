-- Add meta JSONB column to admin_news to support DM tracking
-- Used to store: { is_dm: true, dm_user_ids: [...], dm_usernames: [...] }
ALTER TABLE admin_news
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;
