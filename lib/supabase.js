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
//
// AAA pattern: detect wakeup → wait for Supabase's internal auth handlers
// to fully settle (they fire SIGNED_IN even on valid sessions) → THEN fire
// thor_wakeup_ready so data fetches never race with auth reinit → no AbortError.
//
// Only visibilitychange is used. focus/online caused double-firing (focus fires
// before visibilitychange on the same wakeup).
if (typeof window !== "undefined") {
  let _hiddenAt = 0;
  let _wakeupLock = false;

  function _resubscribeDeadChannels() {
    const channels = supabase.getChannels();
    channels.forEach((ch) => {
      const isGameChannel = ch.topic.includes("match-accepted") ||
                            ch.topic.includes("match-invites") ||
                            ch.topic.includes("pending-match");
      if (isGameChannel) return;
      if (ch.state !== "joined" && ch.state !== "joining") {
        try { ch.subscribe(); } catch (e) {}
      }
    });
  }

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "hidden") {
      _hiddenAt = Date.now();
      return;
    }

    // Became visible
    const hiddenMs = Date.now() - _hiddenAt;

    // Ignore micro-hides (< 3s) — likely just DevTools or a notification
    if (hiddenMs < 3000) {
      return;
    }

    // Hidden > 10 minutes → silent reload is cleanest (AAA pattern)
    if (hiddenMs > 10 * 60 * 1000) {
      window.location.reload();
      return;
    }

    if (_wakeupLock) {
      return;
    }
    _wakeupLock = true;

    // KEY: wait 800ms before doing ANYTHING.
    // Supabase fires SIGNED_IN on every wakeup (even with a valid token) as
    // part of its internal session re-validation via autoRefreshToken.
    // Any Supabase data fetch started before this reinit finishes gets
    // AbortError. 800ms is enough for SIGNED_IN to complete on any network.
    await new Promise(r => setTimeout(r, 800));

    _resubscribeDeadChannels();
    window.dispatchEvent(new CustomEvent("thor_wakeup_ready"));

    // Release lock after a short cooldown so rapid re-hides can trigger again
    setTimeout(() => { _wakeupLock = false; }, 3000);
  });
}
