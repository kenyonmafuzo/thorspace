import { useEffect, useRef } from "react";
import { useNotifications } from "@/app/components/notifications/NotificationProvider";
import { supabase } from "@/lib/supabase";

type ToastPayload = { title: string; message: string };

export function useInviteRealtime(userId: string | null) {
  const notifications = useNotifications() as unknown as { pushToast: (p: ToastPayload) => void };
  const pushToast = notifications.pushToast;

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
          const fromUsername = invite.from_username || "";
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