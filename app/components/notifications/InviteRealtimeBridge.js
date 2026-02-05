"use client";

import { useEffect } from "react";
import { useNotifications } from "./NotificationProvider";
import { supabase } from "../../../lib/supabase";


// Helper: get username from userId (with cache)
const usernameCache = new Map();
async function getUsername(userId) {
  if (usernameCache.has(userId)) return usernameCache.get(userId);
  const { data } = await supabase.from("profiles").select("username").eq("id", userId).single();
  const username = data?.username || "unknown";
  usernameCache.set(userId, username);
  return username;
}

export default function InviteRealtimeBridge({ userId }) {
  const { pushToast } = useNotifications();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("invites_notify").on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "friend_requests",
        filter: `to_user_id=eq.${userId}`,
      },
      async (payload) => {
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
    return () => { channel.unsubscribe(); };
  }, [userId, pushToast]);
  return null;
}
