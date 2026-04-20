import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUnreadInvites(userId: string | null) {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!userId) return setHasUnread(false);
    let mounted = true;

    async function fetchUnread() {
      const { count, error } = await supabase
        .from("friend_requests")
        .select("id", { count: "exact", head: true })
        .eq("to_user_id", userId)
        .eq("status", "pending");
      if (mounted) setHasUnread(!error && (count || 0) > 0);
    }

    fetchUnread();

    // Realtime: fire immediately when a friend request row is inserted/updated/deleted
    const channel = supabase
      .channel(`friend_requests:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_requests',
        filter: `to_user_id=eq.${userId}`,
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return hasUnread;
}
