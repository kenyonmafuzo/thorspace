-- Analytics: page view tracking table
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS page_views (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  path        text        NOT NULL,
  visitor_id  text,       -- SHA-256(ip + ua + date) — anonymous fingerprint for unique-visitor counting
  user_id     uuid,       -- set when user is authenticated (from cookie/header)
  country     text,       -- from Vercel x-vercel-ip-country header
  city        text,       -- from Vercel x-vercel-ip-city header
  region      text,       -- from Vercel x-vercel-ip-region header
  user_agent  text,       -- raw User-Agent header
  referrer    text,       -- Referer header
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at  ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path        ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id  ON page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_country     ON page_views(country);

-- Block direct client access; only service role can read/write
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
