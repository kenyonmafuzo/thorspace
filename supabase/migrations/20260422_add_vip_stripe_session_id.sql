-- Adds idempotency key for Stripe webhook processing.
-- The webhook stores the processed Checkout session ID here after activating VIP.
-- Before activating, the webhook checks this column to skip duplicate deliveries.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vip_stripe_session_id text DEFAULT NULL;

COMMENT ON COLUMN profiles.vip_stripe_session_id IS
  'Last processed Stripe Checkout session ID — used for webhook idempotency';
