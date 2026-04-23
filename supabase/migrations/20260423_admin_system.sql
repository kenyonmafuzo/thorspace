-- ─────────────────────────────────────────────────────────────────────────────
-- THORSPACE ADMIN SYSTEM
-- Creates all tables needed for the /admin panel.
-- Completely isolated from the game's existing tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. ADMIN USERS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,             -- bcrypt hash, NOT Supabase auth
  role          text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  display_name  text,
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. ADMIN SESSIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash    text UNIQUE NOT NULL,      -- SHA-256 of the session token
  ip_address    text,
  user_agent    text,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- 3. ADMIN AUDIT LOGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  action        text NOT NULL,             -- e.g. 'vip.grant', 'user.ban'
  target_type   text,                      -- e.g. 'user', 'vip_subscription'
  target_id     text,
  old_value     jsonb,
  new_value     jsonb,
  ip_address    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at   ON admin_audit_logs(created_at DESC);

-- 4. VIP SUBSCRIPTIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vip_subscriptions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  email                     text NOT NULL,
  provider                  text NOT NULL CHECK (provider IN ('stripe','mercado_pago','manual','gift','coupon')),
  provider_customer_id      text,
  provider_subscription_id  text,
  provider_plan_id          text,
  internal_plan_code        text,          -- '1day','7days','15days','30days'
  status                    text NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','canceled','expired','past_due','manual','gifted')),
  is_auto_renew             boolean NOT NULL DEFAULT false,
  started_at                timestamptz NOT NULL DEFAULT now(),
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  canceled_at               timestamptz,
  expired_at                timestamptz,
  granted_by_admin_id       uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vip_subs_user_id  ON vip_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_subs_status   ON vip_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_vip_subs_provider ON vip_subscriptions(provider);

-- 5. VIP PAYMENT HISTORY ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vip_payment_history (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subscription_id       uuid REFERENCES vip_subscriptions(id) ON DELETE SET NULL,
  provider              text NOT NULL,
  provider_payment_id   text,
  provider_invoice_id   text,
  amount                numeric(10,2) NOT NULL DEFAULT 0,
  currency              text NOT NULL DEFAULT 'USD',
  status                text NOT NULL CHECK (status IN ('paid','failed','refunded','pending')),
  payment_method        text,
  coupon_code           text,
  discount_amount       numeric(10,2) DEFAULT 0,
  paid_at               timestamptz,
  failed_at             timestamptz,
  refunded_at           timestamptz,
  raw_payload_json      jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vip_payments_user_id ON vip_payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_payments_status  ON vip_payment_history(status);

-- 6. VIP STATUS HISTORY ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vip_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES vip_subscriptions(id) ON DELETE SET NULL,
  action          text NOT NULL
                    CHECK (action IN ('granted','renewed','expired','canceled',
                                      'manual_extend','manual_remove','payment_failed')),
  old_status      text,
  new_status      text,
  reason          text,
  admin_user_id   uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  metadata_json   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vip_history_user_id ON vip_status_history(user_id);

-- 7. VIP GRANTS PENDING ───────────────────────────────────────────────────────
-- For granting VIP to emails not yet registered
CREATE TABLE IF NOT EXISTS vip_grants_pending (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text UNIQUE NOT NULL,
  internal_plan   text NOT NULL,
  days            int NOT NULL,
  granted_by      uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  notes           text,
  claimed         boolean NOT NULL DEFAULT false,
  claimed_at      timestamptz,
  claimed_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 8. COUPONS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vip_coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  description     text,
  discount_type   text NOT NULL CHECK (discount_type IN ('percent','fixed','free_days')),
  discount_value  numeric(10,2) NOT NULL,
  max_uses        int,
  uses_count      int NOT NULL DEFAULT 0,
  valid_from      timestamptz,
  valid_until     timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 9. NEWSLETTERS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_newsletters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject         text NOT NULL,
  body_html       text NOT NULL,
  segment         text NOT NULL DEFAULT 'all' CHECK (segment IN ('all','vip','non_vip','inactive')),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','failed')),
  sent_count      int NOT NULL DEFAULT 0,
  failed_count    int NOT NULL DEFAULT 0,
  sent_at         timestamptz,
  created_by      uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 10. NEWS / ANNOUNCEMENTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_news (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  body            text NOT NULL,
  image_url       text,
  segment         text NOT NULL DEFAULT 'all',
  published       boolean NOT NULL DEFAULT false,
  published_at    timestamptz,
  created_by      uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 11. GAME ASSETS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  description     text,
  category        text NOT NULL CHECK (category IN ('background','sound','badge','ship','shot')),
  file_url        text,
  preview_url     text,
  is_vip          boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      int NOT NULL DEFAULT 0,
  metadata_json   jsonb,
  created_by      uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_assets_category ON game_assets(category);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- All admin tables are accessed ONLY via service role key (server-side).
-- Block all direct client access.
ALTER TABLE admin_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_grants_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_coupons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_newsletters  ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_news         ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_assets        ENABLE ROW LEVEL SECURITY;

-- No policies = no access from anon/authenticated clients (service role bypasses RLS)
