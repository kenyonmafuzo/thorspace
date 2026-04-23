-- Add lang column to admin_news
-- Values: 'all' (show to everyone), 'pt', 'en', 'es'
-- Run this in the Supabase SQL editor.

ALTER TABLE admin_news
  ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'all'
    CHECK (lang IN ('all', 'pt', 'en', 'es'));

-- Update the existing welcome news seed to 'pt' if it was inserted
UPDATE admin_news
  SET lang = 'pt'
  WHERE title = 'Bem-vindo(a) ao Thorspace!'
    AND lang = 'all';
