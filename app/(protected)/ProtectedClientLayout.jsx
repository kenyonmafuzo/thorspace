"use client";

import UserHeader from "../components/UserHeader";
import NotificationsClientRoot from "../components/notifications/NotificationsClientRoot";
import NotificationProvider from "../components/notifications/NotificationProvider";
import OnlineNow from "../components/OnlineNow";
import { useUserStats } from "../components/stats/UserStatsProvider";

export default function ProtectedClientLayout({ children }) {
  const { userStats } = useUserStats();
  const isReady = !!(userStats && (userStats.user_id || userStats.id) && userStats.username);
  
  return (
    <NotificationProvider>
      <NotificationsClientRoot>
        {/* Mantém presença global invisível para amigos */}
        {isReady && (
          <OnlineNow
            currentUserId={userStats.user_id}
            currentUsername={userStats.username}
            currentAvatar={userStats.avatar_preset}
          />
        )}
        <UserHeader />
        {children}
      </NotificationsClientRoot>
    </NotificationProvider>
  );
}
