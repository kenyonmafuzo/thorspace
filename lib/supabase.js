import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Não dá throw pra não quebrar build em certos ambientes,
  // mas no dev você vai ver o aviso.
  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Global wakeup handler.
// KEY INSIGHT: autoRefreshToken:true means Supabase is ALREADY listening to
// visibilitychange and refreshing the token internally. If we call
// refreshSession() ourselves at the same time → AbortError (the two battles).
//
// Correct approach:
//   1. On wakeup, check session.expires_at (localStorage, no network).
//      • Token still valid  → recover immediately (resubscribe + fire thor_wakeup_ready)
//      • Token expired/soon → set _expectingWakeupRefresh=true and wait.
//                             Supabase autoRefreshToken fires TOKEN_REFRESHED when done.
//                             We react: resubscribe + fire thor_wakeup_ready.
//                             Fallback: if TOKEN_REFRESHED never arrives in 8s → reload.
//
// thor_wakeup_ready is the single event that tells UserStatsProvider/ranking
// "auth is confirmed valid, refresh your data now".
if (typeof window !== "undefined") {
  let _wakeLock = false;
  let _expectingWakeupRefresh = false;
  let _wakeupFallbackTimer = null;

  function _resubscribeDeadChannels() {
    const channels = supabase.getChannels();
    channels.forEach((ch) => {
      const isGameChannel = ch.topic.includes("match-accepted") ||
                            ch.topic.includes("match-invites") ||
                            ch.topic.includes("pending-match");
      if (isGameChannel) return;
      const state = ch.state;
      console.log(`[WAKE] channel "${ch.topic}" state=${state}`);
      if (state !== "joined" && state !== "joining") {
        console.log(`[WAKE] resubscribing "${ch.topic}"`);
        try { ch.subscribe(); } catch (e) {
          console.warn(`[WAKE] resubscribe failed for "${ch.topic}":`, e);
        }
      }
    });
  }

  // React to Supabase completing its own token refresh (autoRefreshToken).
  // Only fire thor_wakeup_ready if we expected a wakeup refresh.
  supabase.auth.onAuthStateChange((event) => {
    if (event === "TOKEN_REFRESHED" && _expectingWakeupRefresh) {
      _expectingWakeupRefresh = false;
      clearTimeout(_wakeupFallbackTimer);
      _wakeupFallbackTimer = null;
      console.log("[WAKE] TOKEN_REFRESHED received — completing wakeup recovery");
      _resubscribeDeadChannels();
      window.dispatchEvent(new CustomEvent("thor_wakeup_ready"));
    }
  });

  const _handleWakeup = async (eventType) => {
    if (document.visibilityState !== "visible") return;
    if (_wakeLock) {
      console.log(`[WAKE] ${eventType} — skipped (lock active)`);
      return;
    }
    _wakeLock = true;
    console.log(`[WAKE] ${eventType} — wakeup detected`);
    try {
      // getSession() reads from localStorage — instant, no network
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("[WAKE] no session — nothing to recover");
        _wakeLock = false;
        return;
      }
      const nowSec = Math.floor(Date.now() / 1000);
      const secsLeft = session.expires_at - nowSec;
      const tokenValid = secsLeft > 10;
      console.log(`[WAKE] token ${tokenValid ? `valid (${secsLeft}s left)` : `expired (${secsLeft}s ago)`}`);

      if (tokenValid) {
        // Token is fine — recover right now
        _resubscribeDeadChannels();
        window.dispatchEvent(new CustomEvent("thor_wakeup_ready"));
        console.log("[WAKE] recovery complete (token was valid)");
      } else {
        // Token expired — Supabase's autoRefreshToken will handle it.
        // We set a flag and wait for TOKEN_REFRESHED (above listener).
        _expectingWakeupRefresh = true;
        console.log("[WAKE] token expired — waiting for autoRefresh TOKEN_REFRESHED");
        // Fallback: force reload if TOKEN_REFRESHED never arrives (e.g. network down)
        _wakeupFallbackTimer = setTimeout(() => {
          console.log("[WAKE] TOKEN_REFRESHED timeout — forcing reload");
          window.location.reload();
        }, 8000);
      }
    } catch (e) {
      console.warn("[WAKE] wakeup error:", e);
    } finally {
      setTimeout(() => { _wakeLock = false; }, 2000);
    }
  };

  document.addEventListener("visibilitychange", () => _handleWakeup("visibilitychange"));
  window.addEventListener("focus", () => _handleWakeup("focus"));
  window.addEventListener("online", () => _handleWakeup("online"));
}
