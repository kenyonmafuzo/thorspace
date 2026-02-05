import { useEffect, useRef } from "react";
import { useNotifications } from "@/app/components/notifications/NotificationProvider";
import { supabase } from "@/lib/supabase";

// Helper: get username from userId (with cache)
const usernameCache = new Map<string, string>();
async function getUsername(userId: string): Promise<string> {
  if (usernameCache.has(userId)) return usernameCache.get(userId)!;
  const { data } = await supabase.from("profiles").select("username").eq("id", userId).single();
  const username = data?.username || "unknown";
  usernameCache.set(userId, username);
  return username;
}

export function useInviteRealtime(userId: string | null) {
  const { pushToast } = useNotifications();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!userId) return;
    // Subscribe to invites for this user
    const channel = supabase.channel("invites_notify").on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "invites",
        filter: `to_user_id=eq.${userId}`,
      },
      async (payload: any) => {
        const invite = payload.new;
        let title = "New invite";
        let message = "You received a new invite.";
        if (invite.type === "friend_request") {
          const fromUsername = invite.from_username || (invite.from_user_id ? await getUsername(invite.from_user_id) : "");
          title = "Friend request";
          message = fromUsername ? `from @${fromUsername}` : "New friend request";
        } else if (invite.type) {
          title = invite.type.charAt(0).toUpperCase() + invite.type.slice(1);
          message = invite.message || "You received a new invite.";
        }
        pushToast({ title, message });
      }
    );
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) channelRef.current.unsubscribe();
    };
  }, [userId, pushToast]);
}
