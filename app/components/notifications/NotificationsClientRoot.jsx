"use client";

import NotificationProvider from "@/app/components/notifications/NotificationProvider";
import InviteRealtimeBridge from "./InviteRealtimeBridge";
// import FloatingToasts from "@/app/components/notifications/FloatingToasts";

export default function NotificationsClientRoot({ children }) {
  return (
    <NotificationProvider>
      {children}
      <InviteRealtimeBridge />
      {/* <FloatingToasts /> */}
    </NotificationProvider>
  );
}
