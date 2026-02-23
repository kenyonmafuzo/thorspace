"use client";

import UserHeader from "../components/UserHeader";
import MobileHeader from "../components/MobileHeader";
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
        {/* Desktop header */}
        <UserHeader />
        {/* Mobile header — only visible on ≤768px via CSS */}
        <MobileHeader />
        {/* Add top padding on mobile so content doesn't hide under fixed header */}
        <style>{`
          @media (max-width: 768px) {
            body > div, #__next, [data-nextjs-scroll-focus-boundary] {
              padding-top: 0;
            }
            .mobile-page-content {
              padding-top: 64px !important;
            }
          }
        `}</style>
        {children}
      </NotificationsClientRoot>
    </NotificationProvider>
  );
}
