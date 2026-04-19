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
  let _wakeLock = false;
  const _handleWakeup = async () => {
    if (document.visibilityState !== "visible" || _wakeLock) return;
    _wakeLock = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
      }
      // Re-subscribe any realtime channels that dropped during suspension
      supabase.getChannels().forEach((ch) => {
        if (ch.state !== "joined" && ch.state !== "joining") {
          try { ch.subscribe(); } catch (_) {}
        }
      });
    } catch (e) {
      console.warn("[supabase] wakeup refresh error:", e);
    } finally {
      // Allow next wakeup to fire after 3s cooldown
      setTimeout(() => { _wakeLock = false; }, 3000);
    }
  };
  document.addEventListener("visibilitychange", _handleWakeup);
  window.addEventListener("focus", _handleWakeup);
}
