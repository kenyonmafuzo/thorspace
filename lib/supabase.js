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

// Global wakeup handler: runs once here so every part of the app (chat,
// multiplayer, ranking, etc.) benefits without each page managing its own.
if (typeof window !== "undefined") {
  // _wakeLock prevents concurrent recovery runs, but is cleared immediately
  // on failure so the next event can retry (not after a fixed cooldown).
  let _wakeLock = false;

  const _handleWakeup = async (eventType) => {
    if (document.visibilityState !== "visible") return;
    if (_wakeLock) {
      console.log(`[WAKE] ${eventType} — skipped (recovery already running)`);
      return;
    }
    _wakeLock = true;
    console.log(`[WAKE] ${eventType} — starting recovery`);

    try {
      // 1. Refresh auth session so all subsequent HTTP requests have a valid token.
      //    getSession() is localStorage-only (instant, no network).
      //    refreshSession() is wrapped in its own try-catch: an AbortError means
      //    Supabase's internal autoRefreshToken is already running — that's fine,
      //    we just continue. The TOKEN_REFRESHED event will fire when it completes
      //    and UserStatsProvider will react to it via onAuthStateChange.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          await supabase.auth.refreshSession();
          console.log("[WAKE] session refreshed OK");
        } catch (refreshErr) {
          if (refreshErr?.name === "AbortError") {
            // autoRefreshToken is already refreshing — that's OK, continue recovery
            console.log("[WAKE] refreshSession aborted (autoRefresh already in progress) — continuing");
          } else {
            // Real error (network down, etc.) — still continue recovery so channels get resubscribed
            console.warn("[WAKE] refreshSession error (continuing anyway):", refreshErr?.message);
          }
        }
      } else {
        console.log("[WAKE] no session — skipping token refresh");
      }

      // 2. Log and re-subscribe only DEAD channels (chat + presence).
      //    Game/match channels are intentionally excluded — they manage
      //    themselves and we must not interfere with gameplay state.
      const channels = supabase.getChannels();
      console.log(`[WAKE] ${channels.length} channel(s) found`);
      channels.forEach((ch) => {
        const state = ch.state;
        console.log(`[WAKE] channel "${ch.topic}" state=${state}`);
        // Only resubscribe non-game channels that are dead
        const isGameChannel = ch.topic.includes("match-accepted") ||
                              ch.topic.includes("match-invites") ||
                              ch.topic.includes("pending-match");
        if (!isGameChannel && state !== "joined" && state !== "joining") {
          console.log(`[WAKE] resubscribing dead channel "${ch.topic}"`);
          try { ch.subscribe(); } catch (e) {
            console.warn(`[WAKE] resubscribe failed for "${ch.topic}":`, e);
          }
        }
      });

      console.log("[WAKE] recovery complete");
      // Cooldown only after success to allow retry on failure
      setTimeout(() => { _wakeLock = false; }, 3000);
    } catch (e) {
      console.warn("[WAKE] recovery error:", e);
      // Release immediately on failure so next event can retry
      _wakeLock = false;
    }
  };

  document.addEventListener("visibilitychange", () => _handleWakeup("visibilitychange"));
  window.addEventListener("focus", () => _handleWakeup("focus"));
  window.addEventListener("online", () => _handleWakeup("online"));
}
