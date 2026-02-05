import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUnreadInvites(userId: string | null) {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!userId) return setHasUnread(false);
    let mounted = true;
    async function fetchUnread() {
      // Prefer read_at/is_read, fallback status='pending'
      const { count, error } = await supabase
        .from("friend_requests")
        .select("id", { count: "exact", head: true })
        .eq("to_user_id", userId)
        .eq("status", "pending");
      if (mounted) setHasUnread(!error && (count || 0) > 0);
    }
    fetchUnread();
    // Optionally, poll or subscribe for updates
    return () => { mounted = false; };
  }, [userId]);

  return hasUnread;
}
