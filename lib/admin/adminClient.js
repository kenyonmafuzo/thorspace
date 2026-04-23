// lib/admin/adminClient.js
// Service-role Supabase client for admin operations.
// NEVER expose this to the browser. Only used in Server Components and API routes.

import { createClient } from "@supabase/supabase-js";

let _adminClient = null;

export function getAdminClient() {
  if (_adminClient) return _adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("[Admin] Supabase env vars ausentes");
  _adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminClient;
}
